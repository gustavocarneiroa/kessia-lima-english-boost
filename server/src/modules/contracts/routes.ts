import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { readFileSync } from "node:fs";
import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { todayDateKey } from "../../lib/wordleWords.ts";
import {
  WEBHOOK_SECRET_HEADER,
  deleteContractDocument,
  removeSignedPdf,
  signedPdfFilePath,
  syncContract,
  webhookSecret,
  zapsignEnabled,
} from "../../lib/zapsign.ts";

type ContractRow = typeof schema.studentContracts.$inferSelect;

const signedLinkBody = z.object({
  url: z.string().trim().max(1000).regex(/^https:\/\/\S+$/),
});

// "Assinado" = link colado à mão (modo antigo) ou os dois assinaram no ZapSign.
export const isSigned = (row: Pick<ContractRow, "signedUrl" | "zapsignStatus">) =>
  !!row.signedUrl || row.zapsignStatus === "signed";

const notSignedSql = and(
  isNull(schema.studentContracts.signedUrl),
  or(isNull(schema.studentContracts.zapsignStatus), ne(schema.studentContracts.zapsignStatus, "signed")),
);

// O link de assinatura da professora nunca vai pro aluno.
function serialize(row: ContractRow, role: "teacher" | "student") {
  return {
    id: row.id,
    studentId: row.studentId,
    quoteId: row.quoteId,
    data: JSON.parse(row.data),
    signed: isSigned(row),
    signedUrl: row.signedUrl,
    signedAt: row.signedAt,
    zapsignStatus: row.zapsignStatus,
    teacherSignedAt: row.teacherSignedAt,
    studentSignedAt: row.studentSignedAt,
    hasSignedPdf: !!row.signedPdfPath,
    teacherSignUrl: role === "teacher" ? row.teacherSignUrl : null,
    studentSignUrl: row.zapsignStatus === "awaiting_student" ? row.studentSignUrl : null,
    blockAfter: row.blockAfter,
    createdAt: row.createdAt,
  };
}

// Contrato que bloqueia o portal do aluno: criado pelo ZapSign, ainda não assinado
// pelos dois e já passou do fim do contrato anterior (aluno novo: bloqueia já).
function isBlocking(row: ContractRow, today: string) {
  return !!row.zapsignStatus && row.zapsignStatus !== "signed" && (!row.blockAfter || today > row.blockAfter);
}

function loadForSession(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { userId, role } = req.session!;
  const row = db.select().from(schema.studentContracts).where(eq(schema.studentContracts.id, id)).get();
  if (!row || (role !== "teacher" && row.studentId !== userId)) {
    reply.code(404).send({ error: "not_found", message: "Contrato não encontrado." });
    return null;
  }
  return row;
}

async function syncQuietly(req: FastifyRequest, row: ContractRow) {
  try {
    return (await syncContract(row.id)) ?? row;
  } catch (err) {
    req.log.warn({ err }, "[zapsign] falha ao consultar contrato");
    return row;
  }
}

