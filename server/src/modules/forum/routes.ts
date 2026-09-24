import type { FastifyInstance } from "fastify";
import { and, desc, asc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { parsePagination } from "../../lib/pagination.ts";

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "O link precisa começar com http:// ou https://");

const postBody = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(5000).optional().nullable(),
  linkUrl: z.union([httpUrl, z.literal("")]).optional().nullable(),
});

const commentBody = z.object({
  body: z.string().trim().min(1).max(2000),
});

type Author = { authorId: string; role: string | null; email: string | null; fullName: string | null };

// Aluno vê o nome (ou o começo do e-mail, se ainda não tem nome no perfil) — nunca
// o e-mail completo dos colegas.
function authorName(a: Author) {
  if (a.role === "teacher") return "Teacher Kessia";
  if (a.fullName?.trim()) return a.fullName.trim();
  return a.email?.split("@")[0] ?? "Aluno(a)";
}

const authorColumns = {
  role: schema.users.role,
  email: schema.users.email,
  fullName: schema.studentProfiles.fullName,
};

const commentCount = sql<number>`(select count(*) from forum_comments c where c.post_id = ${schema.forumPosts.id})`;

function selectPosts(where: SQL | undefined) {
  return db
    .select({ post: schema.forumPosts, ...authorColumns, commentCount })
    .from(schema.forumPosts)
    .leftJoin(schema.users, eq(schema.users.id, schema.forumPosts.authorId))
    .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.forumPosts.authorId))
    .where(where);
}

function serializePost(
  r: { post: typeof schema.forumPosts.$inferSelect; commentCount?: number } & Omit<Author, "authorId">,
  userId: string,
) {
  return {
    id: r.post.id,
    title: r.post.title,
    body: r.post.body,
    linkUrl: r.post.linkUrl,
    publishedAt: r.post.publishedAt,
    createdAt: r.post.createdAt,
    authorName: authorName({ authorId: r.post.authorId, role: r.role, email: r.email, fullName: r.fullName }),
    isMine: r.post.authorId === userId,
    commentCount: r.commentCount ?? 0,
  };
}

function deletePost(id: string) {
  db.delete(schema.forumComments).where(eq(schema.forumComments.postId, id)).run();
  db.delete(schema.forumPosts).where(eq(schema.forumPosts.id, id)).run();
}

// Usado ao excluir um aluno: some tudo que ele escreveu no fórum (e os comentários
// que outros fizeram nas publicações dele), senão o banco não deixa apagar o aluno.
export function deleteForumContentByAuthor(userId: string) {
  db.delete(schema.forumComments).where(eq(schema.forumComments.authorId, userId)).run();
  const posts = db
    .select({ id: schema.forumPosts.id })
    .from(schema.forumPosts)
    .where(eq(schema.forumPosts.authorId, userId))
    .all();
  if (posts.length) {
    const ids = posts.map((p) => p.id);
    db.delete(schema.forumComments).where(inArray(schema.forumComments.postId, ids)).run();
    db.delete(schema.forumPosts).where(inArray(schema.forumPosts.id, ids)).run();
  }
}

