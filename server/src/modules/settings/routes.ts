import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireTeacher } from "../../auth/guards.ts";
import { clearOpenAiApiKey, getOpenAiApiKey, setOpenAiApiKey } from "../../lib/settings.ts";

const saveOpenAiKeyBody = z.object({
  apiKey: z.string().trim().min(20).max(300),
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
}
