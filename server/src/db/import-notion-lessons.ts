import { and, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";
import { getSetting, setSetting } from "../lib/settings.ts";

type NotionLesson = {
  subject: string;
  scheduledAt: string;
  attended: boolean | null;
};

const dataPath = fileURLToPath(new URL("./seed-data/notion-lessons-import.json", import.meta.url));
const lessonsByEmail: Record<string, NotionLesson[]> = JSON.parse(readFileSync(dataPath, "utf8"));

const IMPORTED_FLAG = "notion_lessons_imported";

/**
 * Histórico de aulas trazido do Notion (planilha "Aulas TKL"). Roda só uma vez —
 * depois disso, marca em app_settings que já rodou e nunca mais mexe nas aulas.
 * Rodar de novo a cada deploy faria uma aula apagada pela professora "voltar"
 * porque o e-mail/data/assunto dela ainda bate com a planilha antiga.
 */
export function importNotionLessons() {
  if (getSetting(IMPORTED_FLAG)) return;

  let imported = 0;

  for (const [email, lessons] of Object.entries(lessonsByEmail)) {
    const student = db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email), eq(schema.users.role, "student")))
      .get();
    if (!student) continue;

    for (const lesson of lessons) {
      const already = db
        .select()
        .from(schema.lessons)
        .where(
          and(
            eq(schema.lessons.studentId, student.id),
            eq(schema.lessons.scheduledAt, lesson.scheduledAt),
            eq(schema.lessons.subject, lesson.subject),
          ),
        )
        .get();
      if (already) continue;

      db.insert(schema.lessons)
        .values({
          id: crypto.randomUUID(),
          studentId: student.id,
          scheduledAt: lesson.scheduledAt,
          subject: lesson.subject,
          classLink: null,
          activityLink: null,
          attended: lesson.attended,
          createdAt: new Date().toISOString(),
        })
        .run();
      imported++;
    }
  }

  if (imported > 0) {
    console.log(`[db] histórico do Notion: ${imported} aula(s) importada(s)`);
  }
  setSetting(IMPORTED_FLAG, new Date().toISOString());
}