export async function forumRoutes(app: FastifyInstance) {
  app.get("/api/forum/posts", { preHandler: requireAuth }, async (req) => {
    const { userId } = req.session!;
    const { page, pageSize, offset } = parsePagination(req.query as Record<string, unknown>);
    const where = isNotNull(schema.forumPosts.publishedAt);

    const totalRow = db.select({ count: sql<number>`count(*)` }).from(schema.forumPosts).where(where).get();
    const rows = selectPosts(where).orderBy(desc(schema.forumPosts.publishedAt)).limit(pageSize).offset(offset).all();

    return {
      items: rows.map((r) => serializePost(r, userId)),
      total: totalRow?.count ?? 0,
      page,
      pageSize,
    };
  });

  // Professora: tudo que está esperando aprovação. Aluno: só as próprias.
  app.get("/api/forum/pending", { preHandler: requireAuth }, async (req) => {
    const { userId, role } = req.session!;
    const conditions: SQL[] = [isNull(schema.forumPosts.publishedAt)];
    if (role !== "teacher") conditions.push(eq(schema.forumPosts.authorId, userId));
    const rows = selectPosts(and(...conditions)).orderBy(asc(schema.forumPosts.createdAt)).all();
    return rows.map((r) => serializePost(r, userId));
  });

  app.get("/api/forum/posts/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { userId, role } = req.session!;
    const { id } = req.params as { id: string };

    const visible =
      role === "teacher"
        ? undefined
        : or(isNotNull(schema.forumPosts.publishedAt), eq(schema.forumPosts.authorId, userId));
    const row = selectPosts(and(eq(schema.forumPosts.id, id), visible)).get();
    if (!row) {
      return reply.code(404).send({ error: "not_found", message: "Publicação não encontrada." });
    }

    const comments = db
      .select({ comment: schema.forumComments, ...authorColumns })
      .from(schema.forumComments)
      .leftJoin(schema.users, eq(schema.users.id, schema.forumComments.authorId))
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.forumComments.authorId))
      .where(eq(schema.forumComments.postId, id))
      .orderBy(asc(schema.forumComments.createdAt))
      .all();

    return {
      ...serializePost(row, userId),
      comments: comments.map((c) => ({
        id: c.comment.id,
        body: c.comment.body,
        createdAt: c.comment.createdAt,
        authorName: authorName({ authorId: c.comment.authorId, role: c.role, email: c.email, fullName: c.fullName }),
        isMine: c.comment.authorId === userId,
      })),
    };
  });

  app.post("/api/forum/posts", { preHandler: requireAuth }, async (req, reply) => {
    const { userId, role } = req.session!;
    const parsed = postBody.safeParse(req.body);
    if (!parsed.success) {
      const linkIssue = parsed.error.issues.some((i) => i.path[0] === "linkUrl");
      return reply.code(400).send({
        error: "invalid_body",
        message: linkIssue ? "O link não parece válido. Copie o endereço completo (começando com https://)." : "Preencha pelo menos o título.",
      });
    }

    const now = new Date().toISOString();
    const post = {
      id: crypto.randomUUID(),
      authorId: userId,
      title: parsed.data.title,
      body: parsed.data.body || null,
      linkUrl: parsed.data.linkUrl || null,
      // Da professora sai publicado na hora; do aluno espera aprovação.
      publishedAt: role === "teacher" ? now : null,
      createdAt: now,
    };
    db.insert(schema.forumPosts).values(post).run();

    return reply.code(201).send({ id: post.id, publishedAt: post.publishedAt });
  });

  app.post("/api/forum/posts/:id/approve", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.forumPosts).where(eq(schema.forumPosts.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Publicação não encontrada." });
    }
    if (!existing.publishedAt) {
      db.update(schema.forumPosts)
        .set({ publishedAt: new Date().toISOString() })
        .where(eq(schema.forumPosts.id, id))
        .run();
    }
    return reply.code(204).send();
  });

  // Professora apaga qualquer publicação (inclusive recusar uma pendente); aluno só as próprias.
  app.delete("/api/forum/posts/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { userId, role } = req.session!;
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.forumPosts).where(eq(schema.forumPosts.id, id)).get();
    if (!existing || (role !== "teacher" && existing.authorId !== userId)) {
      return reply.code(404).send({ error: "not_found", message: "Publicação não encontrada." });
    }
    deletePost(id);
    return reply.code(204).send();
  });

  app.post("/api/forum/posts/:id/comments", { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = req.session!;
    const { id } = req.params as { id: string };
    const post = db.select().from(schema.forumPosts).where(eq(schema.forumPosts.id, id)).get();
    if (!post || !post.publishedAt) {
      return reply.code(404).send({ error: "not_found", message: "Publicação não encontrada." });
    }

    const parsed = commentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Escreva algo antes de enviar o comentário." });
    }

    const comment = {
      id: crypto.randomUUID(),
      postId: id,
      authorId: userId,
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.forumComments).values(comment).run();
    return reply.code(201).send({ id: comment.id });
  });

  app.delete("/api/forum/comments/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { userId, role } = req.session!;
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.forumComments).where(eq(schema.forumComments.id, id)).get();
    if (!existing || (role !== "teacher" && existing.authorId !== userId)) {
      return reply.code(404).send({ error: "not_found", message: "Comentário não encontrado." });
    }
    db.delete(schema.forumComments).where(eq(schema.forumComments.id, id)).run();
    return reply.code(204).send();
  });
}
