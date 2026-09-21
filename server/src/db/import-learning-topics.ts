import { and, eq, isNull } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";

type TopicImport = {
  title: string;
  level: string | null;
  area: "grammar" | "vocabulary" | "communication" | null;
  exerciseUrl: string | null;
  videoUrl: string | null;
};

const dataPath = fileURLToPath(new URL("./seed-data/learning-topics-import.json", import.meta.url));
const topics: TopicImport[] = JSON.parse(readFileSync(dataPath, "utf8"));

/**
 * Trilha de aprendizagem trazida do Notion ("Content Guide TKL"). Roda a cada
 * deploy: importa os tópicos que ainda não existem (mesmo título + nível + área),
 * na ordem em que aparecem no arquivo — idempotente, nada duplica.
 */
export function importLearningTopics() {
  let imported = 0;
  const startOrder = db
    .select({ sortOrder: schema.learningTopics.sortOrder })
    .from(schema.learningTopics)
    .all()
    .reduce((max, r) => Math.max(max, r.sortOrder), -1);

  topics.forEach((topic, i) => {
    const already = db
      .select()
      .from(schema.learningTopics)
      .where(
        and(
          eq(schema.learningTopics.title, topic.title),
          topic.level ? eq(schema.learningTopics.level, topic.level) : isNull(schema.learningTopics.level),
          topic.area ? eq(schema.learningTopics.area, topic.area) : isNull(schema.learningTopics.area),
        ),
      )
      .get();
    if (already) return;

    db.insert(schema.learningTopics)
      .values({
        id: crypto.randomUUID(),
        title: topic.title,
        level: topic.level,
        area: topic.area,
        exerciseUrl: topic.exerciseUrl,
        videoUrl: topic.videoUrl,
        sortOrder: startOrder + 1 + i,
        createdAt: new Date().toISOString(),
      })
      .run();
    imported++;
  });

  if (imported > 0) {
    console.log(`[db] trilha de aprendizagem: ${imported} tópico(s) importado(s)`);
  }
}
