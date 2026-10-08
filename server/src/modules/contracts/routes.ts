import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";

type ContractRow = typeof schema.studentContracts.$inferSelect;

function serialize(row: ContractRow) {
  return { id: row.id, studentId: row.studentId, quoteId: row.quoteId, data: JSON.parse(row.data), createdAt: row.createdAt };
}

export async function contractRoutes(app: FastifyInstance) {
  app.get("/api/students/:id/contracts", { preHandler: requireTeacher }, async (req) => {
    const { id } = req.params as { id: string };
    return db
      .select()
      .from(schema.studentContracts)
      .where(eq(schema.studentContracts.studentId, id))
      .orderBy(desc(schema.studentContracts.createdAt))
      .all()
      .map(serialize);
  });

  app.get("/api/me/contracts", { preHandler: requireAuth }, async (req) => {
    return db
      .select()
      .from(schema.studentContracts)
      .where(eq(schema.studentContracts.studentId, req.session!.userId))
      .orderBy(desc(schema.studentContracts.createdAt))
      .all()
      .map(serialize);
  });

  // A professora abre qualquer contrato; o aluno só os dele.
  app.get("/api/contracts/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { userId, role } = req.session!;
    const row = db.select().from(schema.studentContracts).where(eq(schema.studentContracts.id, id)).get();
    if (!row || (role !== "teacher" && row.studentId !== userId)) {
      return reply.code(404).send({ error: "not_found", message: "Contrato não encontrado." });
    }
    return serialize(row);
  });

  // Só o documento sai — aluno, cobranças e horários continuam como estão.
  app.delete("/api/contracts/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    db.delete(schema.studentContracts).where(eq(schema.studentContracts.id, id)).run();
    return reply.code(204).send();
  });
}
