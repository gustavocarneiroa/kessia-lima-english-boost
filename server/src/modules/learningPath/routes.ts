import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";

const topicBody = z.object({
  title: z.string().trim().min(1).max(200),
  level: z.string().trim().max(50).optional().nullable(),
  area: z.enum(["grammar", "vocabulary", "communication"]).optional().nullable(),
  exerciseUrl: z.string().trim().max(1000).optional().nullable(),
  videoUrl: z.string().trim().max(1000).optional().nullable(),
});

const reorderBody = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

const completeBody = z.object({
  completed: z.boolean(),
  studentId: z.string().uuid().optional(),
});

function topicOr404(id: string) {
  return db.select().from(schema.learningTopics).where(eq(schema.learningTopics.id, id)).get() ?? null;
}

function nextOrder() {
  const rows = db.select().from(schema.learningTopics).all();
  return rows.reduce((max, t) => Math.max(max, t.sortOrder), -1) + 1;
}

function completedTopicIds(studentId: string) {
  return new Set(
    db
      .select({ topicId: schema.learningTopicCompletions.topicId })
      .from(schema.learningTopicCompletions)
      .where(eq(schema.learningTopicCompletions.studentId, studentId))
      .all()
      .map((r) => r.topicId),
  );
}

export async function learningPathRoutes(app: FastifyInstance) {
  app.get("/api/learning-topics", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    const topics = db.select().from(schema.learningTopics).orderBy(asc(schema.learningTopics.sortOrder)).all();

    if (session.role === "student") {
      const completed = completedTopicIds(session.userId);
      return { items: topics.map((t) => ({ ...t, completed: completed.has(t.id) })) };
    }

    const { studentId } = req.query as { studentId?: string };
    if (studentId) {
      const student = db.select().from(schema.users).where(eq(schema.users.id, studentId)).get();
      if (!student || student.role !== "student") {
        return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
      }
      const completed = completedTopicIds(studentId);
      return { items: topics.map((t) => ({ ...t, completed: completed.has(t.id) })) };
    }

    return { items: topics };
  });

  app.post("/api/learning-topics", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = topicBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Informe pelo menos o título do tópico." });
    }
    const row = {
      id: randomUUID(),
      title: parsed.data.title,
      level: parsed.data.level || null,
      area: parsed.data.area || null,
      exerciseUrl: parsed.data.exerciseUrl || null,
      videoUrl: parsed.data.videoUrl || null,
      sortOrder: nextOrder(),
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.learningTopics).values(row).run();
    return reply.code(201).send(row);
  });

  app.put("/api/learning-topics/reorder", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = reorderBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Lista de ordenação inválida." });
    }
    parsed.data.orderedIds.forEach((id, i) => {
      db.update(schema.learningTopics).set({ sortOrder: i }).where(eq(schema.learningTopics.id, id)).run();
    });
    return { ok: true };
  });

  app.put("/api/learning-topics/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!topicOr404(id)) return reply.code(404).send({ error: "not_found", message: "Tópico não encontrado." });
    const parsed = topicBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Informe pelo menos o título do tópico." });
    }
    db.update(schema.learningTopics)
      .set({
        title: parsed.data.title,
        level: parsed.data.level || null,
        area: parsed.data.area || null,
        exerciseUrl: parsed.data.exerciseUrl || null,
        videoUrl: parsed.data.videoUrl || null,
      })
      .where(eq(schema.learningTopics.id, id))
      .run();
    return topicOr404(id);
  });

  app.delete("/api/learning-topics/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!topicOr404(id)) return reply.code(404).send({ error: "not_found", message: "Tópico não encontrado." });
    db.delete(schema.learningTopicCompletions).where(eq(schema.learningTopicCompletions.topicId, id)).run();
    db.delete(schema.learningTopics).where(eq(schema.learningTopics.id, id)).run();
    return reply.code(204).send();
  });

  app.put("/api/learning-topics/:id/complete", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!topicOr404(id)) return reply.code(404).send({ error: "not_found", message: "Tópico não encontrado." });
    const session = req.session!;
    const parsed = completeBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados inválidos." });
    }

    let studentId: string;
    if (session.role === "teacher") {
      if (!parsed.data.studentId) {
        return reply.code(400).send({ error: "invalid_body", message: "Informe o aluno." });
      }
      const student = db.select().from(schema.users).where(eq(schema.users.id, parsed.data.studentId)).get();
      if (!student || student.role !== "student") {
        return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
      }
      studentId = parsed.data.studentId;
    } else {
      studentId = session.userId;
    }

    const existing = db
      .select()
      .from(schema.learningTopicCompletions)
      .where(and(eq(schema.learningTopicCompletions.topicId, id), eq(schema.learningTopicCompletions.studentId, studentId)))
      .get();

    if (parsed.data.completed && !existing) {
      db.insert(schema.learningTopicCompletions)
        .values({ topicId: id, studentId, completedAt: new Date().toISOString() })
        .run();
    } else if (!parsed.data.completed && existing) {
      db.delete(schema.learningTopicCompletions)
        .where(and(eq(schema.learningTopicCompletions.topicId, id), eq(schema.learningTopicCompletions.studentId, studentId)))
        .run();
    }

    return { completed: parsed.data.completed };
  });
}
