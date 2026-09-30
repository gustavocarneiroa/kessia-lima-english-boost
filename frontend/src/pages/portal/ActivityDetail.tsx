import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Maximize2, Minimize2, Pencil, Trash2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import ActivityForm, { type ActivityFormPayload, type QuizItemDraft } from "./ActivityForm";

interface Question {
  prompt: string;
  options: string[];
  correctIndex?: number;
}

interface QuizItem {
  type: "choice" | "blank";
  prompt: string;
  options?: string[];
  correctIndex?: number;
}

// Enunciados do quiz podem ter várias linhas (texto de leitura + pergunta) e links
// de vídeo — mostra as quebras de linha e deixa os links clicáveis.
function PromptText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <span className="whitespace-pre-line">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-primary underline">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </span>
  );
}

function reconstructEmbedCode(src: string, height: number) {
  return `<iframe src="${src}" height="${height}" width="100%"></iframe>`;
}

interface Submission {
  answers: (number | string)[];
  score: number;
  total: number;
  correctAnswers?: (number | null)[];
  manualGrades?: Record<string, boolean>;
}

interface StudentResult {
  studentId: string;
  email: string;
  fullName?: string | null;
  score: number;
  total: number;
  submittedAt: string;
  answers?: (number | string)[];
  manualGrades?: Record<string, boolean>;
}

interface ActivityDetail {
  id: string;
  title: string;
  kind: "embed" | "listening" | "quiz";
  embedSrc?: string | null;
  embedHeight?: number;
  youtubeVideoId?: string | null;
  questions?: (Question | QuizItem)[];
  studentIds?: string[];
  results?: StudentResult[];
  mySubmission?: Submission | null;
}

