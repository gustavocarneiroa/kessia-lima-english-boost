import { and, eq, isNull } from "drizzle-orm";
import { db, sqlite, schema } from "./client.ts";
import { env } from "../env.ts";
import { importNotionLessons } from "./import-notion-lessons.ts";
import { importLearningTopics } from "./import-learning-topics.ts";
import { importNotionStudents } from "./import-notion-students.ts";
import { getSetting, setSetting } from "../lib/settings.ts";

/**
 * Cria o schema (via CREATE TABLE IF NOT EXISTS em client.ts, aplicado ao importar
 * db/client.ts acima) e garante que a professora admin sempre exista. Sem senha
 * ainda: o primeiro login dela grava a senha (ver modules/auth/routes.ts).
 */
const existing = db.select().from(schema.users).where(eq(schema.users.email, env.ADMIN_EMAIL)).get();
if (!existing) {
  db.insert(schema.users)
    .values({
      id: crypto.randomUUID(),
      email: env.ADMIN_EMAIL,
      passwordHash: null,
      role: "teacher",
      createdAt: new Date().toISOString(),
    })
    .run();
  console.log(`[db] admin seed: ${env.ADMIN_EMAIL}`);
}

importNotionLessons();
importNotionStudents();
importLearningTopics();

// Aviso de "novidade" (aula/atividade nova) na tela inicial do aluno: sem isso,
// quem já tinha conta veria um aviso gigante com tudo que já existia antes desse
// recurso existir. Roda só uma vez — depois disso, cada aluno só é avisado do
// que for criado de fato depois que ele viu a tela pela última vez.
const NEW_CONTENT_BACKFILL_FLAG = "new_content_seen_backfilled";
if (!getSetting(NEW_CONTENT_BACKFILL_FLAG)) {
  const now = new Date().toISOString();
  db.update(schema.users)
    .set({ newContentSeenAt: now })
    .where(and(eq(schema.users.role, "student"), isNull(schema.users.newContentSeenAt)))
    .run();
  setSetting(NEW_CONTENT_BACKFILL_FLAG, now);
}

sqlite.close();
console.log("[db] schema ok");
