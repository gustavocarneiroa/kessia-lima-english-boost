import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { corsOrigins, env } from "./env.ts";
import { loadSession } from "./auth/guards.ts";
import { identifyRoutes } from "./modules/identify/routes.ts";
import { authRoutes } from "./modules/auth/routes.ts";
import { studentRoutes } from "./modules/students/routes.ts";
import { webauthnRoutes } from "./modules/webauthn/routes.ts";
import { vocabRoutes } from "./modules/vocab/routes.ts";
import { lessonRoutes } from "./modules/lessons/routes.ts";
import { activitiesRoutes } from "./modules/activities/routes.ts";
import { learningPathRoutes } from "./modules/learningPath/routes.ts";
import { settingsRoutes } from "./modules/settings/routes.ts";
import { wordleRoutes } from "./modules/wordle/routes.ts";
import { paymentRoutes } from "./modules/payments/routes.ts";
import { forumRoutes } from "./modules/forum/routes.ts";
import { noticeRoutes } from "./modules/notices/routes.ts";
import { practiceResourceRoutes } from "./modules/resources/routes.ts";
import { flashcardRoutes } from "./modules/flashcards/routes.ts";
import { quoteRoutes } from "./modules/quotes/routes.ts";
import { daysOffRoutes } from "./modules/daysOff/routes.ts";
import { contractRoutes } from "./modules/contracts/routes.ts";
import { startHolidaySync } from "./lib/holidays.ts";
import { ensureWebhook } from "./lib/zapsign.ts";

const app = Fastify({
  logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
  // Só confia no endereço repassado pelo nginx (que roda na mesma máquina). Com "true",
  // qualquer um podia inventar o próprio IP no cabeçalho e escapar do limite de tentativas.
  trustProxy: "loopback",
  bodyLimit: 8 * 1024 * 1024,
});

await app.register(cors, { origin: corsOrigins, credentials: true });
await app.register(cookie);

app.addHook("onRequest", loadSession);

// Cabeçalhos de proteção padrão: a API nunca é aberta dentro de outro site, o navegador
// não "adivinha" tipo de arquivo, e só se fala com ela por HTTPS.
app.addHook("onSend", async (_req, reply) => {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
  reply.header("Cross-Origin-Resource-Policy", "same-site");
  if (env.NODE_ENV === "production") {
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

app.get("/health", async () => {
  return { status: "ok", env: env.NODE_ENV };
});

await app.register(identifyRoutes);
await app.register(authRoutes);
await app.register(studentRoutes);
await app.register(webauthnRoutes);
await app.register(vocabRoutes);
await app.register(lessonRoutes);
await app.register(activitiesRoutes);
await app.register(learningPathRoutes);
await app.register(settingsRoutes);
await app.register(wordleRoutes);
await app.register(forumRoutes);
await app.register(paymentRoutes);
await app.register(noticeRoutes);
await app.register(practiceResourceRoutes);
await app.register(flashcardRoutes);
await app.register(quoteRoutes);
await app.register(daysOffRoutes);
await app.register(contractRoutes);

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

startHolidaySync(app.log);
void ensureWebhook(app.log);
