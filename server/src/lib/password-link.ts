import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.ts";
import { env } from "../env.ts";

// Convite (aluno que ainda não tem senha) dura mais — a professora pode demorar pra
// mandar e o aluno pra abrir. Redefinição de senha de quem já tem conta dura menos.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 48 * 60 * 60 * 1000;

export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_TOO_SHORT = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;

/**
 * Gera o link pessoal pra o aluno criar (convite) ou trocar (redefinição) a senha.
 * Só o mais recente vale; o token em si nunca é guardado, só o hash dele.
 */
export function createPasswordLink(user: { id: string; passwordHash: string | null }) {
  db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, user.id)).run();

  const invite = user.passwordHash === null;
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + (invite ? INVITE_TTL_MS : RESET_TTL_MS)).toISOString();
  db.insert(schema.passwordResetTokens)
    .values({ tokenHash, userId: user.id, expiresAt, createdAt: new Date().toISOString() })
    .run();

  const link = `${env.PUBLIC_WEB_ORIGIN}/redefinir-senha?token=${token}${invite ? "&convite=1" : ""}`;
  return { link, expiresAt, invite };
}
