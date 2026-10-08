import type { FastifyInstance } from "fastify";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireTeacher } from "../../auth/guards.ts";
import { parsePagination } from "../../lib/pagination.ts";
import { createContractDocument, zapsignEnabled } from "../../lib/zapsign.ts";
import { env } from "../../env.ts";

// Quem assina pela professora no ZapSign (mesmo nome do contrato).
const TEACHER_SIGNER_NAME = "Kelma Késsia Lima Carneiro";
const TEACHER_SIGNER_PHONE = "(85) 99736-2806";

function formatDateBr(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Índice = dia da semana do JavaScript (0 = domingo), no formato do perfil do aluno.
const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const quoteBody = z.object({
  studentName: z.string().trim().min(1).max(200),
  email: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  totalCents: z.number().int().min(0).max(1_000_000_000),
  // Campos do formulário + resultado do cálculo — só a tela do orçamento entende isso.
  data: z.record(z.unknown()),
});

// Tudo calculado na tela (onde a professora revisa antes de confirmar); aqui só grava.
const convertBody = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  contractStart: dateKey,
  contractEnd: dateKey,
  classSchedule: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        hours: z.number().positive().max(12),
      }),
    )
    .min(1)
    .max(7),
  // Tudo que vai no texto do contrato (dados do aluno, plano, valores) — só a tela do contrato lê.
  contract: z.record(z.unknown()),
  // PDF do contrato montado na tela (base64, sem o prefixo data:) — vai pro ZapSign.
  pdfBase64: z.string().max(7_000_000).optional(),
  installmentValue: z.string().trim().max(50),
  paymentDueDay: z.string().regex(/^([1-9]|[12]\d|3[01])$/),
  payments: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(200),
        amountCents: z.number().int().positive().max(100_000_000),
        dueDate: dateKey,
      }),
    )
    .max(60),
});

type QuoteRow = typeof schema.quotes.$inferSelect;
type ContractRef = { studentId: string; convertedAt: string };

function parseContracts(raw: string): ContractRef[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Junta nome/e-mail dos alunos que viraram contrato. Aluno excluído depois some da lista.
function withContracts(rows: QuoteRow[]) {
  const refs = rows.map((r) => ({ row: r, contracts: parseContracts(r.contracts) }));
  const ids = [...new Set(refs.flatMap((r) => r.contracts.map((c) => c.studentId)))];
  const students = ids.length
    ? db
        .select({ id: schema.users.id, email: schema.users.email, fullName: schema.studentProfiles.fullName })
        .from(schema.users)
        .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.users.id))
        .where(inArray(schema.users.id, ids))
        .all()
    : [];
  const byId = new Map(students.map((s) => [s.id, s]));

  return refs.map(({ row, contracts }) => ({
    id: row.id,
    studentName: row.studentName,
    email: row.email,
    phone: row.phone,
    totalCents: row.totalCents,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    contracts: contracts
      .filter((c) => byId.has(c.studentId))
      .map((c) => ({ ...c, email: byId.get(c.studentId)!.email, fullName: byId.get(c.studentId)!.fullName })),
  }));
}

