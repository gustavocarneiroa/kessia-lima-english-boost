import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { corsOrigins, env } from "./env.ts";
import { loadSession } from "./auth/guards.ts";
import { identifyRoutes } from "./modules/identify/routes.ts";
import { authRoutes } from "./modules/auth/routes.ts";
import { studentRoutes } from "./modules/students/routes.ts";
import { webauthnRoutes } from "./modules/webauthn/routes.ts";

const app = Fastify({
  logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
  trustProxy: true,
});

await app.register(cors, { origin: corsOrigins, credentials: true });
await app.register(cookie);

app.addHook("onRequest", loadSession);

app.get("/health", async () => {
  return { status: "ok", env: env.NODE_ENV };
});

await app.register(identifyRoutes);
await app.register(authRoutes);
await app.register(studentRoutes);
await app.register(webauthnRoutes);

app.setErrorHandler((err: unknown, req, reply) => {
  req.log.error({ err }, "erro não tratado");
  const e = err as { statusCode?: number; message?: string };
  const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
  reply.code(status).send({
    error: "internal_error",
    message:
      status >= 500
        ? "Algo deu errado do nosso lado. Tente novamente em instantes."
        : (e.message ?? "Requisição inválida."),
  });
});

await app.listen({ port: env.PORT, host: env.HOST });
