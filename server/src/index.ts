import Fastify from "fastify";
import cors from "@fastify/cors";
import { corsOrigins, env } from "./env.ts";
import { identifyRoutes } from "./modules/identify/routes.ts";

const app = Fastify({
  logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
  trustProxy: true,
});

await app.register(cors, { origin: corsOrigins, credentials: true });

app.get("/health", async () => {
  return { status: "ok", env: env.NODE_ENV };
});

await app.register(identifyRoutes);

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