export async function quoteRoutes(app: FastifyInstance) {
  app.get("/api/quotes", { preHandler: requireTeacher }, async (req) => {
    const { page, pageSize, offset } = parsePagination(req.query as Record<string, unknown>);
    const total = await db.$count(schema.quotes);
    const rows = db.select().from(schema.quotes).orderBy(desc(schema.quotes.updatedAt)).limit(pageSize).offset(offset).all();
    return { items: withContracts(rows), total, page, pageSize };
  });

  app.get("/api/quotes/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).get();
    if (!row) return reply.code(404).send({ error: "not_found", message: "Orçamento não encontrado." });
    const [quote] = withContracts([row]);
    return { ...quote, data: JSON.parse(row.data) };
  });

  app.post("/api/quotes", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = quoteBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Preencha pelo menos o nome do aluno." });
    }
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      studentName: parsed.data.studentName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      totalCents: parsed.data.totalCents,
      data: JSON.stringify(parsed.data.data),
      contracts: "[]",
      createdAt: now,
      updatedAt: now,
    };
    db.insert(schema.quotes).values(row).run();
    return reply.code(201).send({ id: row.id });
  });

  app.put("/api/quotes/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "not_found", message: "Orçamento não encontrado." });

    const parsed = quoteBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Preencha pelo menos o nome do aluno." });
    }
    db.update(schema.quotes)
      .set({
        studentName: parsed.data.studentName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        totalCents: parsed.data.totalCents,
        data: JSON.stringify(parsed.data.data),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.quotes.id, id))
      .run();
    return { id };
  });

  // Só apaga o orçamento — alunos e cobranças criados a partir dele continuam.
  app.delete("/api/quotes/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    db.delete(schema.quotes).where(eq(schema.quotes.id, id)).run();
    return reply.code(204).send();
  });

  // "Virar contrato": cadastra o aluno (ou reaproveita o cadastro, se o e-mail já
  // existe — renovação), preenche contrato/vencimento no perfil e cria as parcelas
  // no Financeiro. Aluno arquivado volta a ficar ativo.
  app.post("/api/quotes/:id/convert", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const quote = db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).get();
    if (!quote) return reply.code(404).send({ error: "not_found", message: "Orçamento não encontrado." });

    const parsed = convertBody.safeParse(req.body);
    if (!parsed.success) {
      const emailInvalid = parsed.error.issues.some((i) => i.path[0] === "email");
      return reply.code(400).send({
        error: "invalid_body",
        message: emailInvalid
          ? "E-mail do aluno inválido."
          : "Confira as datas, o horário de cada dia de aula, o dia de vencimento e as parcelas.",
      });
    }
    const input = parsed.data;
    if (input.contractEnd < input.contractStart) {
      return reply.code(400).send({ error: "invalid_body", message: "A data final é antes da data inicial." });
    }

    const email = input.email.toLowerCase();
    const existing = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (existing && existing.role !== "student") {
      return reply.code(409).send({ error: "not_a_student", message: "Esse e-mail é da professora, não de um aluno." });
    }

    const now = new Date().toISOString();
    const studentId = existing?.id ?? crypto.randomUUID();
    const contracts = parseContracts(quote.contracts);
    const contractId = crypto.randomUUID();
    const firstClass = input.classSchedule[0];

    // Renovação: o portal só bloqueia depois que o contrato anterior acabar.
    const previousEnd = existing
      ? db
          .select({ end: schema.studentProfiles.contractEnd })
          .from(schema.studentProfiles)
          .where(eq(schema.studentProfiles.userId, studentId))
          .get()?.end ?? null
      : null;

    // Com o ZapSign ligado, o documento é criado lá antes de gravar qualquer coisa
    // aqui — se o ZapSign recusar, nada fica pela metade no portal.
    let zapsign: Awaited<ReturnType<typeof createContractDocument>> | null = null;
    if (zapsignEnabled()) {
      if (!input.pdfBase64) {
        return reply.code(400).send({ error: "invalid_body", message: "Não consegui montar o PDF do contrato. Tente de novo." });
      }
      const studentName = input.fullName || email;
      try {
        zapsign = await createContractDocument({
          contractId,
          name: `Contrato - ${studentName} (${formatDateBr(input.contractStart)} a ${formatDateBr(input.contractEnd)})`,
          pdfBase64: input.pdfBase64,
          teacher: { name: TEACHER_SIGNER_NAME, email: env.ADMIN_EMAIL, phone: TEACHER_SIGNER_PHONE },
          student: { name: studentName, email, phone: input.phone },
        });
      } catch (err) {
        req.log.error({ err }, "[zapsign] falha ao criar documento");
        return reply.code(502).send({
          error: "zapsign_error",
          message: "O ZapSign não aceitou o contrato agora. Nada foi criado — tente de novo em instantes.",
        });
      }
    }

    db.transaction((tx) => {
      if (!existing) {
        tx.insert(schema.users)
          .values({ id: studentId, email, passwordHash: null, role: "student", createdAt: now })
          .run();
      } else if (existing.archivedAt) {
        tx.update(schema.users).set({ archivedAt: null }).where(eq(schema.users.id, studentId)).run();
      }

      // Mantém o que já estava no perfil (nível, interesses...) e troca só os dados do contrato.
      const profile = tx.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.userId, studentId)).get();
      const values = {
        ...profile,
        userId: studentId,
        fullName: input.fullName || profile?.fullName || null,
        phone: input.phone || profile?.phone || null,
        // Campo antigo de "dia da aula fixa" do perfil: fica com o primeiro dia do contrato.
        classWeekday: WEEKDAY_KEYS[firstClass.weekday],
        classTime: firstClass.time,
        classSchedule: JSON.stringify(input.classSchedule),
        installmentValue: input.installmentValue,
        paymentDueDay: input.paymentDueDay,
        contractStart: input.contractStart,
        contractEnd: input.contractEnd,
        updatedAt: now,
      };
      tx.insert(schema.studentProfiles)
        .values(values)
        .onConflictDoUpdate({ target: schema.studentProfiles.userId, set: values })
        .run();

      for (const p of input.payments) {
        tx.insert(schema.payments)
          .values({
            id: crypto.randomUUID(),
            studentId,
            description: p.description,
            amountCents: p.amountCents,
            dueDate: p.dueDate,
            paidAt: null,
            boletoPath: null,
            createdAt: now,
          })
          .run();
      }

      tx.insert(schema.studentContracts)
        .values({
          id: contractId,
          studentId,
          quoteId: id,
          data: JSON.stringify(input.contract),
          createdAt: now,
          ...(zapsign && {
            zapsignStatus: "awaiting_teacher" as const,
            zapsignDocToken: zapsign.docToken,
            teacherSignUrl: zapsign.teacherSignUrl,
            studentSignUrl: zapsign.studentSignUrl,
            blockAfter: previousEnd,
          }),
        })
        .run();

      contracts.push({ studentId, convertedAt: now });
      tx.update(schema.quotes)
        .set({ contracts: JSON.stringify(contracts), updatedAt: now })
        .where(eq(schema.quotes.id, id))
        .run();
    });

    return { studentId, contractId, created: !existing, unarchived: !!existing?.archivedAt, zapsign: !!zapsign };
  });
}
