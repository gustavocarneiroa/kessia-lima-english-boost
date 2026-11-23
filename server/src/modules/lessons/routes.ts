import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, isNull, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireAuth, requireTeacher } from "../../auth/guards.ts";
import { parsePagination } from "../../lib/pagination.ts";
import {
  attendedFromStatus,
  isRealized,
  lessonReportBody,
  normalizeReport,
  serializeReportForStudent,
  serializeReportForTeacher,
} from "../../lib/lessonReport.ts";

const lessonQuery = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  studentId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  attended: z.enum(["yes", "no", "pending"]).optional(),
  makeupScheduled: z.enum(["yes", "no"]).optional(),
});

const lessonBody = z.object({
  studentId: z.string().min(1),
  scheduledAt: z.string().min(1),
  subject: z.string().trim().min(1).max(200),
  classLink: z.string().trim().max(2000).optional().nullable(),
  activityLink: z.string().trim().max(2000).optional().nullable(),
  attended: z.boolean().optional().nullable(),
  makeupScheduled: z.boolean().optional(),
});

const lessonUpdateBody = lessonBody.partial().extend({
  studentId: z.string().min(1).optional(),
});

function serialize(lesson: typeof schema.lessons.$inferSelect) {
  return {
    id: lesson.id,
    studentId: lesson.studentId,
    scheduledAt: lesson.scheduledAt,
    subject: lesson.subject,
    classLink: lesson.classLink,
    activityLink: lesson.activityLink,
    attended: lesson.attended,
    makeupScheduled: lesson.makeupScheduled,
    createdAt: lesson.createdAt,
  };
}

