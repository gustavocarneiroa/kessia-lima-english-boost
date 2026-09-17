import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { parseIframeEmbed } from "../../lib/embed.ts";
import { extractYoutubeVideoId } from "../../lib/youtube.ts";
import { ListeningAiError, generateListeningQuestions } from "../../lib/listeningQuestionsAi.ts";

const questionSchema = z
  .object({
    prompt: z.string().trim().min(1).max(500),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    correctIndex: z.number().int().min(0),
  })
  .refine((q) => q.correctIndex < q.options.length, { message: "correctIndex fora do intervalo" });

const embedCreateBody = z.object({
  kind: z.literal("embed").optional(),
  title: z.string().trim().min(1).max(200),
  embedCode: z.string().trim().min(1).max(20_000),
});

const listeningCreateBody = z.object({
  kind: z.literal("listening"),
  title: z.string().trim().min(1).max(200),
  youtubeUrl: z.string().trim().min(1).max(500),
  questions: z.array(questionSchema).min(1).max(20),
});

const embedUpdateBody = z.object({
  title: z.string().trim().min(1).max(200),
  embedCode: z.string().trim().min(1).max(20_000),
});

const listeningUpdateBody = z.object({
  title: z.string().trim().min(1).max(200),
  youtubeUrl: z.string().trim().min(1).max(500),
  questions: z.array(questionSchema).min(1).max(20),
});

const studentsBody = z.object({
  studentIds: z.array(z.string().uuid()),
});

const submitBody = z.object({
  answers: z.array(z.number().int().min(0)).max(20),
});

