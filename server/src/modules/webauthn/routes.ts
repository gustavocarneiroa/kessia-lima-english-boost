import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { db, schema } from "../../db/client.ts";
import { env } from "../../env.ts";
import { requireAuth } from "../../auth/guards.ts";
import { signSession, sessionCookieOptions, SESSION_COOKIE } from "../../auth/jwt.ts";
import { saveChallenge, takeChallenge } from "../../lib/challenge-store.ts";

const RP_ID = env.WEBAUTHN_RP_ID;
const ORIGIN = env.PUBLIC_WEB_ORIGIN;

export async function webauthnRoutes(app: FastifyInstance) {
  // ── Adicionar dispositivo (usuário já logado por senha) ──────────────────
  app.get("/api/webauthn/register-options", { preHandler: requireAuth }, async (req) => {
    const { userId, email } = req.session!;

    const existingCredentials = db
      .select()
      .from(schema.credentials)
      .where(eq(schema.credentials.userId, userId))
      .all();

    const options = await generateRegistrationOptions({
      rpName: env.WEBAUTHN_RP_NAME,
      rpID: RP_ID,
      userName: email,
      userID: new TextEncoder().encode(userId),
      attestationType: "none",
      excludeCredentials: existingCredentials.map((c) => ({ id: c.id })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });

    saveChallenge(`reg:${userId}`, options.challenge);
    return options;
  });

  app.post("/api/webauthn/register-verify", { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = req.session!;
    const body = req.body as { response: unknown; deviceName?: string };

    const expectedChallenge = takeChallenge(`reg:${userId}`);
    if (!expectedChallenge) {
      return reply.code(400).send({ error: "challenge_expired", message: "Sessão de registro expirou, tente de novo." });
    }

    try {
      const verification = await verifyRegistrationResponse({
        // biome-ignore lint: formato validado pela lib
        response: body.response as any,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return reply.code(400).send({ error: "verification_failed", message: "Não foi possível confirmar o dispositivo." });
      }

      const { credential } = verification.registrationInfo;
      db.insert(schema.credentials)
        .values({
          id: credential.id,
          userId,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: credential.counter,
          deviceName: body.deviceName ?? null,
          createdAt: new Date().toISOString(),
        })
        .run();

      return { ok: true };
    } catch (err) {
      req.log.error({ err }, "falha ao verificar registro webauthn");
      return reply.code(400).send({ error: "verification_failed", message: "Não foi possível confirmar o dispositivo." });
    }
  });

  // ── Login com dispositivo (sem senha) ─────────────────────────────────────
  const loginOptionsBody = z.object({ email: z.string().email() });

  app.post("/api/webauthn/login-options", async (req, reply) => {
    const parsed = loginOptionsBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_email" });

    const email = parsed.data.email.trim().toLowerCase();
    const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (!user) return reply.code(404).send({ error: "not_found", message: "E-mail não cadastrado." });

    const userCredentials = db.select().from(schema.credentials).where(eq(schema.credentials.userId, user.id)).all();
    if (userCredentials.length === 0) {
      return reply.code(404).send({ error: "no_device", message: "Nenhum dispositivo cadastrado para esse e-mail." });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: "preferred",
      allowCredentials: userCredentials.map((c) => ({ id: c.id })),
    });

    saveChallenge(`auth:${email}`, options.challenge);
    return options;
  });

  const loginVerifyBody = z.object({ email: z.string().email(), response: z.any() });

  app.post("/api/webauthn/login-verify", async (req, reply) => {
    const parsed = loginVerifyBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });

    const email = parsed.data.email.trim().toLowerCase();
    const expectedChallenge = takeChallenge(`auth:${email}`);
    if (!expectedChallenge) {
      return reply.code(400).send({ error: "challenge_expired", message: "Sessão de login expirou, tente de novo." });
    }

    const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (!user) return reply.code(404).send({ error: "not_found" });

    const credentialId = (parsed.data.response as { id?: string }).id;
    const credential = credentialId
      ? db.select().from(schema.credentials).where(eq(schema.credentials.id, credentialId)).get()
      : undefined;

    if (!credential || credential.userId !== user.id) {
      return reply.code(404).send({ error: "unknown_device", message: "Dispositivo não reconhecido." });
    }

    try {
      const verification = await verifyAuthenticationResponse({
        // biome-ignore lint: formato validado pela lib
        response: parsed.data.response as any,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: credential.id,
          publicKey: Buffer.from(credential.publicKey, "base64url"),
          counter: credential.counter,
        },
      });

      if (!verification.verified) {
        return reply.code(401).send({ error: "verification_failed", message: "Não foi possível confirmar login." });
      }

      db.update(schema.credentials)
        .set({ counter: verification.authenticationInfo.newCounter })
        .where(eq(schema.credentials.id, credential.id))
        .run();

      const token = await signSession({ userId: user.id, email: user.email, role: user.role });
      reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions);
      return { email: user.email, role: user.role };
    } catch (err) {
      req.log.error({ err }, "falha ao verificar login webauthn");
      return reply.code(401).send({ error: "verification_failed", message: "Não foi possível confirmar login." });
    }
  });

  app.get("/api/webauthn/devices", { preHandler: requireAuth }, async (req) => {
    const { userId } = req.session!;
    const devices = db.select().from(schema.credentials).where(eq(schema.credentials.userId, userId)).all();
    return devices.map((d) => ({ id: d.id, deviceName: d.deviceName, createdAt: d.createdAt }));
  });
}
