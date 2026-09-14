import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Link as LinkIcon, ClipboardList, ExternalLink } from "lucide-react";

interface Lesson {
  id: string;
  studentId: string;
  studentEmail?: string | null;
  scheduledAt: string;
  subject: string;
  classLink: string | null;
  activityLink: string | null;
  attended: boolean | null;
}

interface Student {
  id: string;
  email: string;
}

const emptyForm = {
  studentId: "",
  date: "",
  time: "",
  subject: "",
  classLink: "",
  activityLink: "",
};

function splitDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Lessons() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setLessons(await api.get<Lesson[]>("/api/lessons"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    if (isTeacher) {
      api.get<Student[]>("/api/students").then(setStudents).catch(() => setStudents([]));
    }
  }, [isTeacher]);

  const studentEmailById = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(s.id, s.email));
    return map;
  }, [students]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.studentId || !form.date || !form.time) {
      setError("Escolha o aluno, a data e o horário da aula.");
      return;
    }
    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
      await api.post("/api/lessons", {
        studentId: form.studentId,
        scheduledAt,
        subject: form.subject,
        classLink: form.classLink || null,
        activityLink: form.activityLink || null,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar a aula.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAttended(lesson: Lesson, attended: boolean) {
    setLessons((prev) => prev.map((l) => (l.id === lesson.id ? { ...l, attended } : l)));
    try {
      await api.put(`/api/lessons/${lesson.id}`, { attended });
    } catch {
      await load();
    }
  }

  async function remove(id: string) {
    await api.delete(`/api/lessons/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aulas</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? "Cadastre as aulas de cada aluno: data, horário, assunto, link da aula e da atividade."
            : "Veja suas próximas aulas e o histórico das aulas já dadas."}
        </p>
      </div>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova aula</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Aluno</Label>
                  <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    placeholder="ex: Unit 3 - Past Simple"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classLink">Link da aula</Label>
                  <Input
                    id="classLink"
                    type="url"
                    placeholder="https://docs.google.com/presentation/..."
                    value={form.classLink}
                    onChange={(e) => setForm({ ...form, classLink: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="activityLink">Link da atividade</Label>
                  <Input
                    id="activityLink"
                    type="url"
                    placeholder="https://..."
                    value={form.activityLink}
                    onChange={(e) => setForm({ ...form, activityLink: e.target.value })}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar aula
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isTeacher ? "Todas as aulas" : "Suas aulas"}</CardTitle>
          <CardDescription>{lessons.length} aula(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma aula cadastrada ainda.</p>
          ) : (
            <ul className="divide-y">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{lesson.subject}</p>
                      {lesson.attended === true && <Badge>Compareceu</Badge>}
                      {lesson.attended === false && <Badge variant="destructive">Faltou</Badge>}
                      {lesson.attended === null && <Badge variant="secondary">Aguardando</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(lesson.scheduledAt)}
                      {isTeacher && (lesson.studentEmail ?? studentEmailById.get(lesson.studentId))
                        ? ` · ${lesson.studentEmail ?? studentEmailById.get(lesson.studentId)}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {lesson.classLink && (
                        <a
                          href={lesson.classLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <LinkIcon className="h-3.5 w-3.5" /> Link da aula
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {lesson.activityLink && (
                        <a
                          href={lesson.activityLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ClipboardList className="h-3.5 w-3.5" /> Atividade
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {isTeacher && (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          checked={lesson.attended === true}
                          onCheckedChange={(checked) => toggleAttended(lesson, checked === true)}
                        />
                        Aluno veio
                      </label>
                      <Button variant="ghost" size="icon" onClick={() => remove(lesson.id)} aria-label="Remover aula">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
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
