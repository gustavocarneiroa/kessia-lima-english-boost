import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth } from "../../auth/guards.ts";
import { getWordOfTheDay, todayDateKey } from "../../lib/wordleWords.ts";

type LetterStatus = "correct" | "present" | "absent";

function checkGuess(guess: string, word: string): LetterStatus[] {
  const result: LetterStatus[] = new Array(word.length).fill("absent");
  const remaining = new Map<string, number>();
  for (const letter of word) remaining.set(letter, (remaining.get(letter) ?? 0) + 1);

  for (let i = 0; i < word.length; i++) {
    if (guess[i] === word[i]) {
      result[i] = "correct";
      remaining.set(word[i], (remaining.get(word[i]) ?? 0) - 1);
    }
  }
  for (let i = 0; i < word.length; i++) {
    if (result[i] === "correct") continue;
    const left = remaining.get(guess[i]) ?? 0;
    if (left > 0) {
      result[i] = "present";
      remaining.set(guess[i], left - 1);
    }
  }
  return result;
}

// Menos tentativas = mais pontos; acertar sem usar a dica dá um bônus extra.
function calculatePoints(won: boolean, guessesUsed: number, hintUsed: boolean): number {
  if (!won) return 5;
  const base = (7 - guessesUsed) * 10;
  const bonus = hintUsed ? 0 : 15;
  return base + bonus;
}

const guessBody = z.object({ guess: z.string().trim().toUpperCase() });
const finishBody = z.object({
  won: z.boolean(),
  guessesUsed: z.number().int().min(1).max(6),
  hintUsed: z.boolean(),
});

export async function wordleRoutes(app: FastifyInstance) {
  app.get("/api/wordle/today", { preHandler: requireAuth }, async (req) => {
    const date = todayDateKey();
    const { letterCount } = getWordOfTheDay(date);
    const existing = db
      .select()
      .from(schema.wordleGames)
      .where(and(eq(schema.wordleGames.studentId, req.session!.userId), eq(schema.wordleGames.date, date)))
      .get();

    return {
      date,
      letterCount,
      result: existing
        ? { won: existing.won, guessesUsed: existing.guessesUsed, hintUsed: existing.hintUsed, points: existing.points }
        : null,
    };
  });

  // Dica só é enviada quando o aluno pede — assim não dá pra "descobrir" ela
  // olhando a resposta de /today antes de clicar em "Ver dica".
  app.get("/api/wordle/hint", { preHandler: requireAuth }, async () => {
    const { hint } = getWordOfTheDay(todayDateKey());
    return { hint };
  });

  app.post("/api/wordle/guess", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = guessBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Palpite inválido." });
    }
    const date = todayDateKey();
    const { word, letterCount } = getWordOfTheDay(date);
    if (parsed.data.guess.length !== letterCount) {
      return reply.code(400).send({ error: "invalid_length", message: `A palavra tem ${letterCount} letras.` });
    }

    return {
      statuses: checkGuess(parsed.data.guess, word),
      correct: parsed.data.guess === word,
      word: parsed.data.guess === word ? word : undefined,
    };
  });

  app.post("/api/wordle/finish", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = finishBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados inválidos." });
    }
    const date = todayDateKey();
    const studentId = req.session!.userId;

    const existing = db
      .select()
      .from(schema.wordleGames)
      .where(and(eq(schema.wordleGames.studentId, studentId), eq(schema.wordleGames.date, date)))
      .get();
    if (existing) {
      return { won: existing.won, guessesUsed: existing.guessesUsed, hintUsed: existing.hintUsed, points: existing.points };
    }

    const { won, guessesUsed, hintUsed } = parsed.data;
    const points = calculatePoints(won, guessesUsed, hintUsed);
    db.insert(schema.wordleGames)
      .values({
        id: crypto.randomUUID(),
        studentId,
        date,
        won,
        guessesUsed,
        hintUsed,
        points,
        createdAt: new Date().toISOString(),
      })
      .run();

    return { won, guessesUsed, hintUsed, points };
  });

  app.get("/api/wordle/leaderboard", { preHandler: requireAuth }, async (req) => {
    const query = req.query as { date?: string };
    const date = query.date || todayDateKey();

    const rows = db
      .select({
        studentId: schema.wordleGames.studentId,
        won: schema.wordleGames.won,
        guessesUsed: schema.wordleGames.guessesUsed,
        hintUsed: schema.wordleGames.hintUsed,
        points: schema.wordleGames.points,
        createdAt: schema.wordleGames.createdAt,
        fullName: schema.studentProfiles.fullName,
        email: schema.users.email,
      })
      .from(schema.wordleGames)
      .innerJoin(schema.users, eq(schema.users.id, schema.wordleGames.studentId))
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.wordleGames.studentId))
      .where(eq(schema.wordleGames.date, date))
      .orderBy(desc(schema.wordleGames.points), schema.wordleGames.createdAt)
      .all();

    const userId = req.session!.userId;
    return {
      date,
      items: rows.map((r) => ({
        studentId: r.studentId,
        isYou: r.studentId === userId,
        firstName: (r.fullName || r.email).trim().split(/\s+/)[0],
        won: r.won,
        guessesUsed: r.guessesUsed,
        hintUsed: r.hintUsed,
        points: r.points,
      })),
    };
  });
}
