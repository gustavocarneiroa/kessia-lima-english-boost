import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Headphones, Link2 } from "lucide-react";

interface Activity {
  id: string;
  title: string;
  kind: "embed" | "listening";
  createdAt: string;
}

interface QuestionDraft {
  prompt: string;
  options: string[];
  correctIndex: number;
}

function emptyQuestion(): QuestionDraft {
  return { prompt: "", options: ["", ""], correctIndex: 0 };
}

export default function Activities() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityKind, setActivityKind] = useState<"embed" | "listening">("listening");

  const [title, setTitle] = useState("");
  const [embedCode, setEmbedCode] = useState("");

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setActivities(await api.get<Activity[]>("/api/activities"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setTitle("");
    setEmbedCode("");
    setYoutubeUrl("");
    setQuestions([emptyQuestion()]);
  }

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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (activityKind === "listening") {
        await api.post("/api/activities", {
          kind: "listening",
          title,
          youtubeUrl,
          questions: questions.map((q) => ({
            prompt: q.prompt,
            options: q.options,
            correctIndex: q.correctIndex,
          })),
        });
      } else {
        await api.post("/api/activities", { kind: "embed", title, embedCode });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a atividade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atividades</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? "Crie um exercício de listening com um vídeo do YouTube, ou cole o código de um site (ex.: Quizlet)."
            : "Atividades que a professora enviou para você."}
        </p>
      </div>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova atividade</CardTitle>
            <CardDescription>Escolha o tipo de atividade.</CardDescription>
          </CardHeader>
          <CardContent>
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
                variant={activityKind === "embed" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setActivityKind("embed")}
              >
                <Link2 className="h-4 w-4" />
                Link de incorporação
              </Button>
            </div>

            <form onSubmit={create} className="space-y-4">
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
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeOption(qi, oi)}
                                    >
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

              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividades</CardTitle>
          <CardDescription>{activities.length} atividade(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isTeacher ? "Nenhuma atividade ainda." : "Nenhuma atividade foi enviada para você ainda."}
            </p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/portal/atividades/${a.id}`}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50"
                  >
                    {a.kind === "listening" ? (
                      <Headphones className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="font-medium">{a.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
