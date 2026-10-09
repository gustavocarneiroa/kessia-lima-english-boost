import { eq, inArray } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";
import { getSetting, setSetting } from "../lib/settings.ts";

const dataPath = fileURLToPath(new URL("./seed-data/notebook-activities-import.json", import.meta.url));
const FLAG = "notebook_a1_a2_activities_removed";

/**
 * Remove, uma única vez, as atividades que vieram do "Online Notebook A1/A2"
 * (reconhecidas pelo título exato) junto com respostas e envios a alunos.
 * As demais atividades não são tocadas.
 */
export function removeNotebookActivities() {
  if (getSetting(FLAG)) return;
  const titles = (JSON.parse(readFileSync(dataPath, "utf8")) as { title: string }[]).map((a) => a.title);

  const ids = db
    .select({ id: schema.activities.id })
    .from(schema.activities)
    .where(inArray(schema.activities.title, titles))
    .all()
    .map((r) => r.id);

  for (const id of ids) {
    db.delete(schema.activityAnswers).where(eq(schema.activityAnswers.activityId, id)).run();
    db.delete(schema.activityStudents).where(eq(schema.activityStudents.activityId, id)).run();
    db.delete(schema.activities).where(eq(schema.activities.id, id)).run();
  }

  setSetting(FLAG, new Date().toISOString());
  console.log(`[db] caderno A1/A2: ${ids.length} atividade(s) removida(s)`);
}
