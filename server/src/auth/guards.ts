import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.ts";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./jwt.ts";

declare module "fastify" {
  interface FastifyRequest {
    session?: SessionPayload;
  }
}

export async function loadSession(req: FastifyRequest) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return;
  const session = await verifySession(token);
  if (!session) return;
  if (session.role === "student") {
    // aluno arquivado (ou excluído) perde o acesso na hora, mesmo com sessão ainda válida
    const user = db
      .select({ archivedAt: schema.users.archivedAt })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .get();
    if (!user || user.archivedAt) return;
  }
  req.session = session;
}

export const ARCHIVED_MESSAGE = "Seu acesso ao portal foi encerrado. Se achar que é um engano, fale com a professora.";

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.session) {
    reply.code(401).send({ error: "auth_required", message: "Faça login para continuar." });
  }
}

export async function requireTeacher(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (req.session?.role !== "teacher") {
    reply.code(403).send({ error: "teacher_only", message: "Ação restrita à professora." });
  }
}
