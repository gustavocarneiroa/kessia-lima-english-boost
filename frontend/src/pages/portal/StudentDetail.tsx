import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Link as LinkIcon, ClipboardList, ExternalLink } from "lucide-react";

interface Student {
  id: string;
  email: string;
  fullName?: string | null;
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
  installmentValue?: string | null;
  paymentDueDay?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  notes?: string | null;
  updatedAt?: string;
}

interface Lesson {
  id: string;
  studentId: string;
  scheduledAt: string;
  subject: string;
  classLink: string | null;
  activityLink: string | null;
  attended: boolean | null;
  makeupScheduled: boolean;
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

const LESSONS_PREVIEW_SIZE = 50;

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
  installmentValue: "",
  paymentDueDay: "",
  contractStart: "",
  contractEnd: "",
  notes: "",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();

  const [student, setStudent] = useState<Student | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsTotal, setLessonsTotal] = useState(0);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    api
      .get<Student>(`/api/students/${id}`)
      .then(setStudent)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    setProfileLoading(true);
    api
      .get<StudentProfile>(`/api/students/${id}/profile`)
      .then((data) => setProfile({ ...emptyProfile, ...data }))
      .catch((err) => setProfileError(err instanceof ApiError ? err.message : "Não foi possível carregar o perfil."))
      .finally(() => setProfileLoading(false));

    setLessonsLoading(true);
    api
      .get<{ items: Lesson[]; total: number }>(`/api/lessons?studentId=${id}&pageSize=${LESSONS_PREVIEW_SIZE}`)
      .then((res) => {
        setLessons(res.items);
        setLessonsTotal(res.total);
      })
      .finally(() => setLessonsLoading(false));
  }, [id]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setProfileSaving(true);
    setProfileError(null);
    setSaved(false);
    try {
      const { userId, updatedAt, ...body } = profile;
      await api.put(`/api/students/${id}/profile`, body);
      setStudent((prev) => (prev ? { ...prev, fullName: body.fullName ?? null } : prev));
      setSaved(true);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Não foi possível salvar o perfil.");
    } finally {
      setProfileSaving(false);
    }
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link to="/portal/alunos" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para alunos
        </Link>
        <p className="text-sm text-muted-foreground">Aluno não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/portal/alunos" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para alunos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {loading ? "Carregando..." : student?.fullName || student?.email}
        </h1>
        {student?.fullName && <p className="text-sm text-muted-foreground">{student.email}</p>}
        {student && (
          <Badge variant={student.hasLoggedIn ? "default" : "secondary"}>
            {student.hasLoggedIn ? "Já fez login" : "Ainda não fez login"}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfil</CardTitle>
        </CardHeader>
        <CardContent>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="installmentValue">Valor da parcela</Label>
                  <Input
                    id="installmentValue"
                    placeholder="ex: R$ 280,00"
                    value={profile.installmentValue ?? ""}
                    onChange={(e) => setProfile({ ...profile, installmentValue: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentDueDay">Dia de vencimento</Label>
                  <Input
                    id="paymentDueDay"
                    type="number"
                    min={1}
                    max={31}
                    placeholder="ex: 10"
                    value={profile.paymentDueDay ?? ""}
                    onChange={(e) => setProfile({ ...profile, paymentDueDay: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractStart">Início do contrato</Label>
                  <Input
                    id="contractStart"
                    type="date"
                    value={profile.contractStart ?? ""}
                    onChange={(e) => setProfile({ ...profile, contractStart: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractEnd">Fim do contrato</Label>
                  <Input
                    id="contractEnd"
                    type="date"
                    value={profile.contractEnd ?? ""}
                    onChange={(e) => setProfile({ ...profile, contractEnd: e.target.value })}
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
              {saved && !profileError && <p className="text-sm text-muted-foreground">Perfil salvo.</p>}

              <Button type="submit" disabled={profileSaving} className="gap-2">
                {profileSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar perfil
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aulas deste aluno</CardTitle>
          <CardDescription>{lessonsTotal} aula(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {lessonsLoading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lessons.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nenhuma aula cadastrada para este aluno ainda.</p>
          ) : (
            <ul className="divide-y">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{lesson.subject}</p>
                    {lesson.attended === true && <Badge>Compareceu</Badge>}
                    {lesson.attended === false && <Badge variant="destructive">Faltou</Badge>}
                    {lesson.attended === null && <Badge variant="secondary">Aguardando</Badge>}
                    {lesson.makeupScheduled && <Badge variant="outline">Reposição marcada</Badge>}
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
            <p className="pt-3 text-xs text-muted-foreground">
              Mostrando as {lessons.length} aulas mais recentes de {lessonsTotal}. Veja o histórico completo na aba
              "Aulas", filtrando por este aluno.
            </p>
          )}
          <p className="pt-2 text-xs text-muted-foreground">Para adicionar ou editar aulas, use a aba "Aulas" no menu.</p>
        </CardContent>
      </Card>
    </div>
  );
}
