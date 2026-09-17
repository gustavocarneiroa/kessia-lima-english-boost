import { z } from "zod";
import { getOpenAiApiKey } from "./settings.ts";

export type StudentLevel = "beginner" | "intermediate" | "advanced";

const LEVEL_LABEL: Record<StudentLevel, string> = {
  beginner: "iniciante (A1-A2)",
  intermediate: "intermediário (B1-B2)",
  advanced: "avançado (C1-C2)",
};

const generatedQuestionSchema = z.object({
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0),
});

const generatedResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export class ListeningAiError extends Error {}

export async function generateListeningQuestions(
  transcript: string,
  level: StudentLevel,
  count: number,
): Promise<GeneratedQuestion[]> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new ListeningAiError("Cadastre sua chave da OpenAI em Configurações antes de gerar perguntas automaticamente.");
  }

  // Transcrições longas custam mais tokens à toa — o essencial do conteúdo cabe bem nesse limite.
  const trimmedTranscript = transcript.slice(0, 12_000);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você cria exercícios de listening comprehension para alunos de inglês. " +
            "Responda sempre em JSON, no formato: " +
            '{"questions": [{"prompt": string, "options": string[2..4], "correctIndex": number}]}. ' +
            "As perguntas e opções devem estar em inglês. correctIndex é o índice (a partir de 0) da opção correta em options.",
        },
        {
          role: "user",
          content:
            `Crie ${count} perguntas de múltipla escolha sobre o conteúdo do vídeo abaixo (transcrição), ` +
            `apropriadas para um aluno de nível ${LEVEL_LABEL[level]}. ` +
            "Cada pergunta deve ter 4 opções (exceto quando não fizer sentido, aí use ao menos 2), sendo só uma correta. " +
            "Foque no que é dito no vídeo (fatos, ordem dos eventos, vocabulário usado), não em opinião.\n\n" +
            `Transcrição:\n"""\n${trimmedTranscript}\n"""`,
        },
      ],
    }),
  });

  if (res.status === 401) {
    throw new ListeningAiError("Sua chave da OpenAI foi recusada. Confira se ela está correta em Configurações.");
  }
  if (!res.ok) {
    throw new ListeningAiError("Não foi possível gerar as perguntas agora. Tente novamente em instantes.");
  }

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new ListeningAiError("A IA não devolveu nenhuma pergunta.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new ListeningAiError("A resposta da IA veio num formato inesperado.");
  }

  const parsed = generatedResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ListeningAiError("A resposta da IA veio num formato inesperado.");
  }

  return parsed.data.questions
    .filter((q) => q.correctIndex < q.options.length)
    .slice(0, count);
}
