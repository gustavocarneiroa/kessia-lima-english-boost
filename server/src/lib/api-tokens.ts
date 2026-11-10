import { createHash, randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.ts";

// Chave de acesso pra programas (o MCP do Claude) agirem como a professora.
// Formato "kl_<64 hex>"; só o hash fica no banco.
const PREFIX = "kl_";

export function hashApiToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isApiTokenFormat(token: string) {
  return token.startsWith(PREFIX) && token.length === PREFIX.length + 64;
}

export function createApiToken(userId: string, name: string) {
  const token = PREFIX + randomBytes(32).toString("hex");
  const row = {
    id: randomUUID(),
    tokenHash: hashApiToken(token),
    userId,
    name,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  db.insert(schema.apiTokens).values(row).run();
  return { token, id: row.id, name: row.name, createdAt: row.createdAt };
}

// "Último uso" gravado no máximo a cada 5 min por chave, pra não escrever no banco a cada pedido.
const LAST_USED_EVERY_MS = 5 * 60 * 1000;

/** Dono da chave (ou null). Atualiza o "último uso". */
export function findApiTokenUser(token: string): string | null {
  if (!isApiTokenFormat(token)) return null;
  const row = db
    .select({ id: schema.apiTokens.id, userId: schema.apiTokens.userId, lastUsedAt: schema.apiTokens.lastUsedAt })
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.tokenHash, hashApiToken(token)))
    .get();
  if (!row) return null;
  const now = Date.now();
  if (!row.lastUsedAt || now - Date.parse(row.lastUsedAt) > LAST_USED_EVERY_MS) {
    db.update(schema.apiTokens).set({ lastUsedAt: new Date(now).toISOString() }).where(eq(schema.apiTokens.id, row.id)).run();
  }
  return row.userId;
}