export async function contractRoutes(app: FastifyInstance) {
  app.get("/api/students/:id/contracts", { preHandler: requireTeacher }, async (req) => {
    const { id } = req.params as { id: string };
    return db
      .select()
      .from(schema.studentContracts)
      .where(eq(schema.studentContracts.studentId, id))
      .orderBy(desc(schema.studentContracts.createdAt))
      .all()
      .map((r) => serialize(r, "teacher"));
  });

  app.get("/api/me/contracts", { preHandler: requireAuth }, async (req) => {
    return db
      .select()
      .from(schema.studentContracts)
      .where(eq(schema.studentContracts.studentId, req.session!.userId))
      .orderBy(desc(schema.studentContracts.createdAt))
      .all()
      .map((r) => serialize(r, "student"));
  });

  // O portal do aluno pergunta isso ao abrir: se tiver contrato bloqueando, mostra só
  // a tela de assinatura. Antes confere no ZapSign (o aluno pode ter assinado pelo e-mail).
  app.get("/api/me/contract-gate", { preHandler: requireAuth }, async (req) => {
    if (req.session!.role !== "student") return { blocked: false, contract: null };
    const today = todayDateKey();
    const pending = db
      .select()
      .from(schema.studentContracts)
      .where(and(eq(schema.studentContracts.studentId, req.session!.userId), notSignedSql))
      .orderBy(desc(schema.studentContracts.createdAt))
      .all();

    for (const row of pending) {
      if (!isBlocking(row, today)) continue;
      const fresh = await syncQuietly(req, row);
      if (isBlocking(fresh, today)) return { blocked: true, contract: serialize(fresh, "student") };
    }
    return { blocked: false, contract: null };
  });

  // Tela inicial da professora: contratos ainda não assinados (aluno arquivado fica de fora).
  app.get("/api/contracts/pending", { preHandler: requireTeacher }, async () => {
    return db
      .select({ contract: schema.studentContracts, email: schema.users.email, fullName: schema.studentProfiles.fullName })
      .from(schema.studentContracts)
      .innerJoin(schema.users, eq(schema.users.id, schema.studentContracts.studentId))
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.studentContracts.studentId))
      .where(and(notSignedSql, isNull(schema.users.archivedAt)))
      .orderBy(desc(schema.studentContracts.createdAt))
      .all()
      .map((r) => ({ ...serialize(r.contract, "teacher"), studentEmail: r.email, studentName: r.fullName }));
  });

  // A professora abre qualquer contrato; o aluno só os dele.
  app.get("/api/contracts/:id", { preHandler: requireAuth }, async (req, reply) => {
    const row = loadForSession(req, reply);
    if (!row) return;
    return serialize(row, req.session!.role);
  });

  // Consulta o ZapSign agora (a tela de assinatura chama isso de tempos em tempos).
  app.post("/api/contracts/:id/sync", { preHandler: requireAuth }, async (req, reply) => {
    const row = loadForSession(req, reply);
    if (!row) return;
    return serialize(await syncQuietly(req, row), req.session!.role);
  });

  // Cópia do PDF assinado pelos dois, guardada no servidor.
  app.get("/api/contracts/:id/signed-pdf", { preHandler: requireAuth }, async (req, reply) => {
    const row = loadForSession(req, reply);
    if (!row) return;
    if (!row.signedPdfPath) return reply.code(404).send({ error: "not_found", message: "Contrato assinado ainda não disponível." });
    let buf: Buffer;
    try {
      buf = readFileSync(signedPdfFilePath(row.signedPdfPath));
    } catch {
      return reply.code(404).send({ error: "not_found", message: "Contrato assinado ainda não disponível." });
    }
    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="contrato-assinado.pdf"`)
      .header("Cache-Control", "private, no-store")
      .send(buf);
  });

  // Aviso do ZapSign (assinatura, recusa...). Não confia no conteúdo: só usa pra saber
  // qual contrato mudou e busca o estado direto no ZapSign. Sempre responde 200 —
  // senão o ZapSign fica reenviando.
  app.post("/api/zapsign/webhook", async (req, reply) => {
    if (req.headers[WEBHOOK_SECRET_HEADER] !== webhookSecret()) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const body = (req.body ?? {}) as { external_id?: string; token?: string };
    const row = db
      .select()
      .from(schema.studentContracts)
      .where(
        or(
          eq(schema.studentContracts.id, String(body.external_id ?? "")),
          eq(schema.studentContracts.zapsignDocToken, String(body.token ?? "")),
        ),
      )
      .get();
    if (row) await syncQuietly(req, row);
    return { ok: true };
  });

  // Modo manual (sem ZapSign ligado, ou contratos antigos): a professora cola o link.
  app.put("/api/contracts/:id/signed-link", { preHandler: requireTeacher }, async (req, reply) => {
    const row = loadForSession(req, reply);
    if (!row) return;
    const parsed = signedLinkBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Cole o link completo, começando com https://" });
    }
    const signedAt = row.signedAt ?? new Date().toISOString();
    db.update(schema.studentContracts)
      .set({ signedUrl: parsed.data.url, signedAt })
      .where(eq(schema.studentContracts.id, row.id))
      .run();
    return serialize({ ...row, signedUrl: parsed.data.url, signedAt }, "teacher");
  });

  app.delete("/api/contracts/:id/signed-link", { preHandler: requireTeacher }, async (req, reply) => {
    const row = loadForSession(req, reply);
    if (!row) return;
    const signedAt = row.zapsignStatus === "signed" ? row.signedAt : null;
    db.update(schema.studentContracts).set({ signedUrl: null, signedAt }).where(eq(schema.studentContracts.id, row.id)).run();
    return serialize({ ...row, signedUrl: null, signedAt }, "teacher");
  });

  // Só o documento sai — aluno, cobranças e horários continuam como estão. Se ainda
  // não foi assinado, também cancela no ZapSign (o aluno deixa de poder assinar).
  app.delete("/api/contracts/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const row = loadForSession(req, reply);
    if (!row) return;
    if (row.zapsignDocToken && row.zapsignStatus !== "signed" && zapsignEnabled()) {
      try {
        await deleteContractDocument(row.zapsignDocToken);
      } catch (err) {
        req.log.warn({ err }, "[zapsign] não consegui cancelar o documento");
      }
    }
    db.delete(schema.studentContracts).where(eq(schema.studentContracts.id, row.id)).run();
    removeSignedPdf(row.signedPdfPath);
    return reply.code(204).send();
  });
}

// usado ao excluir um aluno de vez
export function signedPdfPathsOf(studentId: string) {
  return db
    .select({ path: schema.studentContracts.signedPdfPath })
    .from(schema.studentContracts)
    .where(and(eq(schema.studentContracts.studentId, studentId), sql`${schema.studentContracts.signedPdfPath} is not null`))
    .all()
    .map((r) => r.path);
}
