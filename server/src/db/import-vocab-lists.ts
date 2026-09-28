import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";
import { getSetting, setSetting } from "../lib/settings.ts";

type ListImport = {
  title: string;
  cards: { word: string; meaning: string }[];
};

const dataPath = fileURLToPath(new URL("./seed-data/vocab-lists-import.json", import.meta.url));

/**
 * Listas de vocabulário por aula, geradas pelo Gemini a partir das apresentações
 * da professora. Roda uma vez só: se ela apagar ou editar uma lista depois, a
 * próxima atualização não recria nada. Lista com o mesmo título já existente é
 * pulada. Os cards entram sem áudio — o áudio da palavra é gerado na primeira vez
 * que alguém clica em "Ouvir" (ver modules/vocab/routes.ts).
 */
const FLAG = "vocab_lists_gemini_imported";

export function importVocabLists() {
  if (getSetting(FLAG)) return;
  const lists: ListImport[] = JSON.parse(readFileSync(dataPath, "utf8"));

  let imported = 0;
  // a tela mostra as listas mais novas no topo: a primeira do arquivo (Lesson 0)
  // ganha a data mais recente pra aparecer primeiro, na ordem das aulas
  const base = Date.now() - lists.length * 1000;
  lists.forEach((list, i) => {
    const already = db.select().from(schema.vocabLists).where(eq(schema.vocabLists.title, list.title)).get();
    if (already) return;

    const createdAt = new Date(base + (lists.length - 1 - i) * 1000).toISOString();
    const listId = crypto.randomUUID();
    db.insert(schema.vocabLists).values({ id: listId, title: list.title, description: null, createdAt }).run();
    list.cards.forEach((card, order) => {
      db.insert(schema.vocabCards)
        .values({
          id: crypto.randomUUID(),
          listId,
          word: card.word,
          meaning: card.meaning,
          phonetic: "",
          sourceUrl: null,
          origin: "teacher",
          wordAudioPath: null,
          meaningAudioPath: null,
          imagePath: null,
          sortOrder: order,
          createdAt,
        })
        .run();
    });
    imported++;
  });

  setSetting(FLAG, new Date().toISOString());
  console.log(`[db] vocabulário: ${imported} lista(s) importada(s)`);
}
