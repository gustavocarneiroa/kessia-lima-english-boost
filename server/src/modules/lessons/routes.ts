import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";

const lessonBody = z.object({
  studentId: z.string().min(1),
  scheduledAt: z.string().min(1),
  subject: z.string().trim().min(1).max(200),
  classLink: z.string().trim().max(2000).optional().nullable(),
  activityLink: z.string().trim().max(2000).optional().nullable(),
  attended: z.boolean().optional().nullable(),
});

const lessonUpdateBody = lessonBody.partial().extend({
  studentId: z.string().min(1).optional(),
});

function serialize(lesson: typeof schema.lessons.$inferSelect) {
  return {
    id: lesson.id,
    studentId: lesson.studentId,
    scheduledAt: lesson.scheduledAt,
    subject: lesson.subject,
    classLink: lesson.classLink,
    activityLink: lesson.activityLink,
    attended: lesson.attended,
    createdAt: lesson.createdAt,
  };
}

export async function lessonRoutes(app: FastifyInstance) {
  app.get("/api/lessons", { preHandler: requireAuth }, async (req) => {
    const { userId, role } = req.session!;

    if (role === "teacher") {
      const rows = db
        .select({
          lesson: schema.lessons,
          studentEmail: schema.users.email,
        })
        .from(schema.lessons)
        .leftJoin(schema.users, eq(schema.users.id, schema.lessons.studentId))
        .all();

      return rows
        .map((r) => ({ ...serialize(r.lesson), studentEmail: r.studentEmail }))
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    }

    const rows = db.select().from(schema.lessons).where(eq(schema.lessons.studentId, userId)).all();
    return rows.map(serialize).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  });

  app.post("/api/lessons", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = lessonBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados da aula inválidos." });
    }

    const student = db.select().from(schema.users).where(eq(schema.users.id, parsed.data.studentId)).get();
    if (!student || student.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    }

    const lesson = {
      id: crypto.randomUUID(),
      studentId: parsed.data.studentId,
      scheduledAt: parsed.data.scheduledAt,
      subject: parsed.data.subject,
      classLink: parsed.data.classLink || null,
      activityLink: parsed.data.activityLink || null,
      attended: parsed.data.attended ?? null,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.lessons).values(lesson).run();

    return reply.code(201).send(serialize(lesson));
  });

  app.put("/api/lessons/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Aula não encontrada." });
    }

    const parsed = lessonUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados da aula inválidos." });
    }

    if (parsed.data.studentId) {
      const student = db.select().from(schema.users).where(eq(schema.users.id, parsed.data.studentId)).get();
      if (!student || student.role !== "student") {
        return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
      }
    }

    const values = {
      studentId: parsed.data.studentId ?? existing.studentId,
      scheduledAt: parsed.data.scheduledAt ?? existing.scheduledAt,
      subject: parsed.data.subject ?? existing.subject,
      classLink: parsed.data.classLink !== undefined ? parsed.data.classLink || null : existing.classLink,
      activityLink:
        parsed.data.activityLink !== undefined ? parsed.data.activityLink || null : existing.activityLink,
      attended: parsed.data.attended !== undefined ? parsed.data.attended : existing.attended,
    };

    db.update(schema.lessons).set(values).where(eq(schema.lessons.id, id)).run();

    return serialize({ ...existing, ...values });
  });

  app.delete("/api/lessons/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Aula não encontrada." });
    }

    db.delete(schema.lessons).where(eq(schema.lessons.id, id)).run();
    return reply.code(204).send();
  });
}
