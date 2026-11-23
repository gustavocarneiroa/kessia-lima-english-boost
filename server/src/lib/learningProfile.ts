import { z } from "zod";

// "Meu perfil de aprendizagem": questionário que o aluno preenche (objetivos, dificuldades,
// autoavaliação, uso do inglês, assuntos, como gosta de aprender). Os ids abaixo são
// repetidos em frontend/src/lib/learningProfile.ts (lá ficam os rótulos).
export const GOALS = ["work", "job_abroad", "travel", "live_abroad", "studies", "entertainment", "confidence"] as const;
export const DIFFICULTIES = [
  "speaking_fluency",
  "fast_speech",
  "meetings",
  "writing_work",
  "reading_technical",
  "vocabulary",
  "grammar",
  "pronunciation",
] as const;
export const SELF_SKILLS = ["speaking", "listening", "reading", "writing"] as const;
export const USAGE = ["never", "yearly", "monthly", "weekly", "daily"] as const;
export const TOPICS = [
  "tech",
  "business",
  "travel",
  "series",
  "music",
  "games",
  "sports",
  "food",
  "health",
  "science",
  "news",
  "culture",
] as const;
export const STYLES = ["conversation", "videos", "grammar_exercises", "reading", "games", "homework"] as const;
export const CORRECTION = ["immediate", "end", "no_preference"] as const;

const other = z.string().trim().max(500).optional().nullable();
const uniq = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .array(z.enum(values))
    .max(values.length)
    .transform((a) => [...new Set(a)]);

export const learningProfileBody = z.object({
  goals: uniq(GOALS),
  goalsOther: other,
  difficulties: uniq(DIFFICULTIES),
  difficultiesOther: other,
  selfRating: z.object({
    speaking: z.number().int().min(1).max(5).nullable().optional(),
    listening: z.number().int().min(1).max(5).nullable().optional(),
    reading: z.number().int().min(1).max(5).nullable().optional(),
    writing: z.number().int().min(1).max(5).nullable().optional(),
  }),
  usageWork: z.enum(USAGE).nullable().optional(),
  usageOutside: z.enum(USAGE).nullable().optional(),
  topics: uniq(TOPICS),
  topicsOther: other,
  styles: uniq(STYLES),
  correction: z.enum(CORRECTION).nullable().optional(),
  message: z.string().trim().max(2000).optional().nullable(),
});

export type LearningProfileAnswers = z.infer<typeof learningProfileBody>;

export function parseStoredAnswers(raw: string | null | undefined): LearningProfileAnswers | null {
  if (!raw) return null;
  try {
    const parsed = learningProfileBody.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
