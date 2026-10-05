import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";

const SKILLS = ["grammar", "listening", "reading", "speaking", "vocabulary", "writing"] as const;

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "O link precisa começar com http:// ou https://");

const resourceBody = z.object({
  name: z.string().trim().min(1).max(200),
  url: httpUrl,
  skills: z.array(z.enum(SKILLS)).min(1),
  price: z.enum(["free", "freemium", "paid"]),
  recommended: z.boolean().optional().default(false),
  note: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
});

function parseResource(body: unknown) {
  const parsed = resourceBody.safeParse(body);
  if (parsed.success) return { data: parsed.data };
  const field = parsed.error.issues[0]?.path[0];
  return {
    message:
      field === "url"
        ? "O link não parece válido. Copie o endereço completo (começando com https://)."
        : field === "skills"
          ? "Escolha pelo menos uma habilidade."
          : "Preencha o nome, o link e o preço.",
  };
}

function serializeResource(r: typeof schema.practiceResources.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    url: r.url,
    skills: JSON.parse(r.skills) as string[],
    price: r.price,
    recommended: r.recommended,
    note: r.note,
    description: r.description,
  };
}

export async function practiceResourceRoutes(app: FastifyInstance) {
  app.get("/api/resources", { preHandler: requireAuth }, async () => {
    const rows = db.select().from(schema.practiceResources).orderBy(asc(schema.practiceResources.name)).all();
    return rows.map(serializeResource);
  });

  app.post("/api/resources", { preHandler: requireTeacher }, async (req, reply) => {
    const result = parseResource(req.body);
    if (!result.data) return reply.code(400).send({ error: "invalid_body", message: result.message });
    const d = result.data;
    const resource = {
      id: crypto.randomUUID(),
      name: d.name,
      url: d.url,
      skills: JSON.stringify(d.skills),
      price: d.price,
      recommended: d.recommended,
      note: d.note || null,
      description: d.description || null,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.practiceResources).values(resource).run();
    return reply.code(201).send(serializeResource(resource));
  });

  app.put("/api/resources/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.practiceResources).where(eq(schema.practiceResources.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "not_found", message: "Recurso não encontrado." });

    const result = parseResource(req.body);
    if (!result.data) return reply.code(400).send({ error: "invalid_body", message: result.message });
    const d = result.data;
    const updated = {
      ...existing,
      name: d.name,
      url: d.url,
      skills: JSON.stringify(d.skills),
      price: d.price,
      recommended: d.recommended,
      note: d.note || null,
      description: d.description || null,
    };
    db.update(schema.practiceResources).set(updated).where(eq(schema.practiceResources.id, id)).run();
    return serializeResource(updated);
  });

  app.delete("/api/resources/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    db.delete(schema.practiceResources).where(eq(schema.practiceResources.id, id)).run();
    return reply.code(204).send();
  });
}
