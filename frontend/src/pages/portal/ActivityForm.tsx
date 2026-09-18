import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
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
  | { type: "blank"; prompt: string };

type StudentLevel = "beginner" | "intermediate" | "advanced";

const LEVEL_OPTIONS: { value: StudentLevel; label: string }[] = [
  { value: "beginner", label: "Iniciante" },
  { value: "intermediate", label: "Intermediário" },
  { value: "advanced", label: "Avançado" },
];

export function emptyQuestion(): QuestionDraft {
  return { prompt: "", options: ["", ""], correctIndex: 0 };
}

export function emptyQuizChoiceItem(): QuizItemDraft {
  return { type: "choice", prompt: "", options: ["", ""], correctIndex: 0 };
}

export function emptyQuizBlankItem(): QuizItemDraft {
  return { type: "blank", prompt: "" };
}

export type ActivityFormPayload =
  | { kind: "embed"; title: string; embedCode: string }
  | { kind: "listening"; title: string; youtubeUrl: string; questions: QuestionDraft[] }
  | { kind: "quiz"; title: string; questions: QuizItemDraft[] };

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

  function addQuizItem(type: "choice" | "blank") {
    setQuizItems((prev) => [...prev, type === "choice" ? emptyQuizChoiceItem() : emptyQuizBlankItem()]);
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
        count: 5,
      });
      setQuestions(res.questions.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctIndex })));
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : "Não foi possível gerar as perguntas.");
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
        await onSubmit({ kind: "quiz", title, questions: quizItems });
      } else {
        await onSubmit({ kind: "embed", title, embedCode });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar a atividade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {!lockKind && (
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={activityKind === "listening" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActivityKind("listening")}
          >
            <Headphones className="h-4 w-4" />
            Listening (vídeo + perguntas)
          </Button>
          <Button
            type="button"
            variant={activityKind === "quiz" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActivityKind("quiz")}
          >
            <PenLine className="h-4 w-4" />
            Feita por você (múltipla escolha / completar)
          </Button>
          <Button
            type="button"
            variant={activityKind === "embed" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActivityKind("embed")}
          >
            <Link2 className="h-4 w-4" />
            Link de incorporação
          </Button>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={activityKind === "listening" ? "ex.: Listening — Daily routine" : "ex.: Match — verbos"}
            required
          />
        </div>

        {activityKind === "listening" ? (
          <>
            <div className="space-y-1">
              <Label>Link do vídeo no YouTube</Label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>

            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <Label className="text-xs">Gerar perguntas automaticamente (opcional)</Label>
              <p className="text-xs text-muted-foreground">
                Cole abaixo a transcrição do vídeo — no YouTube, clique nos "···" abaixo do vídeo → "Mostrar
                transcrição" → selecione e copie o texto. A IA usa esse texto pra sugerir as perguntas. Você pode
                revisar e editar depois.
              </p>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Cole aqui a transcrição copiada do YouTube..."
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
                    {opt.label}
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
                Gerar perguntas automaticamente
              </Button>
              {generateError && (
                <p className="text-sm text-destructive">
                  {generateError}
                  {generateError.includes("Configurações") && (
                    <>
                      {" "}
                      <Link to="/portal/configuracoes" className="underline">
                        Ir para Configurações
                      </Link>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Perguntas</Label>
              {questions.map((q, qi) => (
                <Card key={qi} className="border-dashed">
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Pergunta {qi + 1}</Label>
                        <Textarea
                          value={q.prompt}
                          onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                          placeholder="ex.: What time does she wake up?"
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
                      <Label className="text-xs">Opções (marque a correta)</Label>
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
                              placeholder={`Opção ${oi + 1}`}
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
                          Adicionar opção
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addQuestion}>
                <Plus className="h-4 w-4" />
                Adicionar pergunta
              </Button>
            </div>
          </>
        ) : activityKind === "quiz" ? (
          <div className="space-y-3">
            <Label>Perguntas</Label>
            {quizItems.map((q, qi) => (
              <Card key={qi} className="border-dashed">
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Pergunta {qi + 1}</Label>
                      <Textarea
                        value={q.prompt}
                        onChange={(e) => updateQuizItem(qi, { prompt: e.target.value })}
                        placeholder={
                          q.type === "choice" ? "ex.: What is the past tense of 'go'?" : "ex.: She ___ to school every day. (go)"
                        }
                        rows={2}
                        required
                      />
                    </div>
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

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={q.type === "choice" ? "default" : "outline"}
                      onClick={() => updateQuizItem(qi, q.type === "choice" ? q : emptyQuizChoiceItem())}
                    >
                      Múltipla escolha
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={q.type === "blank" ? "default" : "outline"}
                      onClick={() => updateQuizItem(qi, q.type === "blank" ? q : emptyQuizBlankItem())}
                    >
                      Completar (resposta escrita)
                    </Button>
                  </div>

                  {q.type === "choice" ? (
                    <div className="space-y-2">
                      <Label className="text-xs">Opções (marque a correta)</Label>
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
                              placeholder={`Opção ${oi + 1}`}
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
                          Adicionar opção
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      O aluno vai digitar a resposta. Não tem correção automática — depois que ele responder, você
                      corrige essa pergunta como certa ou errada na tela da atividade.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addQuizItem("choice")}>
                <Plus className="h-4 w-4" />
                Adicionar múltipla escolha
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => addQuizItem("blank")}>
                <Plus className="h-4 w-4" />
                Adicionar completar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Label>Código de incorporação</Label>
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
              Cancelar
            </Button>
          )}
        </div>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );
}
