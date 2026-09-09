import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { hashPassword, verifyPassword } from "../../lib/password.ts";
import { signSession, sessionCookieOptions, SESSION_COOKIE } from "../../auth/jwt.ts";
import { requireAuth } from "../../auth/guards.ts";

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
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

    const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (!user) {
      return reply.code(404).send({
        error: "not_found",
        message: "E-mail não cadastrado. Peça para a professora te adicionar no portal.",
      });
    }

    let firstLogin = false;
    if (!user.passwordHash) {
      // Primeiro login: a senha enviada agora vira a senha da conta.
      firstLogin = true;
      const passwordHash = await hashPassword(password);
      db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, user.id)).run();
    } else {
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        return reply.code(401).send({ error: "invalid_credentials", message: "Senha incorreta." });
      }
    }

    const token = await signSession({ userId: user.id, email: user.email, role: user.role });
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions);
    return { email: user.email, role: user.role, firstLogin };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", { preHandler: requireAuth }, async (req) => {
    return { email: req.session!.email, role: req.session!.role };
  });
}
