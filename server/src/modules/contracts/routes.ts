import type { FastifyInstance } from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";

type ContractRow = typeof schema.studentContracts.$inferSelect;

const signedLinkBody = z.object({
  url: z.string().trim().max(1000).regex(/^https:\/\/\S+$/),
});

function serialize(row: ContractRow) {
  return {
    id: row.id,
    studentId: row.studentId,
    quoteId: row.quoteId,
    data: JSON.parse(row.data),
    signedUrl: row.signedUrl,
    signedAt: row.signedAt,
    createdAt: row.createdAt,
  };
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
      .map(serialize);
  });

  app.get("/api/me/contracts", { preHandler: requireAuth }, async (req) => {
    return db
      .select()
      .from(schema.studentContracts)
      .where(eq(schema.studentContracts.studentId, req.session!.userId))
      .orderBy(desc(schema.studentContracts.createdAt))
      .all()
      .map(serialize);
  });

  // Tela inicial da professora: contratos ainda sem o link do ZapSign (aluno arquivado fica de fora).
  app.get("/api/contracts/pending", { preHandler: requireTeacher }, async () => {
    return db
      .select({ contract: schema.studentContracts, email: schema.users.email, fullName: schema.studentProfiles.fullName })
      .from(schema.studentContracts)
      .innerJoin(schema.users, eq(schema.users.id, schema.studentContracts.studentId))
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.studentContracts.studentId))
      .where(and(isNull(schema.studentContracts.signedUrl), isNull(schema.users.archivedAt)))
      .orderBy(desc(schema.studentContracts.createdAt))
      .all()
      .map((r) => ({ ...serialize(r.contract), studentEmail: r.email, studentName: r.fullName }));
  });

  // A professora abre qualquer contrato; o aluno só os dele.
  app.get("/api/contracts/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { userId, role } = req.session!;
    const row = db.select().from(schema.studentContracts).where(eq(schema.studentContracts.id, id)).get();
    if (!row || (role !== "teacher" && row.studentId !== userId)) {
      return reply.code(404).send({ error: "not_found", message: "Contrato não encontrado." });
    }
    return serialize(row);
  });

  // Link do contrato assinado no ZapSign: a partir daí professora e aluno veem o
  // assinado em vez do PDF montado, e o aviso de "aguardando assinatura" some.
  app.put("/api/contracts/:id/signed-link", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.select().from(schema.studentContracts).where(eq(schema.studentContracts.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found", message: "Contrato não encontrado." });

    const parsed = signedLinkBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Cole o link completo, começando com https://" });
    }
    const signedAt = row.signedAt ?? new Date().toISOString();
    db.update(schema.studentContracts)
      .set({ signedUrl: parsed.data.url, signedAt })
      .where(eq(schema.studentContracts.id, id))
      .run();
    return serialize({ ...row, signedUrl: parsed.data.url, signedAt });
  });

  app.delete("/api/contracts/:id/signed-link", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.select().from(schema.studentContracts).where(eq(schema.studentContracts.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found", message: "Contrato não encontrado." });
    db.update(schema.studentContracts).set({ signedUrl: null, signedAt: null }).where(eq(schema.studentContracts.id, id)).run();
    return serialize({ ...row, signedUrl: null, signedAt: null });
  });

  // Só o documento sai — aluno, cobranças e horários continuam como estão.
  app.delete("/api/contracts/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    db.delete(schema.studentContracts).where(eq(schema.studentContracts.id, id)).run();
    return reply.code(204).send();
  });
}
