import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { learningProfileBody, parseStoredAnswers } from "../../lib/learningProfile.ts";

function read(userId: string) {
  const row = db
    .select()
    .from(schema.studentLearningProfiles)
    .where(eq(schema.studentLearningProfiles.userId, userId))
    .get();
  return { answers: parseStoredAnswers(row?.answers), updatedAt: row?.updatedAt ?? null };
}

export async function learningProfileRoutes(app: FastifyInstance) {
  // O aluno lê e preenche o próprio questionário.
  app.get("/api/me/learning-profile", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    if (session.role !== "student") return reply.code(404).send({ error: "not_found", message: "Só para alunos." });
    return read(session.userId);
  });

  app.put("/api/me/learning-profile", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    if (session.role !== "student") return reply.code(404).send({ error: "not_found", message: "Só para alunos." });
    const parsed = learningProfileBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Algumas respostas não vieram certas. Confira e tente de novo." });
    }
    const now = new Date().toISOString();
    const answers = JSON.stringify(parsed.data);
    db.insert(schema.studentLearningProfiles)
      .values({ userId: session.userId, answers, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: schema.studentLearningProfiles.userId, set: { answers, updatedAt: now } })
      .run();
    return read(session.userId);
  });

  // A professora vê as respostas na página do aluno.
  app.get("/api/students/:id/learning-profile", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const student = db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.role, "student")))
      .get();
    if (!student) return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    return read(id);
  });
}
