import { eq } from "drizzle-orm";
import { db, sqlite, schema } from "./client.ts";
import { env } from "../env.ts";

/**
 * Cria o schema (via CREATE TABLE IF NOT EXISTS em client.ts, aplicado ao importar
 * db/client.ts acima) e garante que a professora admin sempre exista. Sem senha
 * ainda: o primeiro login dela grava a senha (ver modules/auth/routes.ts).
 */
const existing = db.select().from(schema.users).where(eq(schema.users.email, env.ADMIN_EMAIL)).get();
if (!existing) {
  db.insert(schema.users)
    .values({
      id: crypto.randomUUID(),
      email: env.ADMIN_EMAIL,
      passwordHash: null,
      role: "teacher",
      createdAt: new Date().toISOString(),
    })
    .run();
  console.log(`[db] admin seed: ${env.ADMIN_EMAIL}`);
}

sqlite.close();
console.log("[db] schema ok");
