import type { FastifyInstance } from "fastify";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireTeacher } from "../../auth/guards.ts";

// Diário interno da professora: anotações datadas sobre cada aluno.
// Tudo aqui é só da professora — nenhuma rota de aluno lê esta tabela.
export const NOTE_CATEGORIES = ["pedagogical", "behavior", "personal", "financial", "contact", "other"] as const;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const noteBody = z.object({
  date: dateKey,
  category: z.enum(NOTE_CATEGORIES),
  text: z.string().trim().min(1).max(5000),
  pinned: z.boolean().optional(),
});

function serializeNote(n: typeof schema.studentNotes.$inferSelect) {
  return {
    kind: "note" as const,
    id: n.id,
    date: n.date,
    category: n.category,
    text: n.text,
    pinned: n.pinned,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

function isStudent(id: string) {
  const u = db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.id, id), eq(schema.users.role, "student")))
    .get();
  return !!u;
}

export async function diaryRoutes(app: FastifyInstance) {
  // Linha do tempo do aluno: anotações do diário + o que ela escreveu em "só você vê"
  // no registro de cada aula (só leitura aqui; edita pelo registro da aula).
  app.get("/api/students/:id/diary", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!isStudent(id)) return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });

    const notes = db
      .select()
      .from(schema.studentNotes)
      .where(eq(schema.studentNotes.studentId, id))
      .all()
      .map(serializeNote);

    const fromLessons = db
      .select({
        lessonId: schema.lessonReports.lessonId,
        summary: schema.lessonReports.summary,
        comments: schema.lessonReports.comments,
        status: schema.lessonReports.status,
        scheduledAt: schema.lessons.scheduledAt,
        subject: schema.lessons.subject,
      })
      .from(schema.lessonReports)
      .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonReports.lessonId))
      .where(
        and(
          eq(schema.lessonReports.studentId, id),
          or(isNotNull(schema.lessonReports.summary), isNotNull(schema.lessonReports.comments)),
        ),
      )
      .orderBy(desc(schema.lessons.scheduledAt))
      .all()
      .filter((r) => (r.summary ?? "").trim() || (r.comments ?? "").trim())
      .map((r) => ({
        kind: "lesson" as const,
        id: `lesson:${r.lessonId}`,
        lessonId: r.lessonId,
        date: r.scheduledAt.slice(0, 10),
        scheduledAt: r.scheduledAt,
        subject: r.subject,
        status: r.status,
        summary: r.summary?.trim() || null,
        comments: r.comments?.trim() || null,
      }));

    const items = [...notes, ...fromLessons].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        ("createdAt" in b ? b.createdAt : b.scheduledAt).localeCompare("createdAt" in a ? a.createdAt : a.scheduledAt),
    );
    return { items };
  });

  app.post("/api/students/:id/diary", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!isStudent(id)) return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    const parsed = noteBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Escolha a data, o tipo e escreva a anotação." });
    }
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      studentId: id,
      date: parsed.data.date,
      category: parsed.data.category,
      text: parsed.data.text,
      pinned: parsed.data.pinned ?? false,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(schema.studentNotes).values(row).run();
    return reply.code(201).send(serializeNote(row));
  });

  app.put("/api/diary/:noteId", { preHandler: requireTeacher }, async (req, reply) => {
    const { noteId } = req.params as { noteId: string };
    const parsed = noteBody.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body", message: "Anotação inválida." });
    const existing = db.select().from(schema.studentNotes).where(eq(schema.studentNotes.id, noteId)).get();
    if (!existing) return reply.code(404).send({ error: "not_found", message: "Anotação não encontrada." });
    const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
    db.update(schema.studentNotes)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(schema.studentNotes.id, noteId))
      .run();
    const saved = db.select().from(schema.studentNotes).where(eq(schema.studentNotes.id, noteId)).get()!;
    return serializeNote(saved);
  });

  app.delete("/api/diary/:noteId", { preHandler: requireTeacher }, async (req, reply) => {
    const { noteId } = req.params as { noteId: string };
    db.delete(schema.studentNotes).where(eq(schema.studentNotes.id, noteId)).run();
    return reply.code(204).send();
  });
}
