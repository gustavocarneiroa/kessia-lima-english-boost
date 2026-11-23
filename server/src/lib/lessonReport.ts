// Registro pedagógico de uma aula (o "report de aula"). Um por aula (que já é de um aluno só).
// As listas abaixo são repetidas em frontend/src/lib/lessonReport.ts (com os rótulos).
import { z } from "zod";

export const LESSON_STATUSES = [
  "given", // Aula dada
  "makeup", // Reposição
  "trial", // Experimental
  "cancelled_student_notice", // Cancelada pelo aluno com antecedência
  "cancelled_student_late", // Cancelada pelo aluno sem antecedência
  "cancelled_teacher", // Cancelada pela professora
  "holiday", // Feriado
  "vacation", // Férias
] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

/** Status que contam como aula realizada (relatório, contagem de horas). */
export const REALIZED_STATUSES: LessonStatus[] = ["given", "makeup", "trial"];
export const isRealized = (s: string) => (REALIZED_STATUSES as string[]).includes(s);

export const DURATIONS = [60, 90, 120] as const;
export const PUNCTUALITY = ["on_time", "late"] as const;
export const HOMEWORK = ["yes", "no", "na"] as const;
export const PARTICIPATION = ["excellent", "good", "average", "poor"] as const;
export const PORTUGUESE = ["none", "little", "medium", "lots"] as const;
export const SKILLS = ["speaking", "listening", "reading", "writing", "grammar", "vocabulary"] as const;

/**
 * Presença antiga (`lessons.attended`) que acompanha o status, pra calendário e reposições
 * continuarem funcionando: realizada = compareceu; cancelada pelo aluno = faltou; o resto (aula
 * que não aconteceu por causa da professora, feriado, férias) = sem presença.
 */
export function attendedFromStatus(status: LessonStatus): boolean | null {
  if (isRealized(status)) return true;
  if (status === "cancelled_student_notice" || status === "cancelled_student_late") return false;
  return null;
}

const text = (max: number) => z.string().trim().max(max).optional().nullable();

export const lessonReportBody = z.object({
  status: z.enum(LESSON_STATUSES),
  durationMinutes: z.number().int().refine((n) => (DURATIONS as readonly number[]).includes(n)).optional().nullable(),
  punctuality: z.enum(PUNCTUALITY).optional().nullable(),
  homework: z.enum(HOMEWORK).optional().nullable(),
  participation: z.enum(PARTICIPATION).optional().nullable(),
  portuguese: z.enum(PORTUGUESE).optional().nullable(),
  skills: z.array(z.enum(SKILLS)).max(SKILLS.length).optional().nullable(),
  material: text(500),
  materialLink: text(2000),
  summary: text(5000),
  comments: text(5000),
  studentHomework: text(3000),
  studentLinks: text(3000),
  studentMessage: text(3000),
});
export type LessonReportInput = z.infer<typeof lessonReportBody>;

/** Campos que só fazem sentido em aula realizada — zerados nos outros status. */
export function normalizeReport(input: LessonReportInput) {
  const realized = isRealized(input.status);
  const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    status: input.status,
    durationMinutes: realized ? input.durationMinutes ?? null : null,
    punctuality: realized ? input.punctuality ?? null : null,
    homework: realized ? input.homework ?? null : null,
    participation: realized ? input.participation ?? null : null,
    portuguese: realized ? input.portuguese ?? null : null,
    skills: realized && input.skills?.length ? JSON.stringify([...new Set(input.skills)]) : null,
    material: clean(input.material),
    materialLink: clean(input.materialLink),
    summary: clean(input.summary),
    comments: clean(input.comments),
    studentHomework: clean(input.studentHomework),
    studentLinks: clean(input.studentLinks),
    studentMessage: clean(input.studentMessage),
  };
}

type ReportRow = {
  lessonId: string;
  status: string;
  durationMinutes: number | null;
  punctuality: string | null;
  homework: string | null;
  participation: string | null;
  portuguese: string | null;
  skills: string | null;
  material: string | null;
  materialLink: string | null;
  summary: string | null;
  comments: string | null;
  studentHomework: string | null;
  studentLinks: string | null;
  studentMessage: string | null;
  homeworkDone: boolean;
  updatedAt: string;
};

function parseSkills(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Tudo — só pra professora. */
export function serializeReportForTeacher(r: ReportRow) {
  return {
    status: r.status,
    durationMinutes: r.durationMinutes,
    punctuality: r.punctuality,
    homework: r.homework,
    participation: r.participation,
    portuguese: r.portuguese,
    skills: parseSkills(r.skills),
    material: r.material,
    materialLink: r.materialLink,
    summary: r.summary,
    comments: r.comments,
    studentHomework: r.studentHomework,
    studentLinks: r.studentLinks,
    studentMessage: r.studentMessage,
    homeworkDone: r.homeworkDone,
    updatedAt: r.updatedAt,
  };
}

/**
 * O que o aluno pode ver. Sem resumo interno, comentários, presença, participação e uso do
 * português (isso só aparece pra ele no relatório do período, já com os rótulos amigáveis).
 */
export function serializeReportForStudent(r: ReportRow) {
  return {
    status: r.status,
    durationMinutes: r.durationMinutes,
    skills: parseSkills(r.skills),
    material: r.material,
    materialLink: r.materialLink,
    studentHomework: r.studentHomework,
    studentLinks: r.studentLinks,
    studentMessage: r.studentMessage,
    homeworkDone: r.homeworkDone,
  };
}
