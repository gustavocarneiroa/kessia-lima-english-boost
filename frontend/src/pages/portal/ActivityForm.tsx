import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Headphones, Link2, Sparkles, PenLine } from "lucide-react";

export interface QuestionDraft {
  prompt: string;
  options: string[];
  correctIndex: number;
}

interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
}

export type QuizItemDraft =
  | { type: "choice"; prompt: string; options: string[]; correctIndex: number }
  | { type: "blank"; prompt: string }
  | { type: "translate"; prompt: string; answer: string }
  // Banco de palavras no formulário: enunciado + palavras (um campo de texto só,
  // separadas por vírgula) + as frases pra completar. Ao salvar vira o quadro
  // { type: "wordbank", instruction, words, blanks } seguido de `blanks` perguntas "blank".
  | { type: "wordbank"; instruction: string; text: string; sentences: string[] };

type QuizItemType = QuizItemDraft["type"];

type QuizItemPayload =
  | Exclude<QuizItemDraft, { type: "wordbank" }>
  | { type: "wordbank"; instruction: string; words: string[]; blanks: number };

// Item como vem do servidor (atividade já salva).
export interface SavedQuizItem {
  type: "choice" | "blank" | "translate" | "wordbank";
  prompt?: string;
  options?: string[];
  correctIndex?: number;
  answer?: string;
  instruction?: string;
  words?: string[];
  blanks?: number;
}

const DEFAULT_WORDBANK_INSTRUCTION = "Complete the sentences with the words from the box.";

