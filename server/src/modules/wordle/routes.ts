import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth } from "../../auth/guards.ts";
import { getWordOfTheDay, todayDateKey } from "../../lib/wordleWords.ts";
import { lookupPronunciation } from "../../lib/freeDictionary.ts";
import { firstDisplayName } from "../../lib/displayName.ts";

type LetterStatus = "correct" | "present" | "absent";

const MAX_GUESSES = 6;

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

function serializeGuess(row: typeof schema.wordleGuesses.$inferSelect) {
  return {
    word: row.word,
    statuses: JSON.parse(row.statuses) as LetterStatus[],
    phonetic: row.phonetic,
    audioUrl: row.audioUrl,
  };
}

const guessBody = z.object({ guess: z.string().trim().toUpperCase() });
const finishBody = z.object({
  won: z.boolean(),
  guessesUsed: z.number().int().min(1).max(MAX_GUESSES),
  hintUsed: z.boolean(),
});

export async function wordleRoutes(app: FastifyInstance) {
  app.get("/api/wordle/today", { preHandler: requireAuth }, async (req) => {
    const date = todayDateKey();
    const studentId = req.session!.userId;
    const { letterCount } = getWordOfTheDay(date);

    const existing = db
      .select()
      .from(schema.wordleGames)
      .where(and(eq(schema.wordleGames.studentId, studentId), eq(schema.wordleGames.date, date)))
      .get();

    const guesses = db
      .select()
      .from(schema.wordleGuesses)
      .where(and(eq(schema.wordleGuesses.studentId, studentId), eq(schema.wordleGuesses.date, date)))
      .orderBy(asc(schema.wordleGuesses.guessIndex))
      .all();

    return {
      date,
      letterCount,
      guesses: guesses.map(serializeGuess),
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
    const studentId = req.session!.userId;
    const { word, letterCount } = getWordOfTheDay(date);
    if (parsed.data.guess.length !== letterCount) {
      return reply.code(400).send({ error: "invalid_length", message: `A palavra tem ${letterCount} letras.` });
    }

    const alreadyFinished = db
      .select()
      .from(schema.wordleGames)
      .where(and(eq(schema.wordleGames.studentId, studentId), eq(schema.wordleGames.date, date)))
      .get();
    if (alreadyFinished) {
      return reply.code(409).send({ error: "already_finished", message: "Você já jogou hoje." });
    }

    const currentIndex = await db.$count(
      schema.wordleGuesses,
      and(eq(schema.wordleGuesses.studentId, studentId), eq(schema.wordleGuesses.date, date)),
    );
    if (currentIndex >= MAX_GUESSES) {
      return reply.code(409).send({ error: "no_attempts_left", message: "Você já usou todas as tentativas de hoje." });
    }

    const statuses = checkGuess(parsed.data.guess, word);
    const correct = parsed.data.guess === word;
    const guessId = crypto.randomUUID();

    db.insert(schema.wordleGuesses)
      .values({
        id: guessId,
        studentId,
        date,
        guessIndex: currentIndex,
        word: parsed.data.guess,
        statuses: JSON.stringify(statuses),
        phonetic: null,
        audioUrl: null,
        createdAt: new Date().toISOString(),
      })
      .run();

    // A fonética/áudio não trava a resposta do palpite — buscamos em segundo
    // plano e completamos o registro quando (e se) o dicionário responder.
    lookupPronunciation(parsed.data.guess)
      .then(({ phonetic, audioUrl }) => {
        if (phonetic || audioUrl) {
          db.update(schema.wordleGuesses).set({ phonetic, audioUrl }).where(eq(schema.wordleGuesses.id, guessId)).run();
        }
      })
      .catch(() => {});

    return {
      statuses,
      correct,
      word: correct ? word : undefined,
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
        role: schema.users.role,
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
        firstName: firstDisplayName(r),
        won: r.won,
        guessesUsed: r.guessesUsed,
        hintUsed: r.hintUsed,
        points: r.points,
      })),
    };
  });

  // Distribuição histórica: quantas vezes o aluno já acertou em cada tentativa
  // (linha 1 a 6) e quantas vezes não acertou — pra ele ver sua evolução.
  app.get("/api/wordle/stats", { preHandler: requireAuth }, async (req) => {
    const studentId = req.session!.userId;
    const games = db.select().from(schema.wordleGames).where(eq(schema.wordleGames.studentId, studentId)).all();

    const distribution = [0, 0, 0, 0, 0, 0];
    let lost = 0;
    for (const game of games) {
      if (game.won) distribution[game.guessesUsed - 1]++;
      else lost++;
    }

    return {
      distribution,
      lost,
      gamesPlayed: games.length,
      totalPoints: games.reduce((sum, g) => sum + g.points, 0),
    };
  });
}