interface Student {
  id: string;
  email: string;
  fullName?: string | null;
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = usePortalPrefs();
  const navigate = useNavigate();
  const isTeacher = user?.role === "teacher";
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [grading, setGrading] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<Submission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<ActivityDetail>(`/api/activities/${id}`);
      setActivity(data);
      setSelected(new Set(data.studentIds ?? []));
      if (data.mySubmission) {
        setResult(data.mySubmission);
        const initial: Record<number, number | string> = {};
        data.mySubmission.answers.forEach((a, i) => (initial[i] = a));
        setAnswers(initial);
      }
      if (isTeacher) setStudents(await api.get<Student[]>("/api/students"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível abrir a atividade.", "Couldn't open the activity."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function removeActivity() {
    if (!id) return;
    await api.delete(`/api/activities/${id}`);
    navigate("/portal/atividades");
  }

  async function saveStudents() {
    if (!id) return;
    await api.put(`/api/activities/${id}/students`, { studentIds: [...selected] });
  }

  async function saveEdit(payload: ActivityFormPayload) {
    if (!id) return;
    await api.put(`/api/activities/${id}`, payload);
    setEditing(false);
    await load();
  }

  async function submitAnswers() {
    if (!id || !activity?.questions) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const orderedAnswers = activity.questions.map((_, i) => answers[i]);
      const res = await api.post<Submission>(`/api/activities/${id}/submit`, { answers: orderedAnswers });
      setResult(res);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : t("Não foi possível enviar as respostas.", "Couldn't send your answers."));
    } finally {
      setSubmitting(false);
    }
  }

  async function gradeBlank(studentId: string, qi: number, correct: boolean) {
    if (!id) return;
    const key = `${studentId}-${qi}`;
    setGrading((prev) => new Set(prev).add(key));
    try {
      await api.put(`/api/activities/${id}/answers/${studentId}/grade`, { index: qi, correct });
      await load();
    } finally {
      setGrading((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return <p className="text-sm text-destructive">{error ?? t("Atividade não encontrada.", "Activity not found.")}</p>;
  }

  const allAnswered = activity.questions
    ? activity.questions.every((_, i) => answers[i] !== undefined && answers[i] !== "")
    : false;

  if (expanded && activity.kind === "embed") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
          <p className="truncate font-medium">{activity.title}</p>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setExpanded(false)}>
            <Minimize2 className="h-4 w-4" />
            {t("Sair da tela cheia", "Exit full screen")}
          </Button>
        </div>
        <iframe
          src={activity.embedSrc ?? undefined}
          className="flex-1"
          style={{ border: 0, width: "100%" }}
          title={activity.title}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/portal/atividades" className="text-sm text-muted-foreground hover:underline">
            ← {t("Todas as atividades", "All activities")}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{activity.title}</h1>
        </div>
        <div className="flex gap-2">
          {activity.kind === "embed" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setExpanded(true)}>
              <Maximize2 className="h-4 w-4" />
              {t("Tela cheia", "Full screen")}
            </Button>
          )}
          {isTeacher && !editing && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              {t("Editar", "Edit")}
            </Button>
          )}
          {isTeacher && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => void removeActivity()}>
              <Trash2 className="h-4 w-4" />
              {t("Apagar atividade", "Delete activity")}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Editar atividade", "Edit activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityForm
              lockKind={activity.kind}
              initial={
                activity.kind === "embed"
                  ? { title: activity.title, embedCode: reconstructEmbedCode(activity.embedSrc ?? "", activity.embedHeight ?? 500) }
                  : activity.kind === "quiz"
                    ? {
                        title: activity.title,
                        quizItems: (activity.questions as QuizItem[] | undefined)?.map(
                          (q): QuizItemDraft =>
                            q.type === "choice"
                              ? { type: "choice", prompt: q.prompt, options: q.options ?? ["", ""], correctIndex: q.correctIndex ?? 0 }
                              : { type: "blank", prompt: q.prompt },
                        ),
                      }
                    : {
                        title: activity.title,
                        youtubeUrl: `https://www.youtube.com/watch?v=${activity.youtubeVideoId}`,
                        questions: (activity.questions as Question[] | undefined)?.map((q) => ({
                          prompt: q.prompt,
                          options: q.options,
                          correctIndex: q.correctIndex ?? 0,
                        })),
                      }
              }
              submitLabel={t("Salvar alterações", "Save changes")}
              onSubmit={saveEdit}
              onCancel={() => setEditing(false)}
            />
          </CardContent>
        </Card>
      ) : activity.kind === "embed" ? (
        <Card>
          <CardContent className="p-0">
            <iframe
              src={activity.embedSrc ?? undefined}
              height={activity.embedHeight}
              width="100%"
              style={{ border: 0, display: "block" }}
              title={activity.title}
            />
          </CardContent>
        </Card>
      ) : activity.kind === "quiz" ? (
        <>
          {!isTeacher && activity.questions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Perguntas", "Questions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {result && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    {t("Nota (múltipla escolha):", "Score (multiple choice):")} <span className="font-semibold">{result.score}</span>{" "}
                    {t("de", "of")} {result.total}
                    {(activity.questions as QuizItem[]).some((q) => q.type === "blank") && (
                      <p className="mt-1 text-muted-foreground">
                        {t(
                          "As perguntas de completar são corrigidas pela professora depois.",
                          "Fill-in-the-blank questions are graded by your teacher later.",
                        )}
                      </p>
                    )}
                  </div>
                )}

                {(activity.questions as QuizItem[]).map((q, qi) => {
                  if (q.type === "choice") {
                    const correct = result?.correctAnswers?.[qi];
                    return (
                      <div key={qi} className="space-y-2">
                        <Label className="text-sm font-medium">
                          {qi + 1}. <PromptText text={q.prompt} />
                        </Label>
                        <RadioGroup
                          value={answers[qi] !== undefined ? String(answers[qi]) : undefined}
                          onValueChange={(v) => setAnswers((prev) => ({ ...prev, [qi]: Number(v) }))}
                          className="space-y-1"
                          disabled={!!result}
                        >
                          {q.options!.map((opt, oi) => {
                            const isCorrect = result && correct === oi;
                            const isWrongPick = result && correct !== oi && answers[qi] === oi;
                            return (
                              <div
                                key={oi}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-1",
                                  isCorrect && "bg-green-500/10 dark:bg-green-400/15",
                                  isWrongPick && "bg-destructive/10",
                                )}
                              >
                                <RadioGroupItem value={String(oi)} id={`quiz-ans-q${qi}-o${oi}`} />
                                <Label htmlFor={`quiz-ans-q${qi}-o${oi}`} className="flex-1 font-normal">
                                  {opt}
                                </Label>
                                {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                                {isWrongPick && <XCircle className="h-4 w-4 text-destructive" />}
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    );
                  }

                  const grade = result?.manualGrades?.[String(qi)];
                  return (
                    <div key={qi} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {qi + 1}. <PromptText text={q.prompt} />
                      </Label>
                      <Textarea
                        value={(answers[qi] as string) ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [qi]: e.target.value }))}
                        disabled={!!result}
                        placeholder={t("Sua resposta", "Your answer")}
                        rows={1}
                        className="min-h-10"
                      />
                      {result &&
                        (grade === undefined ? (
                          <p className="text-xs text-muted-foreground">
                            {t("Aguardando correção da professora.", "Waiting for your teacher to grade it.")}
                          </p>
                        ) : grade ? (
                          <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> {t("Certo", "Correct")}
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="h-3 w-3" /> {t("Errado", "Wrong")}
                          </p>
                        ))}
                    </div>
                  );
                })}

                {!result && (
                  <Button onClick={() => void submitAnswers()} disabled={!allAnswered || submitting} className="gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("Enviar respostas", "Submit answers")}
                  </Button>
                )}
                {result && (
                  <Button variant="outline" onClick={() => setResult(null)}>
                    {t("Tentar novamente", "Try again")}
                  </Button>
                )}
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              </CardContent>
            </Card>
          )}

          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Gabarito", "Answer key")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(activity.questions as QuizItem[] | undefined)?.map((q, qi) => (
                  <div key={qi} className="text-sm">
                    <p className="font-medium">
                      {qi + 1}. <PromptText text={q.prompt} />
                    </p>
                    <p className="text-muted-foreground">
                      {q.type === "choice"
                        ? `${t("Correta", "Correct")}: ${q.options?.[q.correctIndex ?? -1] ?? "—"}`
                        : t(
                            "Completar — você corrige depois que o aluno responder",
                            "Fill in the blank — you grade it after the student answers",
                          )}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isTeacher && (activity.results?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Respostas dos alunos", "Student answers")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.results!.map((r) => (
                  <div key={r.studentId} className="space-y-2 rounded-md border p-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{r.fullName || r.email}</span>
                      <span>
                        {r.score}/{r.total} ({t("múltipla escolha", "multiple choice")})
                      </span>
                    </div>
                    {(activity.questions as QuizItem[]).map((q, qi) => {
                      if (q.type !== "blank") return null;
                      const ans = r.answers?.[qi];
                      const gradeKey = `${r.studentId}-${qi}`;
                      const currentGrade = r.manualGrades?.[String(qi)];
                      return (
                        <div key={qi} className="rounded-md bg-muted/30 p-2 text-sm">
                          <p className="text-xs text-muted-foreground">
                            {qi + 1}. <PromptText text={q.prompt} />
                          </p>
                          <p className="whitespace-pre-line">{ans || <span className="italic text-muted-foreground">{t("(sem resposta)", "(no answer)")}</span>}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={currentGrade === true ? "default" : "outline"}
                              disabled={grading.has(gradeKey)}
                              onClick={() => void gradeBlank(r.studentId, qi, true)}
                            >
                              {t("Certo", "Correct")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={currentGrade === false ? "default" : "outline"}
                              disabled={grading.has(gradeKey)}
                              onClick={() => void gradeBlank(r.studentId, qi, false)}
                            >
                              {t("Errado", "Wrong")}
                            </Button>
                            {grading.has(gradeKey) && <Loader2 className="h-3 w-3 animate-spin" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${activity.youtubeVideoId}`}
                  className="h-full w-full"
                  style={{ border: 0 }}
                  title={activity.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>

          {!isTeacher && activity.questions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Perguntas", "Questions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {result && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    {t("Sua nota:", "Your score:")} <span className="font-semibold">{result.score}</span> {t("de", "of")}{" "}
                    {result.total}
                  </div>
                )}

                {(activity.questions as Question[]).map((q, qi) => {
                  const correct = result?.correctAnswers?.[qi];
                  return (
                    <div key={qi} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {qi + 1}. {q.prompt}
                      </Label>
                      <RadioGroup
                        value={answers[qi] !== undefined ? String(answers[qi]) : undefined}
                        onValueChange={(v) => setAnswers((prev) => ({ ...prev, [qi]: Number(v) }))}
                        className="space-y-1"
                        disabled={!!result}
                      >
                        {q.options.map((opt, oi) => {
                          const isCorrect = result && correct === oi;
                          const isWrongPick = result && correct !== oi && answers[qi] === oi;
                          return (
                            <div
                              key={oi}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1",
                                isCorrect && "bg-green-500/10 dark:bg-green-400/15",
                                isWrongPick && "bg-destructive/10",
                              )}
                            >
                              <RadioGroupItem value={String(oi)} id={`ans-q${qi}-o${oi}`} />
                              <Label htmlFor={`ans-q${qi}-o${oi}`} className="flex-1 font-normal">
                                {opt}
                              </Label>
                              {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                              {isWrongPick && <XCircle className="h-4 w-4 text-destructive" />}
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  );
                })}

                {!result && (
                  <Button onClick={() => void submitAnswers()} disabled={!allAnswered || submitting} className="gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("Enviar respostas", "Submit answers")}
                  </Button>
                )}
                {result && (
                  <Button variant="outline" onClick={() => setResult(null)}>
                    {t("Tentar novamente", "Try again")}
                  </Button>
                )}
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              </CardContent>
            </Card>
          )}

          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Gabarito", "Answer key")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(activity.questions as Question[] | undefined)?.map((q, qi) => (
                  <div key={qi} className="text-sm">
                    <p className="font-medium">
                      {qi + 1}. {q.prompt}
                    </p>
                    <p className="text-muted-foreground">
                      {t("Correta", "Correct")}: {q.options[q.correctIndex ?? -1] ?? "—"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isTeacher && (activity.results?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Resultados dos alunos", "Student results")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {activity.results!.map((r) => (
                    <li key={r.studentId} className="flex justify-between">
                      <span>{r.fullName || r.email}</span>
                      <span className="font-medium">
                        {r.score}/{r.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Enviar para alunos", "Send to students")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Cadastre alunos em Alunos primeiro.", "Add students under Students first.")}</p>
            ) : (
              <ul className="space-y-2">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v === true) next.add(s.id);
                        else next.delete(s.id);
                        setSelected(next);
                      }}
                    />
                    <span className="text-sm">{s.fullName || s.email}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" onClick={() => void saveStudents()}>
              {t("Salvar quem pode fazer", "Save who can do it")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
