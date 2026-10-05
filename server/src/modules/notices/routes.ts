import type { FastifyInstance } from "fastify";
import { desc, eq, gte, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { todayDateKey } from "../../lib/wordleWords.ts";

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "O link precisa começar com http:// ou https://");

const noticeBody = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(5000).optional().nullable(),
  linkUrl: z.union([httpUrl, z.literal("")]).optional().nullable(),
  important: z.boolean().optional().default(false),
  expiresOn: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
    .optional()
    .nullable(),
});

function parseNotice(body: unknown) {
  const parsed = noticeBody.safeParse(body);
  if (parsed.success) return { data: parsed.data };
  const linkIssue = parsed.error.issues.some((i) => i.path[0] === "linkUrl");
  return {
    message: linkIssue
      ? "O link não parece válido. Copie o endereço completo (começando com https://)."
      : "Preencha pelo menos o título.",
  };
}

function serializeNotice(n: typeof schema.notices.$inferSelect, today: string) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    linkUrl: n.linkUrl,
    important: n.important,
    expiresOn: n.expiresOn,
    expired: n.expiresOn !== null && n.expiresOn < today,
    createdAt: n.createdAt,
  };
}

export async function noticeRoutes(app: FastifyInstance) {
  // Aluno: só os avisos no ar. Professora: todos, inclusive os vencidos (marcados
  // com expired: true), pra poder reaproveitar ou apagar.
  app.get("/api/notices", { preHandler: requireAuth }, async (req) => {
    const { role } = req.session!;
    const today = todayDateKey();
    const where = role === "teacher" ? undefined : or(isNull(schema.notices.expiresOn), gte(schema.notices.expiresOn, today));
    const rows = db
      .select()
      .from(schema.notices)
      .where(where)
      .orderBy(desc(schema.notices.important), desc(schema.notices.createdAt))
      .all();
    return rows.map((n) => serializeNotice(n, today));
  });

  app.post("/api/notices", { preHandler: requireTeacher }, async (req, reply) => {
    const result = parseNotice(req.body);
    if (!result.data) return reply.code(400).send({ error: "invalid_body", message: result.message });
    const d = result.data;
    const notice = {
      id: crypto.randomUUID(),
      title: d.title,
      body: d.body || null,
      linkUrl: d.linkUrl || null,
      important: d.important,
      expiresOn: d.expiresOn || null,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.notices).values(notice).run();
    return reply.code(201).send(serializeNotice(notice, todayDateKey()));
  });

  app.put("/api/notices/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.notices).where(eq(schema.notices.id, id)).get();
    if (!existing) return reply.code(404).send({ error: "not_found", message: "Aviso não encontrado." });

    const result = parseNotice(req.body);
    if (!result.data) return reply.code(400).send({ error: "invalid_body", message: result.message });
    const d = result.data;
    const updated = {
      ...existing,
      title: d.title,
      body: d.body || null,
      linkUrl: d.linkUrl || null,
      important: d.important,
      expiresOn: d.expiresOn || null,
    };
    db.update(schema.notices).set(updated).where(eq(schema.notices.id, id)).run();
    return serializeNotice(updated, todayDateKey());
  });

  app.delete("/api/notices/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    db.delete(schema.notices).where(eq(schema.notices.id, id)).run();
    return reply.code(204).send();
  });
}
