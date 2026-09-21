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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Pencil, Link as LinkIcon, ClipboardList, ExternalLink, X } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;

interface Lesson {
  id: string;
  studentId: string;
  studentEmail?: string | null;
  scheduledAt: string;
  subject: string;
  classLink: string | null;
  activityLink: string | null;
  attended: boolean | null;
  makeupScheduled: boolean;
}

interface Student {
  id: string;
  email: string;
  fullName?: string | null;
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
  const [total, setTotal] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [filterStudentId, setFilterStudentId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterAttended, setFilterAttended] = useState("");
  const [filterMakeup, setFilterMakeup] = useState("");

  const [editing, setEditing] = useState<Lesson | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleting, setDeleting] = useState<Lesson | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (filterStudentId) params.set("studentId", filterStudentId);
      if (filterFrom) params.set("from", new Date(`${filterFrom}T00:00`).toISOString());
      if (filterTo) params.set("to", new Date(`${filterTo}T23:59:59`).toISOString());
      if (filterAttended) params.set("attended", filterAttended);
      if (filterMakeup) params.set("makeupScheduled", filterMakeup);
      const res = await api.get<{ items: Lesson[]; total: number }>(`/api/lessons?${params.toString()}`);
      setLessons(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStudentId, filterFrom, filterTo, filterAttended, filterMakeup]);

  useEffect(() => {
    if (isTeacher) {
      api.get<Student[]>("/api/students").then(setStudents).catch(() => setStudents([]));
    }
  }, [isTeacher]);

  function clearFilters() {
    setFilterStudentId("");
    setFilterFrom("");
    setFilterTo("");
    setFilterAttended("");
    setFilterMakeup("");
    setPage(1);
  }

  const hasFilters = filterStudentId || filterFrom || filterTo || filterAttended || filterMakeup;

  const studentEmailById = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(s.id, s.fullName || s.email));
    return map;
  }, [students]);

  async function selectStudentForNewLesson(studentId: string) {
    setForm((prev) => ({ ...prev, studentId }));
    try {
      const profile = await api.get<{ classTime?: string | null }>(`/api/students/${studentId}/profile`);
      if (profile.classTime) {
        setForm((prev) => (prev.studentId === studentId ? { ...prev, time: profile.classTime! } : prev));
      }
    } catch {
      // sem perfil cadastrado ainda — mantém o horário como está
    }
  }

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

  async function toggleMakeupScheduled(lesson: Lesson, makeupScheduled: boolean) {
    setLessons((prev) => prev.map((l) => (l.id === lesson.id ? { ...l, makeupScheduled } : l)));
    try {
      await api.put(`/api/lessons/${lesson.id}`, { makeupScheduled });
    } catch {
      await load();
    }
  }

  async function confirmRemove() {
    if (!deleting) return;
    setListError(null);
    setDeleteSaving(true);
    try {
      await api.delete(`/api/lessons/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : "Não foi possível excluir a aula.");
    } finally {
      setDeleteSaving(false);
    }
  }

  function openEdit(lesson: Lesson) {
    setEditing(lesson);
    setEditError(null);
    setEditForm({
      studentId: lesson.studentId,
      ...splitDateTime(lesson.scheduledAt),
      subject: lesson.subject,
      classLink: lesson.classLink ?? "",
      activityLink: lesson.activityLink ?? "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    if (!editForm.studentId || !editForm.date || !editForm.time) {
      setEditError("Escolha o aluno, a data e o horário da aula.");
      return;
    }
    setEditSaving(true);
    try {
      const scheduledAt = new Date(`${editForm.date}T${editForm.time}`).toISOString();
      await api.put(`/api/lessons/${editing.id}`, {
        studentId: editForm.studentId,
        scheduledAt,
        subject: editForm.subject,
        classLink: editForm.classLink || null,
        activityLink: editForm.activityLink || null,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Não foi possível salvar as alterações.");
    } finally {
      setEditSaving(false);
    }
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
                  <Select value={form.studentId} onValueChange={(v) => void selectStudentForNewLesson(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.fullName || s.email}
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
          <CardDescription>{total} aula(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {isTeacher && (
              <div className="space-y-1.5">
                <Label>Aluno</Label>
                <Select
                  value={filterStudentId || "all"}
                  onValueChange={(v) => {
                    setFilterStudentId(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os alunos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os alunos</SelectItem>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName || s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="filter-from">De</Label>
              <Input
                id="filter-from"
                type="date"
                value={filterFrom}
                onChange={(e) => {
                  setFilterFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-to">Até</Label>
              <Input
                id="filter-to"
                type="date"
                value={filterTo}
                onChange={(e) => {
                  setFilterTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Comparecimento</Label>
              <Select
                value={filterAttended || "all"}
                onValueChange={(v) => {
                  setFilterAttended(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Compareceu</SelectItem>
                  <SelectItem value="no">Faltou</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reposição</Label>
              <Select
                value={filterMakeup || "all"}
                onValueChange={(v) => {
                  setFilterMakeup(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="yes">Reposição marcada</SelectItem>
                  <SelectItem value="no">Sem reposição</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-4 gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          ) : null}

          {listError && <p className="mb-3 text-sm text-destructive">{listError}</p>}
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {hasFilters ? "Nenhuma aula encontrada com esses filtros." : "Nenhuma aula cadastrada ainda."}
            </p>
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
                      {lesson.makeupScheduled && <Badge variant="outline">Reposição marcada</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(lesson.scheduledAt)}
                      {isTeacher && (studentEmailById.get(lesson.studentId) ?? lesson.studentEmail)
                        ? ` · ${studentEmailById.get(lesson.studentId) ?? lesson.studentEmail}`
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
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          checked={lesson.makeupScheduled}
                          onCheckedChange={(checked) => toggleMakeupScheduled(lesson, checked === true)}
                        />
                        Reposição marcada
                      </label>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(lesson)} aria-label="Editar aula">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(lesson)} aria-label="Excluir aula">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar aula</DialogTitle>
          </DialogHeader>

          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Aluno</Label>
                <Select
                  value={editForm.studentId}
                  onValueChange={(v) => setEditForm({ ...editForm, studentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName || s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-subject">Assunto</Label>
                <Input
                  id="edit-subject"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Data</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-time">Horário</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-classLink">Link da aula</Label>
                <Input
                  id="edit-classLink"
                  type="url"
                  placeholder="https://docs.google.com/presentation/..."
                  value={editForm.classLink}
                  onChange={(e) => setEditForm({ ...editForm, classLink: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-activityLink">Link da atividade</Label>
                <Input
                  id="edit-activityLink"
                  type="url"
                  placeholder="https://..."
                  value={editForm.activityLink}
                  onChange={(e) => setEditForm({ ...editForm, activityLink: e.target.value })}
                />
              </div>
            </div>

            {editError && <p className="text-sm text-destructive">{editError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={editSaving} className="gap-2">
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta aula?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.subject} — {deleting ? formatDateTime(deleting.scheduledAt) : ""}. Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={deleteSaving} className="gap-2">
              {deleteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
