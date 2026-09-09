import type { FastifyReply, FastifyRequest } from "fastify";
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
  req.session = session;
}

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
