import type { FastifyInstance } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { parsePagination } from "../../lib/pagination.ts";
import { env } from "../../env.ts";

const addStudentBody = z.object({
  email: z.string().email(),
});

const profileBody = z.object({
  fullName: z.string().trim().max(200).optional().nullable(),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .optional()
    .nullable(),
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
  installmentValue: z.string().trim().max(50).optional().nullable(),
  paymentDueDay: z
    .string()
    .trim()
    .regex(/^([1-9]|[12]\d|3[01])$/)
    .or(z.literal(""))
    .optional()
    .nullable(),
  contractStart: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .optional()
    .nullable(),
  contractEnd: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .optional()
    .nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function studentRoutes(app: FastifyInstance) {
  app.get("/api/birthdays/today", { preHandler: requireTeacher }, async () => {
    const rows = db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.studentProfiles.fullName,
        birthDate: schema.studentProfiles.birthDate,
      })
      .from(schema.studentProfiles)
      .innerJoin(schema.users, eq(schema.users.id, schema.studentProfiles.userId))
      .where(sql`strftime('%m-%d', ${schema.studentProfiles.birthDate}) = strftime('%m-%d', 'now')`)
      .all();

    return rows.map((r) => ({ id: r.id, email: r.email, fullName: r.fullName, birthDate: r.birthDate }));
  });

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
      .where(eq(schema.users.role, "student"))
      .orderBy(sql`coalesce(${schema.studentProfiles.fullName}, ${schema.users.email}) collate nocase`);

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
      return base.all().map(toPublic);
    }

    const { page, pageSize, offset } = parsePagination(query);
    const total = await db.$count(schema.users, eq(schema.users.role, "student"));
    const items = base.limit(pageSize).offset(offset).all().map(toPublic);
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
    db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, id)).run();
    db.delete(schema.studentProfiles).where(eq(schema.studentProfiles.userId, id)).run();
    db.delete(schema.vocabListStudents).where(eq(schema.vocabListStudents.studentId, id)).run();
    db.delete(schema.lessons).where(eq(schema.lessons.studentId, id)).run();
    db.delete(schema.users).where(eq(schema.users.id, id)).run();
    return reply.code(204).send();
  });

  app.post("/api/students/:id/reset-link", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const student = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!student || student.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    }

    // limpa links antigos ainda não usados desse aluno — só o mais recente vale
    db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.userId, id)).run();

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    db.insert(schema.passwordResetTokens)
      .values({ tokenHash, userId: id, expiresAt, createdAt: new Date().toISOString() })
      .run();

    const link = `${env.PUBLIC_WEB_ORIGIN}/redefinir-senha?token=${token}`;
    return { link, expiresAt };
  });

  app.get("/api/me/profile", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    if (session.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Sem perfil de aluno." });
    }

    const profile = db
      .select({
        fullName: schema.studentProfiles.fullName,
        phone: schema.studentProfiles.phone,
        occupation: schema.studentProfiles.occupation,
        englishLevel: schema.studentProfiles.englishLevel,
        interests: schema.studentProfiles.interests,
        learningGoals: schema.studentProfiles.learningGoals,
        classWeekday: schema.studentProfiles.classWeekday,
        classTime: schema.studentProfiles.classTime,
        installmentValue: schema.studentProfiles.installmentValue,
        paymentDueDay: schema.studentProfiles.paymentDueDay,
        contractStart: schema.studentProfiles.contractStart,
        contractEnd: schema.studentProfiles.contractEnd,
      })
      .from(schema.studentProfiles)
      .where(eq(schema.studentProfiles.userId, session.userId))
      .get();

    return profile ?? {};
  });

  app.get("/api/me/new-content", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    if (session.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Sem novidades." });
    }

    const student = db.select().from(schema.users).where(eq(schema.users.id, session.userId)).get();
    const since = student?.newContentSeenAt ?? "1970-01-01T00:00:00.000Z";

    const lessons = db
      .select({ id: schema.lessons.id, subject: schema.lessons.subject, scheduledAt: schema.lessons.scheduledAt })
      .from(schema.lessons)
      .where(and(eq(schema.lessons.studentId, session.userId), gt(schema.lessons.createdAt, since)))
      .all();

    const activities = db
      .select({ id: schema.activities.id, title: schema.activities.title })
      .from(schema.activityStudents)
      .innerJoin(schema.activities, eq(schema.activities.id, schema.activityStudents.activityId))
      .where(and(eq(schema.activityStudents.studentId, session.userId), gt(schema.activities.createdAt, since)))
      .all();

    return { lessons, activities };
  });

  app.post("/api/me/new-content/seen", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.session!;
    if (session.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Sem novidades." });
    }
    db.update(schema.users)
      .set({ newContentSeenAt: new Date().toISOString() })
      .where(eq(schema.users.id, session.userId))
      .run();
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
      birthDate: parsed.data.birthDate || null,
      phone: parsed.data.phone || null,
      occupation: parsed.data.occupation || null,
      englishLevel: parsed.data.englishLevel || null,
      interests: parsed.data.interests || null,
      learningGoals: parsed.data.learningGoals || null,
      classWeekday: parsed.data.classWeekday || null,
      classTime: parsed.data.classTime || null,
      installmentValue: parsed.data.installmentValue || null,
      paymentDueDay: parsed.data.paymentDueDay || null,
      contractStart: parsed.data.contractStart || null,
      contractEnd: parsed.data.contractEnd || null,
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
