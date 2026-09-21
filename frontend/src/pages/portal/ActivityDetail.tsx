import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Maximize2, Minimize2, Pencil, Trash2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir a atividade.");
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
      setSubmitError(err instanceof ApiError ? err.message : "Não foi possível enviar as respostas.");
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
    return <p className="text-sm text-destructive">{error ?? "Atividade não encontrada."}</p>;
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
            Sair da tela cheia
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
            ← Todas as atividades
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{activity.title}</h1>
        </div>
        <div className="flex gap-2">
          {activity.kind === "embed" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setExpanded(true)}>
              <Maximize2 className="h-4 w-4" />
              Tela cheia
            </Button>
          )}
          {isTeacher && !editing && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
          {isTeacher && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => void removeActivity()}>
              <Trash2 className="h-4 w-4" />
              Apagar atividade
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editar atividade</CardTitle>
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
              submitLabel="Salvar alterações"
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
                <CardTitle className="text-base">Perguntas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {result && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    Nota (múltipla escolha): <span className="font-semibold">{result.score}</span> de {result.total}
                    {(activity.questions as QuizItem[]).some((q) => q.type === "blank") && (
                      <p className="mt-1 text-muted-foreground">
                        As perguntas de completar são corrigidas pela professora depois.
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
                          {qi + 1}. {q.prompt}
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
                                  isCorrect && "bg-green-500/10",
                                  isWrongPick && "bg-destructive/10",
                                )}
                              >
                                <RadioGroupItem value={String(oi)} id={`quiz-ans-q${qi}-o${oi}`} />
                                <Label htmlFor={`quiz-ans-q${qi}-o${oi}`} className="flex-1 font-normal">
                                  {opt}
                                </Label>
                                {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
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
                        {qi + 1}. {q.prompt}
                      </Label>
                      <Input
                        value={(answers[qi] as string) ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [qi]: e.target.value }))}
                        disabled={!!result}
                        placeholder="Sua resposta"
                      />
                      {result &&
                        (grade === undefined ? (
                          <p className="text-xs text-muted-foreground">Aguardando correção da professora.</p>
                        ) : grade ? (
                          <p className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> Certo
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="h-3 w-3" /> Errado
                          </p>
                        ))}
                    </div>
                  );
                })}

                {!result && (
                  <Button onClick={() => void submitAnswers()} disabled={!allAnswered || submitting} className="gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enviar respostas
                  </Button>
                )}
                {result && (
                  <Button variant="outline" onClick={() => setResult(null)}>
                    Tentar novamente
                  </Button>
                )}
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              </CardContent>
            </Card>
          )}

          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gabarito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(activity.questions as QuizItem[] | undefined)?.map((q, qi) => (
                  <div key={qi} className="text-sm">
                    <p className="font-medium">
                      {qi + 1}. {q.prompt}
                    </p>
                    <p className="text-muted-foreground">
                      {q.type === "choice"
                        ? `Correta: ${q.options?.[q.correctIndex ?? -1] ?? "—"}`
                        : "Completar — você corrige depois que o aluno responder"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isTeacher && (activity.results?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Respostas dos alunos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.results!.map((r) => (
                  <div key={r.studentId} className="space-y-2 rounded-md border p-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{r.fullName || r.email}</span>
                      <span>{r.score}/{r.total} (múltipla escolha)</span>
                    </div>
                    {(activity.questions as QuizItem[]).map((q, qi) => {
                      if (q.type !== "blank") return null;
                      const ans = r.answers?.[qi];
                      const gradeKey = `${r.studentId}-${qi}`;
                      const currentGrade = r.manualGrades?.[String(qi)];
                      return (
                        <div key={qi} className="rounded-md bg-muted/30 p-2 text-sm">
                          <p className="text-xs text-muted-foreground">
                            {qi + 1}. {q.prompt}
                          </p>
                          <p>{ans || <span className="italic text-muted-foreground">(sem resposta)</span>}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={currentGrade === true ? "default" : "outline"}
                              disabled={grading.has(gradeKey)}
                              onClick={() => void gradeBlank(r.studentId, qi, true)}
                            >
                              Certo
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={currentGrade === false ? "default" : "outline"}
                              disabled={grading.has(gradeKey)}
                              onClick={() => void gradeBlank(r.studentId, qi, false)}
                            >
                              Errado
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
                <CardTitle className="text-base">Perguntas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {result && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    Sua nota: <span className="font-semibold">{result.score}</span> de {result.total}
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
                                isCorrect && "bg-green-500/10",
                                isWrongPick && "bg-destructive/10",
                              )}
                            >
                              <RadioGroupItem value={String(oi)} id={`ans-q${qi}-o${oi}`} />
                              <Label htmlFor={`ans-q${qi}-o${oi}`} className="flex-1 font-normal">
                                {opt}
                              </Label>
                              {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
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
                    Enviar respostas
                  </Button>
                )}
                {result && (
                  <Button variant="outline" onClick={() => setResult(null)}>
                    Tentar novamente
                  </Button>
                )}
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              </CardContent>
            </Card>
          )}

          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gabarito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(activity.questions as Question[] | undefined)?.map((q, qi) => (
                  <div key={qi} className="text-sm">
                    <p className="font-medium">
                      {qi + 1}. {q.prompt}
                    </p>
                    <p className="text-muted-foreground">
                      Correta: {q.options[q.correctIndex ?? -1] ?? "—"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isTeacher && (activity.results?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultados dos alunos</CardTitle>
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
            <CardTitle className="text-base">Enviar para alunos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cadastre alunos em Alunos primeiro.</p>
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
              Salvar quem pode fazer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
