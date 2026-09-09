import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getRoleFromEmail } from "../../lib/role.ts";

const identifyBody = z.object({
  email: z.string().email(),
});

export async function identifyRoutes(app: FastifyInstance) {
  app.post("/api/identify", async (req, reply) => {
    const parsed = identifyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_email" });
    }

    const { email } = parsed.data;
    return { email, role: getRoleFromEmail(email) };
  });
}
