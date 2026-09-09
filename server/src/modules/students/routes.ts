import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireTeacher } from "../../auth/guards.ts";

const addStudentBody = z.object({
  email: z.string().email(),
});

const profileBody = z.object({
  fullName: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  occupation: z.string().trim().max(200).optional().nullable(),
  englishLevel: z.string().trim().max(100).optional().nullable(),
  interests: z.string().trim().max(2000).optional().nullable(),
  learningGoals: z.string().trim().max(2000).optional().nullable(),
  schedulePreference: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function studentRoutes(app: FastifyInstance) {
  app.get("/api/students", { preHandler: requireTeacher }, async () => {
    const students = db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        createdAt: schema.users.createdAt,
        passwordHash: schema.users.passwordHash,
      })
      .from(schema.users)
      .where(eq(schema.users.role, "student"))
      .all();

    return students.map((s) => ({
      id: s.id,
      email: s.email,
      createdAt: s.createdAt,
      hasLoggedIn: s.passwordHash !== null,
    }));
  });

  app.post("/api/students", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = addStudentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_email", message: "E-mail inválido." });
    }

    const email = parsed.data.email.trim().toLowerCase();

    const existing = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (existing) {
      return reply.code(409).send({ error: "already_exists", message: "Esse e-mail já está cadastrado." });
    }

    const student = {
      id: crypto.randomUUID(),
      email,
      passwordHash: null,
      role: "student" as const,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.users).values(student).run();

    return reply.code(201).send({ id: student.id, email: student.email, createdAt: student.createdAt, hasLoggedIn: false });
  });

  app.delete("/api/students/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const student = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .get();

    if (!student || student.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    }

    db.delete(schema.credentials).where(eq(schema.credentials.userId, id)).run();
    db.delete(schema.studentProfiles).where(eq(schema.studentProfiles.userId, id)).run();
    db.delete(schema.vocabListStudents).where(eq(schema.vocabListStudents.studentId, id)).run();
    db.delete(schema.users).where(eq(schema.users.id, id)).run();
    return reply.code(204).send();
  });

  app.get("/api/students/:id/profile", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const student = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!student || student.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    }

    const profile = db
      .select()
      .from(schema.studentProfiles)
      .where(eq(schema.studentProfiles.userId, id))
      .get();

    return profile ?? { userId: id };
  });

  app.put("/api/students/:id/profile", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const student = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!student || student.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    }

    const parsed = profileBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados do perfil inválidos." });
    }

    const values = {
      userId: id,
      fullName: parsed.data.fullName || null,
      phone: parsed.data.phone || null,
      occupation: parsed.data.occupation || null,
      englishLevel: parsed.data.englishLevel || null,
      interests: parsed.data.interests || null,
      learningGoals: parsed.data.learningGoals || null,
      schedulePreference: parsed.data.schedulePreference || null,
      notes: parsed.data.notes || null,
      updatedAt: new Date().toISOString(),
    };

    db.insert(schema.studentProfiles)
      .values(values)
      .onConflictDoUpdate({ target: schema.studentProfiles.userId, set: values })
      .run();

    return values;
  });
}
