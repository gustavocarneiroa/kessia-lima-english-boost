// Registro pedagógico da aula ("report de aula"). Valores repetidos de server/src/lib/lessonReport.ts.

type Label = [pt: string, en: string];

export const LESSON_STATUS_LABELS: Record<string, Label> = {
  given: ["Aula dada", "Lesson given"],
  makeup: ["Reposição", "Make-up lesson"],
  trial: ["Experimental", "Trial lesson"],
  cancelled_student_notice: ["Cancelada pelo aluno com antecedência", "Cancelled by student (with notice)"],
  cancelled_student_late: ["Cancelada pelo aluno sem antecedência", "Cancelled by student (late)"],
  cancelled_teacher: ["Cancelada pela professora", "Cancelled by teacher"],
  holiday: ["Feriado", "Holiday"],
  vacation: ["Férias", "Vacation"],
};
export const LESSON_STATUSES = Object.keys(LESSON_STATUS_LABELS);

/** Como o aluno vê o status (mais simples). */
export const STUDENT_STATUS_LABELS: Record<string, Label> = {
  given: ["Aula dada", "Lesson given"],
  makeup: ["Reposição", "Make-up lesson"],
  trial: ["Aula experimental", "Trial lesson"],
  cancelled_student_notice: ["Cancelada", "Cancelled"],
  cancelled_student_late: ["Cancelada", "Cancelled"],
  cancelled_teacher: ["Cancelada pela professora", "Cancelled by teacher"],
  holiday: ["Feriado", "Holiday"],
  vacation: ["Férias", "Vacation"],
};

export const REALIZED_STATUSES = ["given", "makeup", "trial"];
export const isRealized = (s: string) => REALIZED_STATUSES.includes(s);

export const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 60, label: "1:00" },
  { value: 90, label: "1:30" },
  { value: 120, label: "2:00" },
];

export const PUNCTUALITY_LABELS: Record<string, Label> = {
  on_time: ["Chegou no horário", "On time"],
  late: ["Entrou atrasado", "Late"],
};
export const HOMEWORK_LABELS: Record<string, Label> = {
  yes: ["Sim", "Yes"],
  no: ["Não", "No"],
  na: ["Não se aplica", "N/A"],
};
export const PARTICIPATION_LABELS: Record<string, Label> = {
  excellent: ["Excelente", "Excellent"],
  good: ["Boa", "Good"],
  average: ["Média", "Average"],
  poor: ["Ruim", "Poor"],
};
export const PORTUGUESE_LABELS: Record<string, Label> = {
  none: ["Nulo", "None"],
  little: ["Pouco", "A little"],
  medium: ["Médio", "Some"],
  lots: ["Muito", "A lot"],
};
export const SKILL_LABELS: Record<string, Label> = {
  speaking: ["Speaking", "Speaking"],
  listening: ["Listening", "Listening"],
  reading: ["Reading", "Reading"],
  writing: ["Writing", "Writing"],
  grammar: ["Grammar", "Grammar"],
  vocabulary: ["Vocabulary", "Vocabulary"],
};

export interface LessonReport {
  status: string;
  durationMinutes: number | null;
  punctuality?: string | null;
  homework?: string | null;
  participation?: string | null;
  portuguese?: string | null;
  skills: string[];
  material: string | null;
  materialLink: string | null;
  summary?: string | null;
  comments?: string | null;
  studentHomework: string | null;
  studentLinks: string | null;
  studentMessage: string | null;
  homeworkDone: boolean;
}

export type SignalLevel = "attention" | "alert";
export interface Signal {
  level: SignalLevel;
  label: Label;
}

/** Sinais pra listas: só o que merece atenção, pra não poluir. */
export function reportSignals(r: LessonReport): Signal[] {
  const out: Signal[] = [];
  if (r.punctuality === "late") out.push({ level: "attention", label: ["Atrasou", "Late"] });
  if (r.homework === "no") out.push({ level: "attention", label: ["Sem homework", "No homework"] });
  if (r.participation === "average") out.push({ level: "attention", label: ["Participação média", "Average participation"] });
  if (r.participation === "poor") out.push({ level: "alert", label: ["Participação ruim", "Poor participation"] });
  if (r.portuguese === "medium") out.push({ level: "attention", label: ["Metade em português", "Half in Portuguese"] });
  if (r.portuguese === "lots") out.push({ level: "alert", label: ["Muito português", "Lots of Portuguese"] });
  return out;
}

/** Placar das últimas aulas realizadas (até 8): "6 de 8 no horário" etc. */
export function reportScoreboard(reports: LessonReport[]) {
  const realized = reports.filter((r) => isRealized(r.status)).slice(0, 8);
  const withPunct = realized.filter((r) => r.punctuality);
  const withHw = realized.filter((r) => r.homework === "yes" || r.homework === "no");
  const engaged = realized.filter((r) => r.participation);
  return {
    count: realized.length,
    onTime: { yes: withPunct.filter((r) => r.punctuality === "on_time").length, of: withPunct.length },
    homework: { yes: withHw.filter((r) => r.homework === "yes").length, of: withHw.length },
    goodParticipation: {
      yes: engaged.filter((r) => r.participation === "excellent" || r.participation === "good").length,
      of: engaged.length,
    },
  };
}
