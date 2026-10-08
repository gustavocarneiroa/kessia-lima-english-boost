import type { FastifyInstance } from "fastify";
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const dayOffBody = z.object({
  start: dateKey,
  end: dateKey.optional().nullable(),
  label: z.string().trim().min(1).max(120),
});

export async function daysOffRoutes(app: FastifyInstance) {
  // Professora e alunos veem a mesma lista (o calendário do aluno usa isso).
  app.get("/api/days-off", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z.object({ from: dateKey.optional(), to: dateKey.optional() }).safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_query", message: "Datas inválidas." });

    // Períodos que encostam em [from, to]
    const conditions: SQL[] = [];
    if (parsed.data.from) conditions.push(gte(schema.daysOff.end, parsed.data.from));
    if (parsed.data.to) conditions.push(lte(schema.daysOff.start, parsed.data.to));

    return db
      .select({
        id: schema.daysOff.id,
        start: schema.daysOff.start,
        end: schema.daysOff.end,
        label: schema.daysOff.label,
        kind: schema.daysOff.kind,
      })
      .from(schema.daysOff)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(schema.daysOff.start))
      .all();
  });

  app.post("/api/days-off", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = dayOffBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Escolha a data e escreva o motivo." });
    }
    const end = parsed.data.end && parsed.data.end >= parsed.data.start ? parsed.data.end : parsed.data.start;
    const row = {
      id: crypto.randomUUID(),
      start: parsed.data.start,
      end,
      label: parsed.data.label,
      kind: "custom" as const,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.daysOff).values(row).run();
    return reply.code(201).send({ id: row.id, start: row.start, end: row.end, label: row.label, kind: row.kind });
  });

  // Também serve pra feriado: apagar = "nesse dia vou dar aula".
  app.delete("/api/days-off/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    db.delete(schema.daysOff).where(eq(schema.daysOff.id, id)).run();
    return reply.code(204).send();
  });
}
