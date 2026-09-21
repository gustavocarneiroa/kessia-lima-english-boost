import { and, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";

type NotionStudentProfile = {
  englishLevel: string | null;
  classWeekday: string | null;
  notes: string | null;
};

const dataPath = fileURLToPath(new URL("./seed-data/notion-students-import.json", import.meta.url));
const profilesByEmail: Record<string, NotionStudentProfile> = JSON.parse(readFileSync(dataPath, "utf8"));

/**
 * Dados de alunos ativos trazidos do Notion (planilha "Alunos"), snapshot de
 * setembro/2026. Roda a cada deploy: quando o e-mail bate com um aluno já
 * cadastrado no portal, preenche nível de inglês, dia da aula fixa e observações
 * (turno, valor mensal, vencimento, horas-aula semanais) — só nos campos que
 * ainda estiverem vazios, pra nunca sobrescrever o que a professora já editou
 * pelo próprio portal.
 */
export function importNotionStudents() {
  let updated = 0;
  const skipped: string[] = [];

  for (const [email, profile] of Object.entries(profilesByEmail)) {
    const student = db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email), eq(schema.users.role, "student")))
      .get();
    if (!student) {
      skipped.push(email);
      continue;
    }

    const existing = db
      .select()
      .from(schema.studentProfiles)
      .where(eq(schema.studentProfiles.userId, student.id))
      .get();

    const values = {
      englishLevel: existing?.englishLevel || profile.englishLevel,
      classWeekday: existing?.classWeekday || profile.classWeekday,
      notes: existing?.notes || profile.notes,
    };

    const changed =
      values.englishLevel !== (existing?.englishLevel ?? null) ||
      values.classWeekday !== (existing?.classWeekday ?? null) ||
      values.notes !== (existing?.notes ?? null);
    if (!changed) continue;

    db.insert(schema.studentProfiles)
      .values({
        userId: student.id,
        englishLevel: values.englishLevel,
        classWeekday: values.classWeekday,
        notes: values.notes,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.studentProfiles.userId,
        set: {
          englishLevel: values.englishLevel,
          classWeekday: values.classWeekday,
          notes: values.notes,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
    updated++;
  }

  if (updated > 0) {
    console.log(`[db] perfis do Notion: ${updated} aluno(s) atualizado(s)`);
  }
  if (skipped.length > 0) {
    console.log(`[db] perfis do Notion: ${skipped.length} e-mail(s) sem conta no portal ainda: ${skipped.join(", ")}`);
  }
}
