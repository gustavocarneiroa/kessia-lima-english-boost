import { and, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";

type NotionLesson = {
  subject: string;
  scheduledAt: string;
  attended: boolean | null;
};

const dataPath = fileURLToPath(new URL("./seed-data/notion-lessons-import.json", import.meta.url));
const lessonsByEmail: Record<string, NotionLesson[]> = JSON.parse(readFileSync(dataPath, "utf8"));

/**
 * Histórico de aulas trazido do Notion (planilha "Aulas TKL"). Roda a cada deploy:
 * quando o e-mail de um aluno bate com um aluno já cadastrado no portal, importa
 * as aulas dele que ainda não estão no banco (idempotente — nada duplica).
 */
export function importNotionLessons() {
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
}
