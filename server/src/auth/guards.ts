import type { FastifyReply, FastifyRequest } from "fastify";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db/client.ts";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./jwt.ts";
import { findApiTokenUser } from "../lib/api-tokens.ts";

declare module "fastify" {
  interface FastifyRequest {
    session?: SessionPayload;
  }
}

// Chave de acesso (MCP do Claude): "Authorization: Bearer kl_...". Só vale pra conta
// de professora ativa; o papel e o e-mail vêm do banco, como na sessão por cookie.
function loadTokenSession(req: FastifyRequest, bearer: string) {
  // Senha, sessões e aparelhos (passkey) ficam fora do alcance da chave: se ela vazar,
  // não dá pra tomar a conta.
  const path = req.url.split("?")[0];
  if (path.startsWith("/api/auth/") || path.startsWith("/api/webauthn/")) return;
  const userId = findApiTokenUser(bearer);
  if (!userId) return;
  const user = db
    .select({
      email: schema.users.email,
      role: schema.users.role,
      archivedAt: schema.users.archivedAt,
      sessionVersion: schema.users.sessionVersion,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();
  if (!user || user.archivedAt || user.role !== "teacher") return;
  req.session = { userId, email: user.email, role: user.role, sessionVersion: user.sessionVersion, viaToken: true };
}

export async function loadSession(req: FastifyRequest) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    loadTokenSession(req, auth.slice("Bearer ".length).trim());
    return;
  }
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return;
  const session = await verifySession(token);
  if (!session) return;
  const user = db
    .select({
      email: schema.users.email,
      role: schema.users.role,
      archivedAt: schema.users.archivedAt,
      sessionVersion: schema.users.sessionVersion,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .get();
  // conta excluída/arquivada perde o acesso na hora, mesmo com sessão ainda válida
  if (!user || user.archivedAt) return;
  // senha trocada ou "sair de todos os aparelhos": sessões anteriores não valem mais
  if ((session.sessionVersion ?? 0) !== user.sessionVersion) return;
  // papel e e-mail sempre do banco, nunca só do que veio no cookie
  req.session = { userId: session.userId, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
}

/** Faz todas as sessões abertas desse usuário pararem de valer. */
export function revokeAllSessions(userId: string) {
  db.update(schema.users)
    .set({ sessionVersion: sql`${schema.users.sessionVersion} + 1` })
    .where(eq(schema.users.id, userId))
    .run();
}

export const ARCHIVED_MESSAGE = "Seu acesso ao portal foi encerrado. Se achar que é um engano, fale com a professora.";

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.session) {
    reply.code(401).send({ error: "auth_required", message: "Faça login para continuar." });
  }
}

export async function requireTeacher(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (req.session?.role !== "teacher") {
    reply.code(403).send({ error: "teacher_only", message: "Ação restrita à professora." });
  }
}

/** Professora logada de verdade (cookie) — uma chave de acesso não pode criar/apagar chaves. */
export async function requireTeacherLogin(req: FastifyRequest, reply: FastifyReply) {
  await requireTeacher(req, reply);
  if (reply.sent) return;
  if (req.session?.viaToken) {
    reply.code(403).send({ error: "login_required", message: "Essa ação só pode ser feita entrando no portal." });
  }
}
