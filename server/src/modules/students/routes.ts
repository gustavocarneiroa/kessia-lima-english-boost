import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireTeacher } from "../../auth/guards.ts";
import { parsePagination } from "../../lib/pagination.ts";

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
  classWeekday: z
    .enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", ""])
    .optional()
    .nullable(),
  classTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .or(z.literal(""))
    .optional()
    .nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function studentRoutes(app: FastifyInstance) {
  app.get("/api/students", { preHandler: requireTeacher }, async (req) => {
    const base = db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        createdAt: schema.users.createdAt,
        passwordHash: schema.users.passwordHash,
        fullName: schema.studentProfiles.fullName,
      })
      .from(schema.users)
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.users.id))
      .where(eq(schema.users.role, "student"));

    const toPublic = (s: {
      id: string;
      email: string;
      createdAt: string;
      passwordHash: string | null;
      fullName: string | null;
    }) => ({
      id: s.id,
      email: s.email,
      fullName: s.fullName,
      createdAt: s.createdAt,
      hasLoggedIn: s.passwordHash !== null,
    });

    // Sem "page" na query: devolve a lista inteira (usado pelos seletores de aluno em
    // aulas/atividades/vocabulário). Com "page": pagina, usado pela tela de listagem.
    const query = req.query as Record<string, unknown>;
    if (query.page === undefined) {
      return base.orderBy(desc(schema.users.createdAt)).all().map(toPublic);
    }

    const { page, pageSize, offset } = parsePagination(query);
    const total = await db.$count(schema.users, eq(schema.users.role, "student"));
    const items = base.orderBy(desc(schema.users.createdAt)).limit(pageSize).offset(offset).all().map(toPublic);
    return { items, total, page, pageSize };
  });

  app.get("/api/students/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const student = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!student || student.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    }
    const profile = db
      .select({ fullName: schema.studentProfiles.fullName })
      .from(schema.studentProfiles)
      .where(eq(schema.studentProfiles.userId, id))
      .get();
    return {
      id: student.id,
      email: student.email,
      fullName: profile?.fullName ?? null,
      createdAt: student.createdAt,
      hasLoggedIn: student.passwordHash !== null,
    };
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
    db.delete(schema.lessons).where(eq(schema.lessons.studentId, id)).run();
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
      classWeekday: parsed.data.classWeekday || null,
      classTime: parsed.data.classTime || null,
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
