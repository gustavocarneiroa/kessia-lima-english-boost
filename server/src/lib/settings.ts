import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.ts";

const OPENAI_API_KEY_SETTING = "openai_api_key";

function getSetting(key: string): string | null {
  return db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key)).get()?.value ?? null;
}

function setSetting(key: string, value: string): void {
  const now = new Date().toISOString();
  db.insert(schema.appSettings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value, updatedAt: now } })
    .run();
}

function deleteSetting(key: string): void {
  db.delete(schema.appSettings).where(eq(schema.appSettings.key, key)).run();
}

// A chave nunca é devolvida por nenhuma rota — só usada aqui, internamente, pra chamar a IA.
export function getOpenAiApiKey(): string | null {
  return getSetting(OPENAI_API_KEY_SETTING);
}

export function setOpenAiApiKey(apiKey: string): void {
  setSetting(OPENAI_API_KEY_SETTING, apiKey);
}

export function clearOpenAiApiKey(): void {
  deleteSetting(OPENAI_API_KEY_SETTING);
}
