import type { FastifyInstance } from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { extractYoutubeVideoId } from "../../lib/youtube.ts";
import {
  DEFAULT_LEVEL_TEST,
  DONT_KNOW,
  LEVEL_TEST_FOR_STUDENTS,
  allQuestions,
  getLevelTest,
  levelTestForStudent,
  levelTestQuestionSchema,
  levelTestSchema,
  saveLevelTest,
  scoreLevelTest,
  type LevelTest,
} from "../../lib/levelTest.ts";

// A professora manda o link do YouTube; o servidor guarda só o ID do vídeo.
const saveBody = z.object({
  questions: z.array(levelTestQuestionSchema).min(1).max(120),
  listening: z
    .object({
      youtubeUrl: z.string().trim().min(1).max(500),
      questions: z.array(levelTestQuestionSchema).min(1).max(30),
    })
    .nullable(),
});

const sendBody = z.object({
  studentIds: z.array(z.string().uuid()).min(1),
});

const submitBody = z.object({
  answers: z.array(z.number().int().min(DONT_KNOW)).max(150),
});

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function attemptSummary(a: typeof schema.levelTestAttempts.$inferSelect) {
  return {
    id: a.id,
    level: a.level,
    score: a.score,
    total: a.total,
    byLevel: parseJson(a.byLevel, {}),
    submittedAt: a.submittedAt,
  };
}

function attemptsOf(studentId: string) {
  return db
    .select()
    .from(schema.levelTestAttempts)
    .where(eq(schema.levelTestAttempts.studentId, studentId))
    .orderBy(desc(schema.levelTestAttempts.submittedAt))
    .all()
    .map(attemptSummary);
}

function assignmentOf(studentId: string) {
  return (
    db
      .select({ assignedAt: schema.levelTestAssignments.assignedAt })
      .from(schema.levelTestAssignments)
      .where(eq(schema.levelTestAssignments.studentId, studentId))
      .get()?.assignedAt ?? null
  );
}

function isStudent(id: string) {
  const u = db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, id)).get();
  return u?.role === "student";
}

