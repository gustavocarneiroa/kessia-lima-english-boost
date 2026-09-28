import type { FastifyInstance } from "fastify";
import { readFileSync } from "node:fs";
import { and, asc, eq, gte, isNotNull, isNull, like, lt, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { parsePagination } from "../../lib/pagination.ts";
import { todayDateKey } from "../../lib/wordleWords.ts";
import { boletoFilePath, removeBoletoPdf, saveBoletoPdf } from "../../lib/boleto.ts";

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const monthKey = z.string().regex(/^\d{4}-\d{2}$/);

const paymentQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  studentId: z.string().optional(),
  month: monthKey.optional(), // mês do vencimento, "YYYY-MM"
  status: z.enum(["paid", "pending", "overdue", "open"]).optional(), // open = pendente + atrasada
});

const paymentBody = z.object({
  studentId: z.string().min(1),
  description: z.string().trim().min(1).max(200),
  amountCents: z.number().int().positive().max(100_000_000),
  dueDate: dateKey,
  paidAt: dateKey.optional().nullable(),
});

const paymentUpdateBody = paymentBody.partial();

const boletoBody = z.object({
  file: z.string().min(1).max(8_000_000), // data URL do PDF
});

type PaymentRow = typeof schema.payments.$inferSelect;

function statusOf(payment: PaymentRow, today: string) {
  if (payment.paidAt) return "paid" as const;
  return payment.dueDate < today ? ("overdue" as const) : ("pending" as const);
}

function serialize(payment: PaymentRow, today = todayDateKey()) {
  return {
    id: payment.id,
    studentId: payment.studentId,
    description: payment.description,
    amountCents: payment.amountCents,
    dueDate: payment.dueDate,
    paidAt: payment.paidAt,
    hasBoleto: !!payment.boletoPath,
    status: statusOf(payment, today),
    createdAt: payment.createdAt,
  };
}

