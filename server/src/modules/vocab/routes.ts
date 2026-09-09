import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { audioFilePath } from "../../lib/audio.ts";
import { downloadAudio, lookupEnglishWord } from "../../lib/dictionary.ts";
import { synthesizeSpeech } from "../../lib/tts.ts";

const titleBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
});

const wordBody = z.object({
  word: z.string().trim().min(1).max(100),
});

const manualBody = z.object({
  word: z.string().trim().min(1).max(100),
  phonetic: z.string().trim().min(1).max(200),
  meaning: z.string().trim().min(1).max(4000),
  wordAudio: z.string().min(1).max(4_000_000),
  meaningAudio: z.string().min(1).max(4_000_000),
});

const studentsBody = z.object({
  studentIds: z.array(z.string().uuid()),
});

function listOr404(id: string) {
  const list = db.select().from(schema.vocabLists).where(eq(schema.vocabLists.id, id)).get();
  return list ?? null;
}

function studentAssigned(listId: string, studentId: string) {
  return !!db
    .select()
    .from(schema.vocabListStudents)
    .where(and(eq(schema.vocabListStudents.listId, listId), eq(schema.vocabListStudents.studentId, studentId)))
    .get();
}

function canReadList(listId: string, session: { userId: string; role: string }) {
  if (session.role === "teacher") return !!listOr404(listId);
  return studentAssigned(listId, session.userId);
}

async function saveTts(text: string) {
  const { buf, ext } = await synthesizeSpeech(text);
  const name = `${randomUUID()}.${ext}`;
  writeFileSync(audioFilePath(name), buf);
  return name;
}

function saveDownloaded(buf: Buffer, ext: string) {
  const name = `${randomUUID()}.${ext}`;
  writeFileSync(audioFilePath(name), buf);
  return name;
}

function decodeAudioDataUrl(raw: string): { buf: Buffer; ext: string } {
  const m = raw.match(/^data:audio\/([a-z0-9.+-]+);base64,(.+)$/i);
  const b64 = m ? m[2] : raw;
  const mime = m?.[1]?.toLowerCase() ?? "webm";
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 32) {
    throw Object.assign(new Error("Áudio inválido."), { statusCode: 400 });
  }
  const ext = mime.includes("wav") ? "wav" : mime.includes("mpeg") || mime.includes("mp3") ? "mp3" : "webm";
  return { buf, ext };
}

function saveTeacherAudio(raw: string) {
  const { buf, ext } = decodeAudioDataUrl(raw);
  const name = `${randomUUID()}.${ext}`;
  writeFileSync(audioFilePath(name), buf);
  return name;
}

function nextOrder(listId: string) {
  const rows = db.select().from(schema.vocabCards).where(eq(schema.vocabCards.listId, listId)).all();
  return rows.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
}

function cardPublic(c: typeof schema.vocabCards.$inferSelect) {
  return {
    id: c.id,
    word: c.word,
    meaning: c.meaning,
    phonetic: c.phonetic,
    sourceUrl: c.sourceUrl,
    origin: c.origin,
    hasWordAudio: !!c.wordAudioPath,
    hasMeaningAudio: !!c.meaningAudioPath,
    sortOrder: c.sortOrder,
  };
}

