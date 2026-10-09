import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { env } from "../../env.ts";
import { hashPassword, verifyPassword } from "../../lib/password.ts";
import { MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT } from "../../lib/password-link.ts";
import { blockedFor, clearFailures, registerFailure, tooManyAttempts } from "../../lib/rate-limit.ts";
import { signSession, sessionCookieOptions, SESSION_COOKIE } from "../../auth/jwt.ts";
import { requireAuth, revokeAllSessions, ARCHIVED_MESSAGE } from "../../auth/guards.ts";

const loginBody = z.object({
  email: z.string().email(),
  // Sem mínimo aqui: quem criou a senha quando o mínimo era 6 continua entrando.
  password: z.string().min(1, "Digite sua senha.").max(200),
});

const resetPasswordBody = z.object({
  token: z.string().min(1),
  password: z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT).max(200),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_body",
        message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const { password } = parsed.data;

    const wait = Math.max(blockedFor("email", email), blockedFor("ip", req.ip));
    if (wait > 0) return reply.code(429).send(tooManyAttempts(wait));

    const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (!user) {
      registerFailure("ip", req.ip);
      return reply.code(404).send({
        error: "not_found",
        message: "E-mail não cadastrado. Peça para a professora te adicionar no portal.",
      });
    }
    if (user.archivedAt) {
      return reply.code(403).send({ error: "archived", message: ARCHIVED_MESSAGE });
    }

    let firstLogin = false;
    if (!user.passwordHash) {
      // Só a professora admin ainda cria a senha no primeiro login (ela não tem quem
      // mande um convite pra ela). Aluno sem senha precisa do link de convite — senão
      // qualquer um que soubesse o e-mail dele poderia entrar antes e "pegar" a conta.
      if (user.email !== env.ADMIN_EMAIL.toLowerCase()) {
        return reply.code(403).send({
          error: "invite_required",
          message:
            "Você ainda não criou sua senha. Use o link de convite que a professora te mandou (ou peça um novo pra ela).",
        });
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        return reply.code(400).send({ error: "invalid_body", message: PASSWORD_TOO_SHORT });
      }
      firstLogin = true;
      const passwordHash = await hashPassword(password);
      db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, user.id)).run();
    } else {
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        registerFailure("email", email);
        registerFailure("ip", req.ip);
        return reply.code(401).send({ error: "invalid_credentials", message: "Senha incorreta." });
      }
    }

    clearFailures("email", email);
    const token = await signSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
    });
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions);
    return { email: user.email, role: user.role, firstLogin };
  });

  app.post("/api/auth/reset-password", async (req, reply) => {
    const parsed = resetPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_body",
        message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      });
    }

    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const record = db
      .select()
      .from(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.tokenHash, tokenHash))
      .get();

    if (!record || record.expiresAt < new Date().toISOString()) {
      if (record) db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.tokenHash, tokenHash)).run();
      return reply.code(400).send({
        error: "invalid_token",
        message: "Esse link expirou ou já foi usado. Peça um novo link para a professora.",
      });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, record.userId)).run();
    db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.tokenHash, tokenHash)).run();
    // senha nova: quem estava logado com a senha antiga (em qualquer aparelho) é desconectado
    revokeAllSessions(record.userId);
    const user = db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, record.userId)).get();
    if (user) clearFailures("email", user.email);

    return { ok: true };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  // "Sair de todos os aparelhos": derruba todas as sessões, inclusive esta.
  app.post("/api/auth/logout-all", { preHandler: requireAuth }, async (req, reply) => {
    revokeAllSessions(req.session!.userId);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", { preHandler: requireAuth }, async (req) => {
    return { email: req.session!.email, role: req.session!.role };
  });
}
