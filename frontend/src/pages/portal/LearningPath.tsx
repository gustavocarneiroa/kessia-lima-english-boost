import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, Headphones, FileText } from "lucide-react";

type Area = "grammar" | "vocabulary" | "communication";

interface Topic {
  id: string;
  title: string;
  level: string | null;
  area: Area | null;
  exerciseUrl: string | null;
  videoUrl: string | null;
  sortOrder: number;
  completed?: boolean;
}

interface Student {
  id: string;
  email: string;
}

const AREA_LABELS: Record<Area, string> = {
  grammar: "Gramática",
  vocabulary: "Vocabulário",
  communication: "Comunicação",
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

interface TopicFormState {
  title: string;
  level: string;
  area: Area | "";
  exerciseUrl: string;
  videoUrl: string;
}

const emptyForm: TopicFormState = { title: "", level: "", area: "", exerciseUrl: "", videoUrl: "" };

export default function LearningPath() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<TopicFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TopicFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load(studentId?: string) {
    setLoading(true);
    try {
      const qs = studentId ? `?studentId=${studentId}` : "";
      const res = await api.get<{ items: Topic[] }>(`/api/learning-topics${qs}`);
      setTopics(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(isTeacher ? selectedStudent || undefined : undefined);
    if (isTeacher) {
      void api.get<Student[]>("/api/students").then(setStudents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent]);

  const filtered = useMemo(() => {
    return topics.filter((t) => {
      if (levelFilter !== "all" && !(t.level ?? "").includes(levelFilter)) return false;
      if (areaFilter !== "all" && t.area !== areaFilter) return false;
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [topics, levelFilter, areaFilter, search]);

  async function toggleComplete(topic: Topic) {
    if (isTeacher && !selectedStudent) return;
    setTogglingId(topic.id);
    try {
      await api.put(`/api/learning-topics/${topic.id}/complete`, {
        completed: !topic.completed,
        ...(isTeacher ? { studentId: selectedStudent } : {}),
      });
      setTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, completed: !t.completed } : t)));
    } finally {
      setTogglingId(null);
    }
  }

  function payloadFrom(form: TopicFormState) {
    return {
      title: form.title,
      level: form.level.trim() || null,
      area: form.area || null,
      exerciseUrl: form.exerciseUrl.trim() || null,
      videoUrl: form.videoUrl.trim() || null,
    };
  }

  async function createTopic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/api/learning-topics", payloadFrom(createForm));
      setCreateForm(emptyForm);
      setCreating(false);
      await load(selectedStudent || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o tópico.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: Topic) {
    setEditingId(t.id);
    setEditForm({
      title: t.title,
      level: t.level ?? "",
      area: t.area ?? "",
      exerciseUrl: t.exerciseUrl ?? "",
      videoUrl: t.videoUrl ?? "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setSaving(true);
    try {
      await api.put(`/api/learning-topics/${editingId}`, payloadFrom(editForm));
      setEditingId(null);
      await load(selectedStudent || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTopic(id: string) {
    await api.delete(`/api/learning-topics/${id}`);
    await load(selectedStudent || undefined);
  }

  function renderTopicForm(form: TopicFormState, setForm: (f: TopicFormState) => void, onSubmit: (e: React.FormEvent) => void, onCancel: () => void, submitLabel: string) {
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label>Título</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="ex.: Present simple"
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nível</Label>
            <Input
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              placeholder="ex.: A1 ou A2, B1"
            />
          </div>
          <div className="space-y-1">
            <Label>Área</Label>
            <Select value={form.area || undefined} onValueChange={(v) => setForm({ ...form, area: v as Area })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grammar">Gramática</SelectItem>
                <SelectItem value="vocabulary">Vocabulário</SelectItem>
                <SelectItem value="communication">Comunicação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Link de exercício (opcional)</Label>
          <Input
            value={form.exerciseUrl}
            onChange={(e) => setForm({ ...form, exerciseUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1">
          <Label>Link de vídeo (opcional)</Label>
          <Input
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trilha de aprendizagem</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? "A lista de conteúdos que os alunos vão estudando, do básico ao avançado."
            : "Os conteúdos da sua jornada de inglês — marque o que você já estudou."}
        </p>
      </div>

      {isTeacher && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-4">
            <div className="space-y-1">
              <Label className="text-xs">Ver progresso de</Label>
              <Select value={selectedStudent || "none"} onValueChange={(v) => setSelectedStudent(v === "none" ? "" : v)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum aluno selecionado</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!selectedStudent && (
              <p className="text-xs text-muted-foreground">
                Selecione um aluno pra marcar o que ele já concluiu.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo tópico</CardTitle>
            <CardDescription>Adicione um conteúdo à trilha.</CardDescription>
          </CardHeader>
          <CardContent>
            {creating ? (
              renderTopicForm(createForm, setCreateForm, createTopic, () => setCreating(false), "Criar")
            ) : (
              <Button size="sm" className="gap-2" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Adicionar tópico
              </Button>
            )}
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conteúdos</CardTitle>
          <CardDescription>{filtered.length} de {topics.length} tópico(s)</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título..."
              className="w-56"
            />
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                <SelectItem value="grammar">Gramática</SelectItem>
                <SelectItem value="vocabulary">Vocabulário</SelectItem>
                <SelectItem value="communication">Comunicação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tópico encontrado.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => (
                <li key={t.id} className="rounded-md border p-3">
                  {editingId === t.id ? (
                    renderTopicForm(editForm, setEditForm, saveEdit, () => setEditingId(null), "Salvar")
                  ) : (
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={!!t.completed}
                        disabled={(isTeacher && !selectedStudent) || togglingId === t.id}
                        onCheckedChange={() => void toggleComplete(t)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium">{t.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {t.level && <Badge variant="secondary">{t.level}</Badge>}
                          {t.area && <Badge variant="outline">{AREA_LABELS[t.area]}</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 pt-1">
                          {t.exerciseUrl && (
                            <a
                              href={t.exerciseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                            >
                              <FileText className="h-3 w-3" /> Exercício
                            </a>
                          )}
                          {t.videoUrl && (
                            <a
                              href={t.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                            >
                              <Headphones className="h-3 w-3" /> Vídeo
                            </a>
                          )}
                        </div>
                      </div>
                      {isTeacher && (
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void removeTopic(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
