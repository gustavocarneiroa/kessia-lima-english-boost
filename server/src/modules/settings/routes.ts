import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { requireTeacher, requireTeacherLogin } from "../../auth/guards.ts";
import { db, schema } from "../../db/client.ts";
import { createApiToken } from "../../lib/api-tokens.ts";
import { clearOpenAiApiKey, getOpenAiApiKey, setOpenAiApiKey } from "../../lib/settings.ts";
import { DEFAULT_PRICING, getPricing, pricingSchema, setPricing } from "../../lib/pricing.ts";
import { zapsignEnabled } from "../../lib/zapsign.ts";

const saveOpenAiKeyBody = z.object({
  apiKey: z.string().trim().min(20).max(300),
});

const createApiTokenBody = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function settingsRoutes(app: FastifyInstance) {
  // Nunca devolve o valor da chave — só se está configurada, pra confirmar visualmente.
  app.get("/api/settings/openai-key", { preHandler: requireTeacher }, async () => {
    return { configured: getOpenAiApiKey() !== null };
  });

  app.put("/api/settings/openai-key", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = saveOpenAiKeyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Cole uma chave de API válida." });
    }
    setOpenAiApiKey(parsed.data.apiKey);
    return { configured: true };
  });

  app.delete("/api/settings/openai-key", { preHandler: requireTeacher }, async () => {
    clearOpenAiApiKey();
    return { configured: false };
  });

  // O token do ZapSign fica só no servidor (variável de ambiente); a tela só precisa saber se está ligado.
  app.get("/api/settings/zapsign", { preHandler: requireTeacher }, async () => {
    return { enabled: zapsignEnabled() };
  });

  // Chaves de acesso do Claude (MCP). Listar/criar/apagar só entrando no portal de verdade.
  app.get("/api/settings/api-tokens", { preHandler: requireTeacherLogin }, async (req) => {
    const items = db
      .select({
        id: schema.apiTokens.id,
        name: schema.apiTokens.name,
        createdAt: schema.apiTokens.createdAt,
        lastUsedAt: schema.apiTokens.lastUsedAt,
      })
      .from(schema.apiTokens)
      .where(eq(schema.apiTokens.userId, req.session!.userId))
      .orderBy(desc(schema.apiTokens.createdAt))
      .all();
    return { items };
  });

  app.post("/api/settings/api-tokens", { preHandler: requireTeacherLogin }, async (req, reply) => {
    const parsed = createApiTokenBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dê um nome pra chave (ex.: Claude no meu computador)." });
    }
    const created = createApiToken(req.session!.userId, parsed.data.name);
    return reply.code(201).send(created);
  });

  app.delete("/api/settings/api-tokens/:id", { preHandler: requireTeacherLogin }, async (req) => {
    const { id } = req.params as { id: string };
    db.delete(schema.apiTokens)
      .where(and(eq(schema.apiTokens.id, id), eq(schema.apiTokens.userId, req.session!.userId)))
      .run();
    return { ok: true };
  });

  // Público: a landing page usa pra mostrar os preços dos planos.
  app.get("/api/pricing", async (_req, reply) => {
    reply.header("Cache-Control", "public, max-age=300");
    return { pricing: getPricing(), defaults: DEFAULT_PRICING };
  });

  app.put("/api/pricing", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = pricingSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_body",
        message: "Confira os valores: as horas precisam ser maiores que zero e os descontos entre 0 e 100%.",
      });
    }
    setPricing(parsed.data);
    return { pricing: parsed.data };
  });
}