export async function lessonRoutes(app: FastifyInstance) {
  app.get("/api/lessons", { preHandler: requireAuth }, async (req, reply) => {
    const { userId, role } = req.session!;
    const parsedQuery = lessonQuery.safeParse(req.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: "invalid_query", message: "Filtros inválidos." });
    }
    const q = parsedQuery.data;
    const { page, pageSize, offset } = parsePagination(req.query as Record<string, unknown>);

    const conditions: SQL[] = [];
    if (role === "teacher" && q.studentId) conditions.push(eq(schema.lessons.studentId, q.studentId));
    if (role !== "teacher") conditions.push(eq(schema.lessons.studentId, userId));
    if (q.from) conditions.push(gte(schema.lessons.scheduledAt, q.from));
    if (q.to) conditions.push(lte(schema.lessons.scheduledAt, q.to));
    if (q.attended === "yes") conditions.push(eq(schema.lessons.attended, true));
    else if (q.attended === "no") conditions.push(eq(schema.lessons.attended, false));
    else if (q.attended === "pending") conditions.push(isNull(schema.lessons.attended));
    if (q.makeupScheduled === "yes") conditions.push(eq(schema.lessons.makeupScheduled, true));
    else if (q.makeupScheduled === "no") conditions.push(eq(schema.lessons.makeupScheduled, false));

    const where = conditions.length ? and(...conditions) : undefined;

    const totalRow = db.select({ count: sql<number>`count(*)` }).from(schema.lessons).where(where).get();

    const rows = db
      .select({
        lesson: schema.lessons,
        report: schema.lessonReports,
        studentEmail: schema.users.email,
        studentName: schema.studentProfiles.fullName,
      })
      .from(schema.lessons)
      .leftJoin(schema.lessonReports, eq(schema.lessonReports.lessonId, schema.lessons.id))
      .leftJoin(schema.users, eq(schema.users.id, schema.lessons.studentId))
      .leftJoin(schema.studentProfiles, eq(schema.studentProfiles.userId, schema.lessons.studentId))
      .where(where)
      .orderBy(desc(schema.lessons.scheduledAt))
      .limit(pageSize)
      .offset(offset)
      .all();

    return {
      items: rows.map((r) => ({
        ...serialize(r.lesson),
        studentEmail: r.studentEmail,
        studentName: r.studentName,
        // Professora recebe o registro inteiro; aluno só a parte dele (sem resumo/comentários internos).
        report: r.report
          ? role === "teacher"
            ? serializeReportForTeacher(r.report)
            : serializeReportForStudent(r.report)
          : null,
      })),
      total: totalRow?.count ?? 0,
      page,
      pageSize,
    };
  });

  app.post("/api/lessons", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = lessonBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados da aula inválidos." });
    }

    const student = db.select().from(schema.users).where(eq(schema.users.id, parsed.data.studentId)).get();
    if (!student || student.role !== "student") {
      return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
    }

    const lesson = {
      id: crypto.randomUUID(),
      studentId: parsed.data.studentId,
      scheduledAt: parsed.data.scheduledAt,
      subject: parsed.data.subject,
      classLink: parsed.data.classLink || null,
      activityLink: parsed.data.activityLink || null,
      attended: parsed.data.attended ?? null,
      makeupScheduled: parsed.data.makeupScheduled ?? false,
      createdAt: new Date().toISOString(),
    };
    db.insert(schema.lessons).values(lesson).run();

    return reply.code(201).send(serialize(lesson));
  });

  app.put("/api/lessons/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Aula não encontrada." });
    }

    const parsed = lessonUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados da aula inválidos." });
    }

    if (parsed.data.studentId) {
      const student = db.select().from(schema.users).where(eq(schema.users.id, parsed.data.studentId)).get();
      if (!student || student.role !== "student") {
        return reply.code(404).send({ error: "not_found", message: "Aluno não encontrado." });
      }
    }

    const values = {
      studentId: parsed.data.studentId ?? existing.studentId,
      scheduledAt: parsed.data.scheduledAt ?? existing.scheduledAt,
      subject: parsed.data.subject ?? existing.subject,
      classLink: parsed.data.classLink !== undefined ? parsed.data.classLink || null : existing.classLink,
      activityLink:
        parsed.data.activityLink !== undefined ? parsed.data.activityLink || null : existing.activityLink,
      attended: parsed.data.attended !== undefined ? parsed.data.attended : existing.attended,
      makeupScheduled:
        parsed.data.makeupScheduled !== undefined ? parsed.data.makeupScheduled : existing.makeupScheduled,
    };

    db.transaction((tx) => {
      tx.update(schema.lessons).set(values).where(eq(schema.lessons.id, id)).run();
      if (values.studentId !== existing.studentId) {
        tx.update(schema.lessonReports)
          .set({ studentId: values.studentId })
          .where(eq(schema.lessonReports.lessonId, id))
          .run();
      }
    });

    return serialize({ ...existing, ...values });
  });

  app.delete("/api/lessons/:id", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).get();
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Aula não encontrada." });
    }

    db.transaction((tx) => {
      tx.delete(schema.lessonReports).where(eq(schema.lessonReports.lessonId, id)).run();
      tx.delete(schema.lessons).where(eq(schema.lessons.id, id)).run();
    });
    return reply.code(204).send();
  });

  // Registro da aula (report): cria ou substitui. A presença antiga (`attended`) acompanha o status.
  app.put("/api/lessons/:id/report", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const lesson = db.select().from(schema.lessons).where(eq(schema.lessons.id, id)).get();
    if (!lesson) {
      return reply.code(404).send({ error: "not_found", message: "Aula não encontrada." });
    }
    const parsed = lessonReportBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados do registro inválidos." });
    }
    if (isRealized(parsed.data.status) && new Date(lesson.scheduledAt).getTime() > Date.now()) {
      return reply.code(400).send({
        error: "future_lesson",
        message: "Essa aula ainda não aconteceu — dá pra registrar como dada só depois do horário dela.",
      });
    }

    const data = normalizeReport(parsed.data);
    const now = new Date().toISOString();
    const existing = db.select().from(schema.lessonReports).where(eq(schema.lessonReports.lessonId, id)).get();
    const attended = attendedFromStatus(parsed.data.status);

    db.transaction((tx) => {
      if (existing) {
        tx.update(schema.lessonReports)
          .set({ ...data, studentId: lesson.studentId, updatedAt: now })
          .where(eq(schema.lessonReports.lessonId, id))
          .run();
      } else {
        tx.insert(schema.lessonReports)
          .values({
            ...data,
            lessonId: id,
            studentId: lesson.studentId,
            homeworkDone: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
      tx.update(schema.lessons).set({ attended }).where(eq(schema.lessons.id, id)).run();
    });

    const saved = db.select().from(schema.lessonReports).where(eq(schema.lessonReports.lessonId, id)).get()!;
    return { lesson: serialize({ ...lesson, attended }), report: serializeReportForTeacher(saved) };
  });

  app.delete("/api/lessons/:id/report", { preHandler: requireTeacher }, async (req, reply) => {
    const { id } = req.params as { id: string };
    db.delete(schema.lessonReports).where(eq(schema.lessonReports.lessonId, id)).run();
    return reply.code(204).send();
  });

  // O aluno marca o homework daquela aula como feito (só a aula dele).
  app.post("/api/lessons/:id/homework-done", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { userId, role } = req.session!;
    const parsed = z.object({ done: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", message: "Dados inválidos." });
    }
    const report = db.select().from(schema.lessonReports).where(eq(schema.lessonReports.lessonId, id)).get();
    if (!report || (role !== "teacher" && report.studentId !== userId)) {
      return reply.code(404).send({ error: "not_found", message: "Aula não encontrada." });
    }
    db.update(schema.lessonReports)
      .set({ homeworkDone: parsed.data.done })
      .where(eq(schema.lessonReports.lessonId, id))
      .run();
    return { homeworkDone: parsed.data.done };
  });
}
