import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { parseIframeEmbed } from "../../lib/embed.ts";

const createBody = z.object({
  title: z.string().trim().min(1).max(200),
  embedCode: z.string().trim().min(1).max(20_000),
});

const studentsBody = z.object({
  studentIds: z.array(z.string().uuid()),
});

function activityOr404(id: string) {
  return db.select().from(schema.activities).where(eq(schema.activities.id, id)).get() ?? null;
}

function assignedStudentIds(activityId: string) {
  return db
    .select({ studentId: schema.activityStudents.studentId })
    .from(schema.activityStudents)
    .where(eq(schema.activityStudents.activityId, activityId))
    .all()
    .map((r) => r.studentId);
}

function studentAssigned(activityId: string, studentId: string) {
  return assignedStudentIds(activityId).includes(studentId);
}

export async function activitiesRoutes(app: FastifyInstance) {
  app.get("/api/activities", { preHandler: requireAuth }, async (req) => {
    const session = req.session!;
    if (session.role === "teacher") {
      return db.select().from(schema.activities).all();
    }
    const assigned = db
      .select({ activityId: schema.activityStudents.activityId })
      .from(schema.activityStudents)
      .where(eq(schema.activityStudents.studentId, session.userId))
      .all();
    const ids = new Set(assigned.map((a) => a.activityId));
    return db
      .select()
      .from(schema.activities)
      .all()
      .filter((a) => ids.has(a.id));
  });

  app.post("/api/activities", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Informe um título e o código de incorporação." });
    }
    const embed = parseIframeEmbed(parsed.data.embedCode);
    if (!embed) {
      return reply.code(400).send({
        error: "invalid_embed",
        message: "Não encontrei um link válido nesse código. Cole o <iframe> completo que o site te deu.",
      });
    }
    const row = {
      id: randomUUID(),
      title: parsed.data.title,
      kind: "embed" as const,
      embedSrc: embed.src,
      embedHeight: embed.height,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.activities).values(row).run();
    return reply.code(201).send(row);
  });

  app.get("/api/activities/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const activity = activityOr404(id);
    if (!activity) return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });
    const session = req.session!;
    if (session.role !== "teacher" && !studentAssigned(id, session.userId)) {
      return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });
    }
    const studentIds = session.role === "teacher" ? assignedStudentIds(id) : undefined;
    return { ...activity, studentIds };
  });

  app.delete("/api/activities/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!activityOr404(id)) return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });
    db.delete(schema.activityStudents).where(eq(schema.activityStudents.activityId, id)).run();
    db.delete(schema.activities).where(eq(schema.activities.id, id)).run();
    return reply.code(204).send();
  });

  app.put("/api/activities/:id/students", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!activityOr404(id)) return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });
    const parsed = studentsBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Lista de alunos inválida." });
    }
    db.delete(schema.activityStudents).where(eq(schema.activityStudents.activityId, id)).run();
    for (const studentId of parsed.data.studentIds) {
      const u = db.select().from(schema.users).where(eq(schema.users.id, studentId)).get();
      if (!u || u.role !== "student") continue;
      db.insert(schema.activityStudents).values({ activityId: id, studentId }).run();
    }
    return { ok: true };
  });
}
