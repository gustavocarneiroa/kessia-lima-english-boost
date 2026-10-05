import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, schema } from "./client.ts";
import { getSetting, setSetting } from "../lib/settings.ts";

type ResourceImport = {
  name: string;
  url: string;
  skills: string[];
  price: "free" | "freemium" | "paid";
  recommended?: boolean;
  note?: string;
  description: string;
};

const dataPath = fileURLToPath(new URL("./seed-data/practice-resources-import.json", import.meta.url));

/**
 * Lista de recursos pra praticar inglês ("lista de referências" da professora, no
 * Notion). Roda uma vez só: se ela editar ou apagar um recurso depois, a próxima
 * atualização não recria nada.
 */
const FLAG = "practice_resources_imported";

export function importPracticeResources() {
  if (getSetting(FLAG)) return;
  const resources: ResourceImport[] = JSON.parse(readFileSync(dataPath, "utf8"));

  const now = new Date().toISOString();
  for (const r of resources) {
    db.insert(schema.practiceResources)
      .values({
        id: crypto.randomUUID(),
        name: r.name,
        url: r.url,
        skills: JSON.stringify(r.skills),
        price: r.price,
        recommended: r.recommended ?? false,
        note: r.note ?? null,
        description: r.description || null,
        createdAt: now,
      })
      .run();
  }

  setSetting(FLAG, now);
  console.log(`[db] recursos: ${resources.length} recurso(s) importado(s)`);
}
