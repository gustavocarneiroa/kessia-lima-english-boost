import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";
import { getSetting, setSetting } from "../lib/settings.ts";

type QuizItem =
  | { type: "choice"; prompt: string; options: string[]; correctIndex: number }
  | { type: "blank"; prompt: string };

type ActivityImport = {
  title: string;
  questions: QuizItem[];
};

const dataPath = fileURLToPath(new URL("./seed-data/notebook-activities-import.json", import.meta.url));

/**
 * Exercícios do caderno "Online Notebook - A1/A2" da professora, um quiz por aula.
 * Roda uma vez só: se ela apagar ou editar uma atividade depois, a próxima
 * atualização não recria nada. Atividade com o mesmo título já existente é pulada.
 * Entram sem aluno nenhum — a professora escolhe pra quem enviar cada uma.
 */
const FLAG = "notebook_a1_a2_activities_imported";

export function importNotebookActivities() {
  if (getSetting(FLAG)) return;
  const activities: ActivityImport[] = JSON.parse(readFileSync(dataPath, "utf8"));

  let imported = 0;
  // a tela mostra as atividades mais novas no topo: a primeira do caderno ganha a
  // data mais recente pra aparecer primeiro, na mesma ordem do caderno
  const base = Date.now() - activities.length * 1000;
  activities.forEach((activity, i) => {
    const already = db.select().from(schema.activities).where(eq(schema.activities.title, activity.title)).get();
    if (already) return;

    db.insert(schema.activities)
      .values({
        id: crypto.randomUUID(),
        title: activity.title,
        kind: "quiz",
        embedSrc: null,
        embedHeight: 500,
        youtubeVideoId: null,
        questions: JSON.stringify(activity.questions),
        createdAt: new Date(base + (activities.length - 1 - i) * 1000).toISOString(),
      })
      .run();
    imported++;
  });

  setSetting(FLAG, new Date().toISOString());
  console.log(`[db] caderno A1/A2: ${imported} atividade(s) importada(s)`);
}