const generateQuestionsBody = z.object({
  transcript: z.string().trim().min(20).max(20_000),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  count: z.number().int().min(1).max(10).default(5),
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

type Question = z.infer<typeof questionSchema>;

function parseQuestions(raw: string | null): Question[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Question[];
  } catch {
    return [];
  }
}

// Nunca devolvemos correctIndex pro aluno antes de ele responder.
function questionsForStudent(questions: Question[]) {
  return questions.map((q) => ({ prompt: q.prompt, options: q.options }));
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

  app.post("/api/activities/generate-questions", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = generateQuestionsBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_body",
        message: "Cole a transcrição do vídeo (pelo menos algumas frases) e escolha o nível do aluno.",
      });
    }

    try {
      const questions = await generateListeningQuestions(parsed.data.transcript, parsed.data.level, parsed.data.count);
      return { questions };
    } catch (err) {
      if (err instanceof ListeningAiError) {
        return reply.code(422).send({ error: "ai_error", message: err.message });
      }
      throw err;
    }
  });

  app.post("/api/activities", { preHandler: requireTeacher }, async (req, reply) => {
    const body = req.body as { kind?: string };

    if (body?.kind === "listening") {
      const parsed = listeningCreateBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "invalid_body",
          message: "Informe um título, o link do vídeo do YouTube e pelo menos uma pergunta com as opções.",
        });
      }
      const videoId = extractYoutubeVideoId(parsed.data.youtubeUrl);
      if (!videoId) {
        return reply.code(400).send({
          error: "invalid_youtube_url",
          message: "Não encontrei um vídeo válido nesse link do YouTube.",
        });
      }
      const row = {
        id: randomUUID(),
        title: parsed.data.title,
        kind: "listening" as const,
        embedSrc: null,
        embedHeight: 500,
        youtubeVideoId: videoId,
        questions: JSON.stringify(parsed.data.questions),
        createdAt: new Date().toISOString(),
      };
      db.insert(schema.activities).values(row).run();
      return reply.code(201).send(row);
    }

    const parsed = embedCreateBody.safeParse(req.body);
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
      youtubeVideoId: null,
      questions: null,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.activities).values(row).run();
    return reply.code(201).send(row);
  });

  app.put("/api/activities/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const activity = activityOr404(id);
    if (!activity) return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });

    if (activity.kind === "listening") {
      const parsed = listeningUpdateBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "invalid_body",
          message: "Informe um título, o link do vídeo do YouTube e pelo menos uma pergunta com as opções.",
        });
      }
      const videoId = extractYoutubeVideoId(parsed.data.youtubeUrl);
      if (!videoId) {
        return reply.code(400).send({
          error: "invalid_youtube_url",
          message: "Não encontrei um vídeo válido nesse link do YouTube.",
        });
      }
      db.update(schema.activities)
        .set({
          title: parsed.data.title,
          youtubeVideoId: videoId,
          questions: JSON.stringify(parsed.data.questions),
        })
        .where(eq(schema.activities.id, id))
        .run();
      // As perguntas podem ter mudado — respostas antigas não fariam mais sentido comparadas a elas.
      db.delete(schema.activityAnswers).where(eq(schema.activityAnswers.activityId, id)).run();
      return activityOr404(id);
    }

    const parsed = embedUpdateBody.safeParse(req.body);
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
    db.update(schema.activities)
      .set({ title: parsed.data.title, embedSrc: embed.src, embedHeight: embed.height })
      .where(eq(schema.activities.id, id))
      .run();
    return activityOr404(id);
  });

  app.get("/api/activities/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const activity = activityOr404(id);
    if (!activity) return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });
    const session = req.session!;
    if (session.role !== "teacher" && !studentAssigned(id, session.userId)) {
      return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });
    }

    if (activity.kind !== "listening") {
      const studentIds = session.role === "teacher" ? assignedStudentIds(id) : undefined;
      return { ...activity, studentIds };
    }

    const questions = parseQuestions(activity.questions);

    if (session.role === "teacher") {
      const studentIds = assignedStudentIds(id);
      const results = db
        .select({
          studentId: schema.activityAnswers.studentId,
          score: schema.activityAnswers.score,
          total: schema.activityAnswers.total,
          submittedAt: schema.activityAnswers.submittedAt,
          email: schema.users.email,
        })
        .from(schema.activityAnswers)
        .innerJoin(schema.users, eq(schema.users.id, schema.activityAnswers.studentId))
        .where(eq(schema.activityAnswers.activityId, id))
        .all();
      return { ...activity, questions, studentIds, results };
    }

    const mine = db
      .select()
      .from(schema.activityAnswers)
      .where(and(eq(schema.activityAnswers.activityId, id), eq(schema.activityAnswers.studentId, session.userId)))
      .get();

    return {
      ...activity,
      questions: questionsForStudent(questions),
      mySubmission: mine
        ? {
            answers: JSON.parse(mine.answers) as number[],
            score: mine.score,
            total: mine.total,
            correctAnswers: questions.map((q) => q.correctIndex),
          }
        : null,
    };
  });

  app.post("/api/activities/:id/submit", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = req.session!;
    if (session.role === "teacher") {
      return reply.code(403).send({ error: "forbidden", message: "Só alunos respondem atividades." });
    }
    const activity = activityOr404(id);
    if (!activity || activity.kind !== "listening" || !studentAssigned(id, session.userId)) {
      return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });
    }
    const parsed = submitBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Respostas inválidas." });
    }

    const questions = parseQuestions(activity.questions);
    if (parsed.data.answers.length !== questions.length) {
      return reply.code(400).send({ error: "invalid_body", message: "Responda todas as perguntas." });
    }

    const score = questions.reduce((acc, q, i) => acc + (q.correctIndex === parsed.data.answers[i] ? 1 : 0), 0);
    const now = new Date().toISOString();
    const existing = db
      .select()
      .from(schema.activityAnswers)
      .where(and(eq(schema.activityAnswers.activityId, id), eq(schema.activityAnswers.studentId, session.userId)))
      .get();

    if (existing) {
      db.update(schema.activityAnswers)
        .set({ answers: JSON.stringify(parsed.data.answers), score, total: questions.length, submittedAt: now })
        .where(eq(schema.activityAnswers.id, existing.id))
        .run();
    } else {
      db.insert(schema.activityAnswers)
        .values({
          id: randomUUID(),
          activityId: id,
          studentId: session.userId,
          answers: JSON.stringify(parsed.data.answers),
          score,
          total: questions.length,
          submittedAt: now,
        })
        .run();
    }

    return { score, total: questions.length, correctAnswers: questions.map((q) => q.correctIndex) };
  });

  app.delete("/api/activities/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!activityOr404(id)) return reply.code(404).send({ error: "not_found", message: "Atividade não encontrada." });
    db.delete(schema.activityAnswers).where(eq(schema.activityAnswers.activityId, id)).run();
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
