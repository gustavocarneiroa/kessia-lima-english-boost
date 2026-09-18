import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Trash2, UserPlus, IdCard, Link as LinkIcon, ClipboardList, ExternalLink } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;
const LESSONS_PREVIEW_SIZE = 50;

interface Student {
  id: string;
  email: string;
  createdAt: string;
  hasLoggedIn: boolean;
}

interface StudentProfile {
  userId: string;
  fullName?: string | null;
  phone?: string | null;
  occupation?: string | null;
  englishLevel?: string | null;
  interests?: string | null;
  learningGoals?: string | null;
  classWeekday?: string | null;
  classTime?: string | null;
  notes?: string | null;
  updatedAt?: string;
}

const WEEKDAYS: { value: string; label: string }[] = [
  { value: "monday", label: "Segunda-feira" },
  { value: "tuesday", label: "Terça-feira" },
  { value: "wednesday", label: "Quarta-feira" },
  { value: "thursday", label: "Quinta-feira" },
  { value: "friday", label: "Sexta-feira" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

interface Lesson {
  id: string;
  studentId: string;
  scheduledAt: string;
  subject: string;
  classLink: string | null;
  activityLink: string | null;
  attended: boolean | null;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const emptyProfile: StudentProfile = {
  userId: "",
  fullName: "",
  phone: "",
  occupation: "",
  englishLevel: "",
  interests: "",
  learningGoals: "",
  classWeekday: "",
  classTime: "",
  notes: "",
};

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsTotal, setLessonsTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadStudents() {
    setLoadingList(true);
    try {
      const res = await api.get<{ items: Student[]; total: number }>(
        `/api/students?page=${page}&pageSize=${PAGE_SIZE}`,
      );
      setStudents(res.items);
      setTotal(res.total);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await api.post("/api/students", { email });
      setEmail("");
      await loadStudents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível adicionar o aluno.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    await api.delete(`/api/students/${id}`);
    await loadStudents();
  }

  async function openProfile(student: Student) {
    setProfileStudent(student);
    setProfileOpen(true);
    setProfileError(null);
    setProfileLoading(true);
    setLessons([]);
    setLessonsTotal(0);
    setLessonsLoading(true);
    try {
      const data = await api.get<StudentProfile>(`/api/students/${student.id}/profile`);
      setProfile({ ...emptyProfile, ...data });
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Não foi possível carregar o perfil.");
    } finally {
      setProfileLoading(false);
    }

    try {
      const res = await api.get<{ items: Lesson[]; total: number }>(
        `/api/lessons?studentId=${student.id}&pageSize=${LESSONS_PREVIEW_SIZE}`,
      );
      setLessons(res.items);
      setLessonsTotal(res.total);
    } finally {
      setLessonsLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileStudent) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const { userId, updatedAt, ...body } = profile;
      await api.put(`/api/students/${profileStudent.id}/profile`, body);
      setProfileOpen(false);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Não foi possível salvar o perfil.");
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
        <p className="text-muted-foreground">
          Adicione o e-mail do aluno. No primeiro login dele, a senha que ele digitar vira a
          senha da conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar aluno</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="email@aluno.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={adding} className="gap-2 sm:w-auto">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Adicionar
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos os alunos</CardTitle>
          <CardDescription>{total} cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum aluno ainda.</p>
          ) : (
            <ul className="divide-y">
              {students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.email}</p>
                    <Badge variant={s.hasLoggedIn ? "default" : "secondary"} className="mt-1">
                      {s.hasLoggedIn ? "Já fez login" : "Ainda não fez login"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openProfile(s)}
                      aria-label="Ver perfil"
                    >
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(s.id)} aria-label="Remover">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do aluno</DialogTitle>
            <DialogDescription>{profileStudent?.email}</DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName ?? ""}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    value={profile.phone ?? ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="occupation">Profissão / emprego</Label>
                  <Input
                    id="occupation"
                    value={profile.occupation ?? ""}
                    onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="englishLevel">Nível atual de inglês</Label>
                  <Input
                    id="englishLevel"
                    placeholder="ex: iniciante, intermediário..."
                    value={profile.englishLevel ?? ""}
                    onChange={(e) => setProfile({ ...profile, englishLevel: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interests">O que gosta de aprender / interesses</Label>
                <Textarea
                  id="interests"
                  rows={2}
                  value={profile.interests ?? ""}
                  onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="learningGoals">Metas de estudo</Label>
                <Textarea
                  id="learningGoals"
                  rows={2}
                  value={profile.learningGoals ?? ""}
                  onChange={(e) => setProfile({ ...profile, learningGoals: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="classWeekday">Dia da aula</Label>
                  <Select
                    value={profile.classWeekday || undefined}
                    onValueChange={(v) => setProfile({ ...profile, classWeekday: v })}
                  >
                    <SelectTrigger id="classWeekday">
                      <SelectValue placeholder="Escolha o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classTime">Horário da aula</Label>
                  <Input
                    id="classTime"
                    type="time"
                    value={profile.classTime ?? ""}
                    onChange={(e) => setProfile({ ...profile, classTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Observações gerais</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={profile.notes ?? ""}
                  onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                />
              </div>

              {profileError && <p className="text-sm text-destructive">{profileError}</p>}

              <DialogFooter>
                <Button type="submit" disabled={profileSaving} className="gap-2">
                  {profileSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar perfil
                </Button>
              </DialogFooter>
            </form>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Aulas deste aluno</p>
            {lessonsLoading ? (
              <div className="flex justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : lessons.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma aula cadastrada para este aluno ainda.</p>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto">
                {lessons.map((lesson) => (
                  <li key={lesson.id} className="space-y-1 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{lesson.subject}</p>
                      {lesson.attended === true && <Badge>Compareceu</Badge>}
                      {lesson.attended === false && <Badge variant="destructive">Faltou</Badge>}
                      {lesson.attended === null && <Badge variant="secondary">Aguardando</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(lesson.scheduledAt)}</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {lesson.classLink && (
                        <a
                          href={lesson.classLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <LinkIcon className="h-3 w-3" /> Link da aula
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {lesson.activityLink && (
                        <a
                          href={lesson.activityLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ClipboardList className="h-3 w-3" /> Atividade
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {lessonsTotal > lessons.length && (
              <p className="text-xs text-muted-foreground">
                Mostrando as {lessons.length} aulas mais recentes de {lessonsTotal}. Veja o histórico completo na
                aba "Aulas", filtrando por este aluno.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Para adicionar ou editar aulas, use a aba "Aulas" no menu.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