function parseWordBank(text: string): string[] {
  return text
    .split(/[,·\n]/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function quizItemsPayload(drafts: QuizItemDraft[]): QuizItemPayload[] {
  return drafts.flatMap((q): QuizItemPayload[] => {
    if (q.type !== "wordbank") return [q];
    const sentences = q.sentences.map((s) => s.trim()).filter(Boolean);
    return [
      { type: "wordbank", instruction: q.instruction.trim(), words: parseWordBank(q.text), blanks: sentences.length },
      ...sentences.map((prompt) => ({ type: "blank" as const, prompt })),
    ];
  });
}

// Caminho inverso pra editar: as `blanks` perguntas logo depois do quadro voltam pra dentro dele.
export function quizDraftsFromSaved(items: SavedQuizItem[]): QuizItemDraft[] {
  const drafts: QuizItemDraft[] = [];
  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    if (q.type === "wordbank") {
      const sentences: string[] = [];
      while (sentences.length < (q.blanks ?? 0) && items[i + 1]?.type === "blank") {
        sentences.push(items[++i].prompt ?? "");
      }
      drafts.push({ type: "wordbank", instruction: q.instruction ?? "", text: (q.words ?? []).join(", "), sentences });
    } else if (q.type === "choice") {
      drafts.push({ type: "choice", prompt: q.prompt ?? "", options: q.options ?? ["", ""], correctIndex: q.correctIndex ?? 0 });
    } else if (q.type === "translate") {
      drafts.push({ type: "translate", prompt: q.prompt ?? "", answer: q.answer ?? "" });
    } else {
      drafts.push({ type: "blank", prompt: q.prompt ?? "" });
    }
  }
  return drafts;
}

// Número da primeira pergunta de cada item no formulário — o quadro do banco de
// palavras ocupa um número por frase.
function draftQuestionNumbers(drafts: QuizItemDraft[]): number[] {
  let n = 1;
  return drafts.map((q) => {
    const first = n;
    n += q.type === "wordbank" ? q.sentences.length : 1;
    return first;
  });
}

type StudentLevel = "beginner" | "intermediate" | "advanced";

const LEVEL_OPTIONS: { value: StudentLevel; label: [pt: string, en: string] }[] = [
  { value: "beginner", label: ["Iniciante", "Beginner"] },
  { value: "intermediate", label: ["Intermediário", "Intermediate"] },
  { value: "advanced", label: ["Avançado", "Advanced"] },
];

const QUIZ_TYPE_OPTIONS: { value: QuizItemType; label: [pt: string, en: string] }[] = [
  { value: "choice", label: ["Múltipla escolha", "Multiple choice"] },
  { value: "blank", label: ["Completar (resposta escrita)", "Fill in the blank (written answer)"] },
  { value: "translate", label: ["Traduzir para o inglês", "Translate into English"] },
  { value: "wordbank", label: ["Banco de palavras", "Word bank"] },
];

// Número da pergunta na tela — o banco de palavras não é pergunta, então não conta.
export function quizQuestionNumber(items: { type: string }[], index: number): number {
  return items.slice(0, index + 1).filter((q) => q.type !== "wordbank").length;
}

export function emptyQuestion(): QuestionDraft {
  return { prompt: "", options: ["", ""], correctIndex: 0 };
}

export function emptyQuizChoiceItem(): QuizItemDraft {
  return { type: "choice", prompt: "", options: ["", ""], correctIndex: 0 };
}

export function emptyQuizBlankItem(): QuizItemDraft {
  return { type: "blank", prompt: "" };
}

function emptyQuizItem(type: QuizItemType): QuizItemDraft {
  if (type === "choice") return emptyQuizChoiceItem();
  if (type === "translate") return { type: "translate", prompt: "", answer: "" };
  if (type === "wordbank") return { type: "wordbank", instruction: DEFAULT_WORDBANK_INSTRUCTION, text: "", sentences: ["", ""] };
  return emptyQuizBlankItem();
}

export type ActivityFormPayload =
  | { kind: "embed"; title: string; embedCode: string }
  | { kind: "listening"; title: string; youtubeUrl: string; questions: QuestionDraft[] }
  | { kind: "quiz"; title: string; questions: QuizItemPayload[] };

interface ActivityFormProps {
  lockKind?: "embed" | "listening" | "quiz";
  initial?: {
    title: string;
    embedCode?: string;
    youtubeUrl?: string;
    questions?: QuestionDraft[];
    quizItems?: QuizItemDraft[];
  };
  submitLabel: string;
  onSubmit: (payload: ActivityFormPayload) => Promise<void>;
  onCancel?: () => void;
}

export default function ActivityForm({ lockKind, initial, submitLabel, onSubmit, onCancel }: ActivityFormProps) {
  const { t } = usePortalPrefs();
  const [activityKind, setActivityKind] = useState<"embed" | "listening" | "quiz">(lockKind ?? "listening");

  const [title, setTitle] = useState(initial?.title ?? "");
  const [embedCode, setEmbedCode] = useState(initial?.embedCode ?? "");

  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(initial?.questions ?? [emptyQuestion()]);
  const [quizItems, setQuizItems] = useState<QuizItemDraft[]>(initial?.quizItems ?? [emptyQuizChoiceItem()]);
  const [transcript, setTranscript] = useState("");
  const [level, setLevel] = useState<StudentLevel>("intermediate");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateQuestion(qi: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }

  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q)),
    );
  }

  function addOption(qi: number) {
    setQuestions((prev) => prev.map((q, i) => (i === qi && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q)));
  }

  function removeOption(qi: number, oi: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi || q.options.length <= 2) return q;
        const options = q.options.filter((_, j) => j !== oi);
        const correctIndex = q.correctIndex >= options.length ? 0 : q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex;
        return { ...q, options, correctIndex };
      }),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(qi: number) {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== qi)));
  }

  function updateQuizItem(qi: number, patch: Partial<QuizItemDraft>) {
    setQuizItems((prev) => prev.map((q, i) => (i === qi ? ({ ...q, ...patch } as QuizItemDraft) : q)));
  }

  function updateQuizOption(qi: number, oi: number, value: string) {
    setQuizItems((prev) =>
      prev.map((q, i) => (i === qi && q.type === "choice" ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q)),
    );
  }

  function addQuizOption(qi: number) {
    setQuizItems((prev) =>
      prev.map((q, i) => (i === qi && q.type === "choice" && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q)),
    );
  }

  function removeQuizOption(qi: number, oi: number) {
    setQuizItems((prev) =>
      prev.map((q, i) => {
        if (i !== qi || q.type !== "choice" || q.options.length <= 2) return q;
        const options = q.options.filter((_, j) => j !== oi);
        const correctIndex = q.correctIndex >= options.length ? 0 : q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex;
        return { ...q, options, correctIndex };
      }),
    );
  }

  function addQuizItem(type: QuizItemType) {
    setQuizItems((prev) => [...prev, emptyQuizItem(type)]);
  }

  // Troca o tipo de uma pergunta mantendo o enunciado já digitado.
  function changeQuizItemType(qi: number, type: QuizItemType) {
    setQuizItems((prev) =>
      prev.map((q, i) => {
        if (i !== qi || q.type === type) return q;
        const next = emptyQuizItem(type);
        if ("prompt" in q && "prompt" in next) next.prompt = q.prompt;
        return next;
      }),
    );
  }

  function removeQuizItem(qi: number) {
    setQuizItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== qi)));
  }

  async function generateQuestions() {
    setGenerateError(null);
    setGenerating(true);
    try {
      const res = await api.post<{ questions: GeneratedQuestion[] }>("/api/activities/generate-questions", {
        transcript,
        level,
        count: 10,
      });
      setQuestions(res.questions.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctIndex })));
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : t("Não foi possível gerar as perguntas.", "Couldn't generate the questions."));
    } finally {
      setGenerating(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (activityKind === "listening") {
        await onSubmit({
          kind: "listening",
          title,
          youtubeUrl,
          questions: questions.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctIndex })),
        });
      } else if (activityKind === "quiz") {
        await onSubmit({ kind: "quiz", title, questions: quizItemsPayload(quizItems) });
      } else {
        await onSubmit({ kind: "embed", title, embedCode });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível salvar a atividade.", "Couldn't save the activity."));
    } finally {
      setSaving(false);
    }
  }

  const questionNumbers = draftQuestionNumbers(quizItems);

  return (
    <>
      {!lockKind && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={activityKind === "listening" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActivityKind("listening")}
          >
            <Headphones className="h-4 w-4" />
            {t("Listening (vídeo + perguntas)", "Listening (video + questions)")}
          </Button>
          <Button
            type="button"
            variant={activityKind === "quiz" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActivityKind("quiz")}
          >
            <PenLine className="h-4 w-4" />
            {t("Feita por você (múltipla escolha / completar / tradução)", "Made by you (multiple choice / fill in the blank / translation)")}
          </Button>
          <Button
            type="button"
            variant={activityKind === "embed" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActivityKind("embed")}
          >
            <Link2 className="h-4 w-4" />
            {t("Link de incorporação", "Embed link")}
          </Button>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <Label>{t("Título", "Title")}</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              activityKind === "listening"
                ? t("ex.: Listening — Daily routine", "e.g. Listening — Daily routine")
                : t("ex.: Match — verbos", "e.g. Match — verbs")
            }
            required
          />
        </div>

        {activityKind === "listening" ? (
          <>
            <div className="space-y-1">
              <Label>{t("Link do vídeo no YouTube", "YouTube video link")}</Label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>

            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <Label className="text-xs">{t("Gerar perguntas automaticamente (opcional)", "Generate questions automatically (optional)")}</Label>
              <p className="text-xs text-muted-foreground">
                {t(
                  'Cole abaixo a transcrição do vídeo — no YouTube, clique nos "···" abaixo do vídeo → "Mostrar transcrição" → selecione e copie o texto. A IA usa esse texto pra sugerir as perguntas. Você pode revisar e editar depois.',
                  'Paste the video transcript below — on YouTube, click the "···" under the video → "Show transcript" → select and copy the text. The AI uses it to suggest questions. You can review and edit them afterwards.',
                )}
              </p>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t("Cole aqui a transcrição copiada do YouTube...", "Paste the transcript copied from YouTube here...")}
                rows={4}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {LEVEL_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={level === opt.value ? "default" : "outline"}
                    onClick={() => setLevel(opt.value)}
                  >
                    {t(...opt.label)}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 gap-2"
                disabled={transcript.trim().length < 20 || generating}
                onClick={() => void generateQuestions()}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t("Gerar perguntas automaticamente", "Generate questions automatically")}
              </Button>
              {generateError && (
                <p className="text-sm text-destructive">
                  {generateError}
                  {generateError.includes("Configurações") && (
                    <>
                      {" "}
                      <Link to="/portal/configuracoes" className="underline">
                        {t("Ir para Configurações", "Go to Settings")}
                      </Link>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>{t("Perguntas", "Questions")}</Label>
              {questions.map((q, qi) => (
                <Card key={qi} className="border-dashed">
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">{t("Pergunta", "Question")} {qi + 1}</Label>
                        <Textarea
                          value={q.prompt}
                          onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                          placeholder={t("ex.: What time does she wake up?", "e.g. What time does she wake up?")}
                          rows={2}
                          required
                        />
                      </div>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6 text-destructive"
                          onClick={() => removeQuestion(qi)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{t("Opções (marque a correta)", "Options (mark the correct one)")}</Label>
                      <RadioGroup
                        value={String(q.correctIndex)}
                        onValueChange={(v) => updateQuestion(qi, { correctIndex: Number(v) })}
                        className="space-y-2"
                      >
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <RadioGroupItem value={String(oi)} id={`q${qi}-o${oi}`} />
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              placeholder={`${t("Opção", "Option")} ${oi + 1}`}
                              required
                            />
                            {q.options.length > 2 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(qi, oi)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                      {q.options.length < 6 && (
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addOption(qi)}>
                          <Plus className="h-3 w-3" />
                          {t("Adicionar opção", "Add option")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addQuestion}>
                <Plus className="h-4 w-4" />
                {t("Adicionar pergunta", "Add question")}
              </Button>
            </div>
          </>
        ) : activityKind === "quiz" ? (
          <div className="space-y-3">
            <Label>{t("Perguntas", "Questions")}</Label>
            {quizItems.map((q, qi) => (
              <Card key={qi} className="border-dashed">
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start gap-2">
                    {q.type === "wordbank" ? (
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Enunciado", "Instructions")}</Label>
                          <Input
                            value={q.instruction}
                            onChange={(e) => updateQuizItem(qi, { instruction: e.target.value })}
                            placeholder={DEFAULT_WORDBANK_INSTRUCTION}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("Banco de palavras (separadas por vírgula)", "Word bank (comma-separated)")}</Label>
                          <Input
                            value={q.text}
                            onChange={(e) => updateQuizItem(qi, { text: e.target.value })}
                            placeholder={t("ex.: take, much, like, there, are", "e.g. take, much, like, there, are")}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{t("Frases para completar", "Sentences to complete")}</Label>
                          {q.sentences.map((s, si) => (
                            <div key={si} className="flex items-center gap-2">
                              <span className="w-6 shrink-0 text-right text-sm text-muted-foreground">{questionNumbers[qi] + si}.</span>
                              <Input
                                value={s}
                                onChange={(e) =>
                                  updateQuizItem(qi, { sentences: q.sentences.map((x, j) => (j === si ? e.target.value : x)) })
                                }
                                placeholder={t("ex.: Excuse me, I'd _____ to buy a T-shirt.", "e.g. Excuse me, I'd _____ to buy a T-shirt.")}
                                required
                              />
                              {q.sentences.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateQuizItem(qi, { sentences: q.sentences.filter((_, j) => j !== si) })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => updateQuizItem(qi, { sentences: [...q.sentences, ""] })}
                          >
                            <Plus className="h-3 w-3" />
                            {t("Adicionar frase", "Add sentence")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">
                          {t("Pergunta", "Question")} {questionNumbers[qi]}
                          {q.type === "translate" && ` — ${t("frase em português", "sentence in Portuguese")}`}
                        </Label>
                        <Textarea
                          value={q.prompt}
                          onChange={(e) => updateQuizItem(qi, { prompt: e.target.value })}
                          placeholder={
                            q.type === "choice"
                              ? t("ex.: What is the past tense of 'go'?", "e.g. What is the past tense of 'go'?")
                              : q.type === "translate"
                                ? t("ex.: Eu gostaria de comprar uma camiseta.", "e.g. Eu gostaria de comprar uma camiseta.")
                                : t("ex.: She ___ to school every day. (go)", "e.g. She ___ to school every day. (go)")
                          }
                          rows={2}
                          required
                        />
                      </div>
                    )}
                    {quizItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 text-destructive"
                        onClick={() => removeQuizItem(qi)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUIZ_TYPE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        size="sm"
                        variant={q.type === opt.value ? "default" : "outline"}
                        onClick={() => changeQuizItemType(qi, opt.value)}
                      >
                        {t(...opt.label)}
                      </Button>
                    ))}
                  </div>

                  {q.type === "wordbank" ? (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "O aluno vê o enunciado, o quadro com as palavras e as frases numeradas, cada uma com um espaço pra escrever. Use _____ para marcar o espaço na frase. Você corrige cada frase como certa ou errada na tela da atividade.",
                        "The student sees the instructions, the word box and the numbered sentences, each with a space to write. Use _____ to mark the gap. You mark each sentence right or wrong on the activity screen.",
                      )}
                    </p>
                  ) : q.type === "translate" ? (
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Sugestão de resposta em inglês (opcional)", "Suggested answer in English (optional)")}</Label>
                      <Input
                        value={q.answer}
                        onChange={(e) => updateQuizItem(qi, { answer: e.target.value })}
                        placeholder={t("ex.: I'd like to buy a T-shirt.", "e.g. I'd like to buy a T-shirt.")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "O aluno escreve a tradução em inglês e você corrige como certa ou errada na tela da atividade. A sugestão ajuda na hora de corrigir e o aluno só vê depois de enviar.",
                          "The student writes the translation in English and you mark it right or wrong on the activity screen. The suggestion helps you grade, and the student only sees it after submitting.",
                        )}
                      </p>
                    </div>
                  ) : q.type === "choice" ? (
                    <div className="space-y-2">
                      <Label className="text-xs">{t("Opções (marque a correta)", "Options (mark the correct one)")}</Label>
                      <RadioGroup
                        value={String(q.correctIndex)}
                        onValueChange={(v) => updateQuizItem(qi, { correctIndex: Number(v) })}
                        className="space-y-2"
                      >
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <RadioGroupItem value={String(oi)} id={`quiz-q${qi}-o${oi}`} />
                            <Input
                              value={opt}
                              onChange={(e) => updateQuizOption(qi, oi, e.target.value)}
                              placeholder={`${t("Opção", "Option")} ${oi + 1}`}
                              required
                            />
                            {q.options.length > 2 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeQuizOption(qi, oi)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                      {q.options.length < 6 && (
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addQuizOption(qi)}>
                          <Plus className="h-3 w-3" />
                          {t("Adicionar opção", "Add option")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "O aluno vai digitar a resposta. Não tem correção automática — depois que ele responder, você corrige essa pergunta como certa ou errada na tela da atividade.",
                        "The student types the answer. There's no automatic grading — once they answer, you mark this question right or wrong on the activity screen.",
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addQuizItem("choice")}>
                <Plus className="h-4 w-4" />
                {t("Adicionar múltipla escolha", "Add multiple choice")}
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addQuizItem("blank")}>
                <Plus className="h-4 w-4" />
                {t("Adicionar completar", "Add fill in the blank")}
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addQuizItem("translate")}>
                <Plus className="h-4 w-4" />
                {t("Adicionar tradução", "Add translation")}
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addQuizItem("wordbank")}>
                <Plus className="h-4 w-4" />
                {t("Adicionar banco de palavras", "Add word bank")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Label>{t("Código de incorporação", "Embed code")}</Label>
            <Textarea
              value={embedCode}
              onChange={(e) => setEmbedCode(e.target.value)}
              placeholder='<iframe src="https://..." height="500" width="100%"></iframe>'
              className="font-mono text-xs"
              rows={4}
              required
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              {t("Cancelar", "Cancel")}
            </Button>
          )}
        </div>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );
}