// "R$ 280,00", "280", "1.280,50" → centavos. Null se não der pra entender.
function parseBrlToCents(value: string | null | undefined): number | null {
  if (!value) return null;
  let s = value.replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export async function paymentRoutes(app: FastifyInstance) {
  app.get("/api/payments", { preHandler: requireAuth }, async (req, reply) => {
    const { userId, role } = req.session!;
    const parsedQuery = paymentQuery.safeParse(req.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: "invalid_query", message: "Filtros inválidos." });
    }
    const q = parsedQuery.data;
    const { page, pageSize, offset } = parsePagination(req.query as Record<string, unknown>);
    const today = todayDateKey();

    const base: SQL[] = [];
    if (role === "teacher" && q.studentId) base.push(eq(schema.payments.studentId, q.studentId));
    if (role !== "teacher") base.push(eq(schema.payments.studentId, userId));
    if (q.month) base.push(like(schema.payments.dueDate, `${q.month}-%`));

    const conditions = [...base];
    if (q.status === "paid") conditions.push(isNotNull(schema.payments.paidAt));
    else if (q.status === "pending") conditions.push(isNull(schema.payments.paidAt), gte(schema.payments.dueDate, today));
    else if (q.status === "overdue") conditions.push(isNull(schema.payments.paidAt), lt(schema.payments.dueDate, today));
    else if (q.status === "open") conditions.push(isNull(schema.payments.paidAt));

    const where = conditions.length ? and(...conditions) : undefined;
    const totalRow = db.select({ count: sql<number>`count(*)` }).from(schema.payments).where(where).get();

    // Resumo (recebido / a receber / atrasado) respeita aluno e mês, mas não o filtro de status —
    // senão escolher "pagas" zeraria os outros números.
    const summaryRow = db
      .select({
        paid: sql<number>`coalesce(sum(case when ${schema.payments.paidAt} is not null then ${schema.payments.amountCents} end), 0)`,
        pending: sql<number>`coalesce(sum(case when ${schema.payments.paidAt} is null and ${schema.payments.dueDate} >= ${today} then ${schema.payments.amountCents} end), 0)`,
        overdue: sql<number>`coalesce(sum(case when ${schema.payments.paidAt} is null and ${schema.payments.dueDate} < ${today} then ${schema.payments.amountCents} end), 0)`,
      })
      .from(schema.payments)
      .where(base.length ? and(...base) : undefined)
      .get();

    // Em aberto primeiro (vencimento mais antigo no topo), depois as pagas.
    const rows = db
      .select({ payment: schema.payments, studentEmail: schema.users.email, studentName: schema.studentProfiles.fullName })
      .from(schema.payments)
      .leftJoin(schema.users, eq(schema.users.id, schema.payments.studentId))
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.payments.studentId))
      .where(where)
      .orderBy(
        sql`case when ${schema.payments.paidAt} is null then 0 else 1 end`,
        sql`case when ${schema.payments.paidAt} is null then ${schema.payments.dueDate} end asc`,
        sql`${schema.payments.dueDate} desc`,
        asc(schema.payments.createdAt),
      )
      .limit(pageSize)
      .offset(offset)
      .all();

    return {
      items: rows.map((r) => ({
        ...serialize(r.payment, today),
        studentEmail: r.studentEmail,
        studentName: r.studentName,
      })),
      summary: {
        paidCents: summaryRow?.paid ?? 0,
        pendingCents: summaryRow?.pending ?? 0,
        overdueCents: summaryRow?.overdue ?? 0,
      },
      total: totalRow?.count ?? 0,
      page,
      pageSize,
    };
  });

  app.post("/api/payments", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = paymentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados da cobrança inválidos." });
    }

    const student = db.select().from(schema.users).where(eq(schema.users.id, parsed.data.studentId)).get();
    if (!student || student.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    }

    const payment = {
      id: crypto.randomUUID(),
      studentId: parsed.data.studentId,
      description: parsed.data.description,
      amountCents: parsed.data.amountCents,
      dueDate: parsed.data.dueDate,
      paidAt: parsed.data.paidAt ?? null,
      boletoPath: null,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.payments).values(payment).run();

    return reply.code(201).send(serialize(payment));
  });

  // Cria a mensalidade do mês pra cada aluno que tem valor da parcela e dia de
  // vencimento no cadastro (e contrato valendo naquele mês). Quem já tem uma
  // cobrança vencendo nesse mês é pulado — dá pra clicar de novo sem duplicar.
  app.post("/api/payments/generate-month", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = z.object({ month: monthKey }).safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Escolha o mês." });
    }
    const { month } = parsed.data;
    const [year, monthNum] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

    const students = db
      .select({ id: schema.users.id, email: schema.users.email, profile: schema.studentProfiles })
      .from(schema.users)
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.users.id))
      .where(eq(schema.users.role, "student"))
      .all();

    const created: string[] = [];
    const skipped: { name: string; reason: string }[] = [];
    const now = new Date().toISOString();

    db.transaction((tx) => {
      for (const s of students) {
        const name = s.profile?.fullName || s.email;
        const p = s.profile;
        if (p?.contractEnd && p.contractEnd < monthStart) continue; // contrato já terminou — nem aparece na lista
        if (p?.contractStart && p.contractStart > monthEnd) continue; // ainda não começou

        const amountCents = parseBrlToCents(p?.installmentValue);
        const dueDay = Number.parseInt(p?.paymentDueDay ?? "", 10);
        if (!amountCents || !Number.isFinite(dueDay) || dueDay < 1) {
          skipped.push({ name, reason: "sem valor da parcela ou dia de vencimento no cadastro" });
          continue;
        }

        const existing = tx
          .select({ id: schema.payments.id })
          .from(schema.payments)
          .where(and(eq(schema.payments.studentId, s.id), like(schema.payments.dueDate, `${month}-%`)))
          .get();
        if (existing) {
          skipped.push({ name, reason: "já tem cobrança neste mês" });
          continue;
        }

        const day = String(Math.min(dueDay, lastDay)).padStart(2, "0");
        tx.insert(schema.payments)
          .values({
            id: crypto.randomUUID(),
            studentId: s.id,
            description: `Mensalidade ${MONTH_NAMES[monthNum - 1]}/${year}`,
            amountCents,
            dueDate: `${month}-${day}`,
            paidAt: null,
            createdAt: now,
          })
          .run();
        created.push(name);
      }
    });

    return { created, skipped };
  });

  app.put("/api/payments/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.payments).where(eq(schema.payments.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Cobrança não encontrada." });
    }

    const parsed = paymentUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados da cobrança inválidos." });
    }

    if (parsed.data.studentId) {
      const student = db.select().from(schema.users).where(eq(schema.users.id, parsed.data.studentId)).get();
      if (!student || student.role !== "student") {
        return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
      }
    }

    const values = {
      studentId: parsed.data.studentId ?? existing.studentId,
      description: parsed.data.description ?? existing.description,
      amountCents: parsed.data.amountCents ?? existing.amountCents,
      dueDate: parsed.data.dueDate ?? existing.dueDate,
      paidAt: parsed.data.paidAt !== undefined ? parsed.data.paidAt : existing.paidAt,
    };

    db.update(schema.payments).set(values).where(eq(schema.payments.id, id)).run();

    return serialize({ ...existing, ...values });
  });

  app.delete("/api/payments/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.payments).where(eq(schema.payments.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Cobrança não encontrada." });
    }

    db.delete(schema.payments).where(eq(schema.payments.id, id)).run();
    removeBoletoPdf(existing.boletoPath);
    return reply.code(204).send();
  });

  // Anexa (ou troca) o PDF do boleto gerado na Cora.
  app.put("/api/payments/:id/boleto", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.payments).where(eq(schema.payments.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Cobrança não encontrada." });
    }

    const parsed = boletoBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Arquivo inválido ou grande demais." });
    }

    const boletoPath = saveBoletoPdf(parsed.data.file);
    db.update(schema.payments).set({ boletoPath }).where(eq(schema.payments.id, id)).run();
    removeBoletoPdf(existing.boletoPath);

    return serialize({ ...existing, boletoPath });
  });

  app.delete("/api/payments/:id/boleto", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.payments).where(eq(schema.payments.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Cobrança não encontrada." });
    }

    db.update(schema.payments).set({ boletoPath: null }).where(eq(schema.payments.id, id)).run();
    removeBoletoPdf(existing.boletoPath);

    return serialize({ ...existing, boletoPath: null });
  });

  // A professora baixa qualquer boleto; o aluno só os das próprias cobranças.
  app.get("/api/payments/:id/boleto", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { userId, role } = req.session!;
    const payment = db.select().from(schema.payments).where(eq(schema.payments.id, id)).get();
    if (!payment || !payment.boletoPath || (role !== "teacher" && payment.studentId !== userId)) {
      return reply.code(404).send({ error: "not_found", message: "Boleto não encontrado." });
    }

    let buf: Buffer;
    try {
      buf = readFileSync(boletoFilePath(payment.boletoPath));
    } catch {
      return reply.code(404).send({ error: "not_found", message: "Boleto não encontrado." });
    }

    const fileName = `boleto-${payment.dueDate}.pdf`;
    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${fileName}"`)
      .header("Cache-Control", "private, no-store")
      .send(buf);
  });
}