export async function levelTestRoutes(app: FastifyInstance) {
  // ---- Professora ----

  app.get("/api/level-test", { preHandler: requireTeacher }, async () => {
    return { test: getLevelTest(), defaultTest: DEFAULT_LEVEL_TEST };
  });

  app.put("/api/level-test", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = saveBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_body",
        message: "Confira as perguntas: todas precisam de enunciado, pelo menos 2 opções preenchidas e a resposta certa marcada.",
      });
    }
    let listening: LevelTest["listening"] = null;
    if (parsed.data.listening) {
      const videoId = extractYoutubeVideoId(parsed.data.listening.youtubeUrl);
      if (!videoId) {
        return reply.code(400).send({ error: "invalid_youtube_url", message: "Não encontrei um vídeo válido nesse link do YouTube." });
      }
      listening = { youtubeVideoId: videoId, questions: parsed.data.listening.questions };
    }
    const test = levelTestSchema.parse({ questions: parsed.data.questions, listening });
    saveLevelTest(test);
    return { test };
  });

  // Lista de alunos ativos com a situação do teste: enviado/aguardando e o último resultado.
  app.get("/api/level-test/students", { preHandler: requireTeacher }, async () => {
    const students = db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.studentProfiles.fullName,
        englishLevel: schema.studentProfiles.englishLevel,
      })
      .from(schema.users)
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.users.id))
      .where(and(eq(schema.users.role, "student"), isNull(schema.users.archivedAt)))
      .all();

    const assignments = new Map(
      db
        .select()
        .from(schema.levelTestAssignments)
        .all()
        .map((a) => [a.studentId, a.assignedAt]),
    );
    const lastAttempt = new Map<string, ReturnType<typeof attemptSummary>>();
    for (const a of db.select().from(schema.levelTestAttempts).orderBy(desc(schema.levelTestAttempts.submittedAt)).all()) {
      if (!lastAttempt.has(a.studentId)) lastAttempt.set(a.studentId, attemptSummary(a));
    }

    return students
      .map((s) => ({
        ...s,
        assignedAt: assignments.get(s.id) ?? null,
        lastAttempt: lastAttempt.get(s.id) ?? null,
      }))
      .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email, "pt-BR"));
  });

  app.get("/api/level-test/students/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!isStudent(id)) return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    return { assignedAt: assignmentOf(id), attempts: attemptsOf(id) };
  });

  // "Enviar" o teste: libera pra esses alunos fazerem (de novo, se já tinham feito).
  app.post("/api/level-test/send", { preHandler: requireTeacher }, async (req, reply) => {
    if (!LEVEL_TEST_FOR_STUDENTS) {
      return reply.code(409).send({ error: "students_disabled", message: "O teste ainda não está aberto para os alunos." });
    }
    const parsed = sendBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Escolha pelo menos um aluno." });
    }
    const now = new Date().toISOString();
    let sent = 0;
    for (const studentId of parsed.data.studentIds) {
      if (!isStudent(studentId)) continue;
      db.insert(schema.levelTestAssignments)
        .values({ studentId, assignedAt: now })
        .onConflictDoNothing()
        .run();
      sent += 1;
    }
    return { sent };
  });

  app.delete("/api/level-test/assignments/:studentId", { preHandler: requireTeacher }, async (req, reply) => {
    const { studentId } = req.params as { studentId: string };
    db.delete(schema.levelTestAssignments).where(eq(schema.levelTestAssignments.studentId, studentId)).run();
    return reply.code(204).send();
  });

  // Detalhe de uma tentativa: cada pergunta, o que o aluno marcou e a resposta certa.
  app.get("/api/level-test/attempts/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db
      .select({
        attempt: schema.levelTestAttempts,
        email: schema.users.email,
        fullName: schema.studentProfiles.fullName,
      })
      .from(schema.levelTestAttempts)
      .innerJoin(schema.users, eq(schema.users.id, schema.levelTestAttempts.studentId))
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.levelTestAttempts.studentId))
      .where(eq(schema.levelTestAttempts.id, id))
      .get();
    if (!row) return reply.code(404).send({ error: "not_found", message: "Resultado não encontrado." });
    const test = parseJson<LevelTest>(row.attempt.test, { questions: [], listening: null });
    return {
      ...attemptSummary(row.attempt),
      studentId: row.attempt.studentId,
      studentName: row.fullName || row.email,
      answers: parseJson<number[]>(row.attempt.answers, []),
      questions: test.questions,
      listening: test.listening,
    };
  });

  // ---- Aluno ----

  app.get("/api/me/level-test", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    if (session.role !== "student" || !LEVEL_TEST_FOR_STUDENTS) {
      return reply.code(404).send({ error: "not_found", message: "Só para alunos." });
    }
    const assignedAt = assignmentOf(session.userId);
    return {
      assignedAt,
      test: assignedAt ? levelTestForStudent(getLevelTest()) : null,
      attempts: attemptsOf(session.userId),
    };
  });

  app.post("/api/me/level-test/submit", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    if (session.role !== "student") return reply.code(403).send({ error: "forbidden", message: "Só alunos fazem o teste." });
    if (!LEVEL_TEST_FOR_STUDENTS) return reply.code(404).send({ error: "not_found", message: "Teste não encontrado." });
    if (!assignmentOf(session.userId)) {
      return reply.code(409).send({ error: "not_assigned", message: "Esse teste não está liberado pra você agora." });
    }
    const parsed = submitBody.safeParse(req.body);
    const test = getLevelTest();
    const questions = allQuestions(test);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Respostas inválidas." });
    }
    if (parsed.data.answers.length !== questions.length) {
      return reply.code(400).send({ error: "invalid_body", message: "O teste foi atualizado pela professora enquanto você respondia. Recarregue a página e responda de novo." });
    }
    const answers = parsed.data.answers;
    if (answers.some((a, i) => a !== DONT_KNOW && a >= questions[i].options.length)) {
      return reply.code(400).send({ error: "invalid_body", message: "Respostas inválidas." });
    }

    const result = scoreLevelTest(test, answers);
    const now = new Date().toISOString();
    const attempt = {
      id: randomUUID(),
      studentId: session.userId,
      answers: JSON.stringify(answers),
      score: result.score,
      total: result.total,
      level: result.level,
      byLevel: JSON.stringify(result.byLevel),
      test: JSON.stringify(test),
      submittedAt: now,
    };

    db.transaction((tx) => {
      tx.insert(schema.levelTestAttempts).values(attempt).run();
      tx.delete(schema.levelTestAssignments).where(eq(schema.levelTestAssignments.studentId, session.userId)).run();
      tx.insert(schema.studentProfiles)
        .values({ userId: session.userId, englishLevel: result.level, updatedAt: now })
        .onConflictDoUpdate({
          target: schema.studentProfiles.userId,
          set: { englishLevel: result.level, updatedAt: now },
        })
        .run();
    });

    return attemptSummary(attempt);
  });
}
