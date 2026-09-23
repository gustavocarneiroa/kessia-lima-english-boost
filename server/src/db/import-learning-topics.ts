import { and, asc, eq, isNull } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";
import { getSetting, setSetting } from "../lib/settings.ts";

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

  applyNotionOrderOnce();
}

/**
 * A primeira importação gravou os tópicos numa ordem diferente da do Notion.
 * Roda uma vez só: põe os tópicos do Notion na ordem exata do arquivo e os que
 * a professora criou depois vão pro fim, na ordem em que já estavam. Depois
 * disso, a ordem manual (arrastar na tela) nunca mais é mexida.
 */
const NOTION_ORDER_FLAG = "learning_topics_notion_order_applied";

function applyNotionOrderOnce() {
  if (getSetting(NOTION_ORDER_FLAG)) return;

  const key = (t: { title: string; level: string | null; area: string | null }) =>
    [t.level ?? "", t.area ?? "", t.title].join("|");
  const notionIndex = new Map(topics.map((t, i) => [key(t), i]));

  const rows = db.select().from(schema.learningTopics).orderBy(asc(schema.learningTopics.sortOrder)).all();
  const inNotion = rows.filter((r) => notionIndex.has(key(r))).sort((a, b) => notionIndex.get(key(a))! - notionIndex.get(key(b))!);
  const others = rows.filter((r) => !notionIndex.has(key(r)));

  [...inNotion, ...others].forEach((row, i) => {
    db.update(schema.learningTopics).set({ sortOrder: i }).where(eq(schema.learningTopics.id, row.id)).run();
  });

  setSetting(NOTION_ORDER_FLAG, new Date().toISOString());
  console.log("[db] trilha de aprendizagem: ordem do Notion aplicada");
}