export async function vocabRoutes(app: FastifyInstance) {
  app.get("/api/vocab/lists", { preHandler: requireAuth }, async (req) => {
    const session = req.session!;
    if (session.role === "teacher") {
      return db.select().from(schema.vocabLists).all();
    }
    const assigned = db
      .select({ listId: schema.vocabListStudents.listId })
      .from(schema.vocabListStudents)
      .where(eq(schema.vocabListStudents.studentId, session.userId))
      .all();
    const ids = new Set(assigned.map((a) => a.listId));
    return db
      .select()
      .from(schema.vocabLists)
      .all()
      .filter((l) => ids.has(l.id));
  });

  app.post("/api/vocab/lists", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = titleBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Informe um título para a lista." });
    }
    const row = {
      id: randomUUID(),
      title: parsed.data.title,
      description: parsed.data.description || null,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.vocabLists).values(row).run();
    return reply.code(201).send(row);
  });

  app.get("/api/vocab/lists/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!canReadList(id, req.session!)) {
      return reply.code(404).send({ error: "not_found", message: "Lista não encontrada." });
    }
    const list = listOr404(id)!;
    const cards = db
      .select()
      .from(schema.vocabCards)
      .where(eq(schema.vocabCards.listId, id))
      .orderBy(asc(schema.vocabCards.sortOrder))
      .all()
      .map(cardPublic);

    const studentIds =
      req.session!.role === "teacher"
        ? db
            .select()
            .from(schema.vocabListStudents)
            .where(eq(schema.vocabListStudents.listId, id))
            .all()
            .map((r) => r.studentId)
        : undefined;

    return { ...list, cards, studentIds };
  });

  app.patch("/api/vocab/lists/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const list = listOr404(id);
    if (!list) return reply.code(404).send({ error: "not_found", message: "Lista não encontrada." });
    const parsed = titleBody.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados inválidos." });
    }
    db.update(schema.vocabLists)
      .set({
        title: parsed.data.title ?? list.title,
        description: parsed.data.description === undefined ? list.description : parsed.data.description || null,
      })
      .where(eq(schema.vocabLists.id, id))
      .run();
    return listOr404(id);
  });

  app.delete("/api/vocab/lists/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!listOr404(id)) return reply.code(404).send({ error: "not_found", message: "Lista não encontrada." });
    db.delete(schema.vocabListStudents).where(eq(schema.vocabListStudents.listId, id)).run();
    db.delete(schema.vocabCards).where(eq(schema.vocabCards.listId, id)).run();
    db.delete(schema.vocabLists).where(eq(schema.vocabLists.id, id)).run();
    return reply.code(204).send();
  });

  app.post("/api/vocab/lists/:id/duplicate", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const list = listOr404(id);
    if (!list) return reply.code(404).send({ error: "not_found", message: "Lista não encontrada." });
    const copy = {
      id: randomUUID(),
      title: `${list.title} (cópia)`,
      description: list.description,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.vocabLists).values(copy).run();
    const cards = db.select().from(schema.vocabCards).where(eq(schema.vocabCards.listId, id)).all();
    for (const c of cards) {
      db.insert(schema.vocabCards)
        .values({
          ...c,
          id: randomUUID(),
          listId: copy.id,
        })
        .run();
    }
    return reply.code(201).send(copy);
  });

  app.put("/api/vocab/lists/:id/students", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!listOr404(id)) return reply.code(404).send({ error: "not_found", message: "Lista não encontrada." });
    const parsed = studentsBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Lista de alunos inválida." });
    }
    db.delete(schema.vocabListStudents).where(eq(schema.vocabListStudents.listId, id)).run();
    for (const studentId of parsed.data.studentIds) {
      const u = db.select().from(schema.users).where(eq(schema.users.id, studentId)).get();
      if (!u || u.role !== "student") continue;
      db.insert(schema.vocabListStudents).values({ listId: id, studentId }).run();
    }
    return { ok: true };
  });

  app.post("/api/vocab/lists/:id/cards", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!listOr404(id)) return reply.code(404).send({ error: "not_found", message: "Lista não encontrada." });
    const parsed = wordBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Informe a palavra." });
    }

    const hit = await lookupEnglishWord(parsed.data.word);
    if (!hit) {
      return reply.code(422).send({
        error: "not_in_dictionary",
        message: "Essa palavra não está no dicionário. Preencha fonética, significado e os dois áudios.",
        word: parsed.data.word.trim(),
      });
    }

    let wordAudioPath: string | null = null;
    if (hit.audioUrl) {
      const dl = await downloadAudio(hit.audioUrl);
      wordAudioPath = dl ? saveDownloaded(dl.buf, dl.ext) : await saveTts(hit.word);
    } else {
      wordAudioPath = await saveTts(hit.word);
    }
    const meaningAudioPath = await saveTts(hit.meaning);

    const row = {
      id: randomUUID(),
      listId: id,
      word: hit.word,
      meaning: hit.meaning,
      phonetic: hit.phonetic,
      sourceUrl: hit.sourceUrl,
      origin: "api" as const,
      wordAudioPath,
      meaningAudioPath,
      sortOrder: nextOrder(id),
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.vocabCards).values(row).run();
    return reply.code(201).send(cardPublic(row));
  });

  app.post("/api/vocab/lists/:id/cards/manual", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!listOr404(id)) return reply.code(404).send({ error: "not_found", message: "Lista não encontrada." });
    const parsed = manualBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_body",
        message: "Preencha fonética, significado e os dois áudios.",
      });
    }

    const row = {
      id: randomUUID(),
      listId: id,
      word: parsed.data.word.trim(),
      meaning: parsed.data.meaning,
      phonetic: parsed.data.phonetic,
      sourceUrl: null,
      origin: "teacher" as const,
      wordAudioPath: saveTeacherAudio(parsed.data.wordAudio),
      meaningAudioPath: saveTeacherAudio(parsed.data.meaningAudio),
      sortOrder: nextOrder(id),
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.vocabCards).values(row).run();
    return reply.code(201).send(cardPublic(row));
  });

  app.delete("/api/vocab/lists/:id/cards/:cardId", { preHandler: requireTeacher }, async (req, reply) => {
    const { id, cardId } = req.params as { id: string; cardId: string };
    const card = db
      .select()
      .from(schema.vocabCards)
      .where(and(eq(schema.vocabCards.id, cardId), eq(schema.vocabCards.listId, id)))
      .get();
    if (!card) return reply.code(404).send({ error: "not_found", message: "Card não encontrado." });
    db.delete(schema.vocabCards).where(eq(schema.vocabCards.id, cardId)).run();
    return reply.code(204).send();
  });

  app.get("/api/vocab/cards/:cardId/audio/:kind", { preHandler: requireAuth }, async (req, reply) => {
    const { cardId, kind } = req.params as { cardId: string; kind: string };
    if (kind !== "word" && kind !== "meaning") {
      return reply.code(400).send({ error: "invalid_kind", message: "Áudio inválido." });
    }
    const card = db.select().from(schema.vocabCards).where(eq(schema.vocabCards.id, cardId)).get();
    if (!card || !canReadList(card.listId, req.session!)) {
      return reply.code(404).send({ error: "not_found", message: "Áudio não encontrado." });
    }
    const rel = kind === "word" ? card.wordAudioPath : card.meaningAudioPath;
    if (!rel) return reply.code(404).send({ error: "not_found", message: "Áudio não encontrado." });
    const buf = readFileSync(audioFilePath(rel));
    const ext = extname(rel).toLowerCase();
    const type =
      ext === ".mp3" ? "audio/mpeg" : ext === ".ogg" ? "audio/ogg" : ext === ".webm" ? "audio/webm" : "audio/wav";
    return reply.type(type).send(buf);
  });
}
