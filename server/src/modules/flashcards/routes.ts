import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth } from "../../auth/guards.ts";

const flashcardBody = z.object({
  word: z.string().trim().min(1).max(200),
  definition: z.string().trim().min(1).max(1000),
  example: z.string().trim().max(1000).optional().nullable(),
});

function serializeFlashcard(c: typeof schema.studentFlashcards.$inferSelect) {
  return { id: c.id, word: c.word, definition: c.definition, example: c.example, createdAt: c.createdAt };
}

// Card que quem está logado pode mexer: o aluno só nos dele; a professora em qualquer um.
function findEditableCard(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const session = req.session!;
  const card = db.select().from(schema.studentFlashcards).where(eq(schema.studentFlashcards.id, id)).get();
  if (!card || (session.role !== "teacher" && card.studentId !== session.userId)) {
    reply.code(404).send({ error: "not_found", message: "Flashcard não encontrado." });
    return null;
  }
  return card;
}

export async function flashcardRoutes(app: FastifyInstance) {
  // Aluno: os próprios cards. Professora: os de um aluno (?studentId=).
  app.get("/api/flashcards", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    let studentId = session.userId;
    if (session.role === "teacher") {
      const query = req.query as { studentId?: string };
      if (!query.studentId) return reply.code(400).send({ error: "invalid_query", message: "Escolha um aluno." });
      studentId = query.studentId;
    }
    return db
      .select()
      .from(schema.studentFlashcards)
      .where(eq(schema.studentFlashcards.studentId, studentId))
      .orderBy(desc(schema.studentFlashcards.createdAt))
      .all()
      .map(serializeFlashcard);
  });

  app.post("/api/flashcards", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    if (session.role !== "student") {
      return reply.code(403).send({ error: "student_only", message: "Só os alunos criam flashcards." });
    }
    const parsed = flashcardBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Preencha a palavra e a definição." });
    }
    const card = {
      id: crypto.randomUUID(),
      studentId: session.userId,
      word: parsed.data.word,
      definition: parsed.data.definition,
      example: parsed.data.example || null,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.studentFlashcards).values(card).run();
    return reply.code(201).send(serializeFlashcard(card));
  });

  app.put("/api/flashcards/:id", { preHandler: requireAuth }, async (req, reply) => {
    const card = findEditableCard(req, reply);
    if (!card) return;
    const parsed = flashcardBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Preencha a palavra e a definição." });
    }
    const updated = {
      ...card,
      word: parsed.data.word,
      definition: parsed.data.definition,
      example: parsed.data.example || null,
    };
    db.update(schema.studentFlashcards)
      .set(updated)
      .where(eq(schema.studentFlashcards.id, card.id))
      .run();
    return serializeFlashcard(updated);
  });

  app.delete("/api/flashcards/:id", { preHandler: requireAuth }, async (req, reply) => {
    const card = findEditableCard(req, reply);
    if (!card) return;
    db.delete(schema.studentFlashcards).where(eq(schema.studentFlashcards.id, card.id)).run();
    return reply.code(204).send();
  });
}
