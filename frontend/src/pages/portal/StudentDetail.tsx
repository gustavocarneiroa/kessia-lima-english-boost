import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StudentAssignments from "./StudentAssignments";
import { Loader2, ArrowLeft, Link as LinkIcon, ClipboardList, ExternalLink, KeyRound, Copy, Check } from "lucide-react";

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
  birthDate?: string | null;
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

const WEEKDAYS: { value: string; label: [pt: string, en: string] }[] = [
  { value: "monday", label: ["Segunda-feira", "Monday"] },
  { value: "tuesday", label: ["Terça-feira", "Tuesday"] },
  { value: "wednesday", label: ["Quarta-feira", "Wednesday"] },
  { value: "thursday", label: ["Quinta-feira", "Thursday"] },
  { value: "friday", label: ["Sexta-feira", "Friday"] },
  { value: "saturday", label: ["Sábado", "Saturday"] },
  { value: "sunday", label: ["Domingo", "Sunday"] },
];

const LESSONS_PREVIEW_SIZE = 50;

const emptyProfile: StudentProfile = {
  userId: "",
  fullName: "",
  birthDate: "",
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

function formatDateTime(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = usePortalPrefs();

  const [student, setStudent] = useState<Student | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

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
      .catch((err) => setProfileError(err instanceof ApiError ? err.message : t("Não foi possível carregar o perfil.", "Couldn't load the profile.")))
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

  async function generateResetLink() {
    if (!id) return;
    setResetLoading(true);
    setResetError(null);
    setResetCopied(false);
    try {
      const res = await api.post<{ link: string }>(`/api/students/${id}/reset-link`);
      setResetLink(res.link);
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : t("Não foi possível gerar o link.", "Couldn't generate the link."));
    } finally {
      setResetLoading(false);
    }
  }

  async function copyResetLink() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      setResetCopied(true);
    } catch {
      // clipboard indisponível — o link continua selecionável no campo
    }
  }

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
      setProfileError(err instanceof ApiError ? err.message : t("Não foi possível salvar o perfil.", "Couldn't save the profile."));
    } finally {
      setProfileSaving(false);
    }
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link to="/portal/alunos" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t("Voltar para alunos", "Back to students")}
        </Link>
        <p className="text-sm text-muted-foreground">{t("Aluno não encontrado.", "Student not found.")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/portal/alunos" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t("Voltar para alunos", "Back to students")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {loading ? t("Carregando...", "Loading...") : student?.fullName || student?.email}
        </h1>
        {student?.fullName && <p className="text-sm text-muted-foreground">{student.email}</p>}
        {student && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant={student.hasLoggedIn ? "default" : "secondary"}>
              {student.hasLoggedIn ? t("Já fez login", "Has logged in") : t("Ainda não fez login", "Hasn't logged in yet")}
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={generateResetLink} disabled={resetLoading}>
              {resetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              {t("Gerar link de redefinição de senha", "Generate password reset link")}
            </Button>
          </div>
        )}
        {resetError && <p className="text-sm text-destructive">{resetError}</p>}
        {resetLink && (
          <div className="mt-2 max-w-lg space-y-1.5 rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">
              {t(
                "Envie este link pro aluno (WhatsApp, por exemplo). Ele vale por 48 horas e só funciona uma vez.",
                "Send this link to the student (on WhatsApp, for example). It's valid for 48 hours and only works once.",
              )}
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={resetLink} onFocus={(e) => e.target.select()} className="text-xs" />
              <Button type="button" variant="secondary" size="icon" onClick={copyResetLink} aria-label={t("Copiar link", "Copy link")}>
                {resetCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {id && <StudentAssignments studentId={id} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Perfil", "Profile")}</CardTitle>
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
                  <Label htmlFor="fullName">{t("Nome completo", "Full name")}</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName ?? ""}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="birthDate">{t("Data de nascimento", "Date of birth")}</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={profile.birthDate ?? ""}
                    onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("Telefone / WhatsApp", "Phone / WhatsApp")}</Label>
                  <Input
                    id="phone"
                    value={profile.phone ?? ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="occupation">{t("Profissão / emprego", "Occupation / job")}</Label>
                  <Input
                    id="occupation"
                    value={profile.occupation ?? ""}
                    onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="englishLevel">{t("Nível atual de inglês", "Current English level")}</Label>
                  <Input
                    id="englishLevel"
                    placeholder={t("ex: iniciante, intermediário...", "e.g. beginner, intermediate...")}
                    value={profile.englishLevel ?? ""}
                    onChange={(e) => setProfile({ ...profile, englishLevel: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="classWeekday">{t("Dia da aula", "Lesson day")}</Label>
                  <Select
                    value={profile.classWeekday || undefined}
                    onValueChange={(v) => setProfile({ ...profile, classWeekday: v })}
                  >
                    <SelectTrigger id="classWeekday">
                      <SelectValue placeholder={t("Escolha o dia", "Choose the day")} />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {t(...w.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="classTime">{t("Horário da aula", "Lesson time")}</Label>
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
                  <Label htmlFor="installmentValue">{t("Valor da parcela", "Installment amount")}</Label>
                  <Input
                    id="installmentValue"
                    placeholder={t("ex: R$ 280,00", "e.g. R$ 280.00")}
                    value={profile.installmentValue ?? ""}
                    onChange={(e) => setProfile({ ...profile, installmentValue: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentDueDay">{t("Dia de vencimento", "Due day")}</Label>
                  <Input
                    id="paymentDueDay"
                    type="number"
                    min={1}
                    max={31}
                    placeholder={t("ex: 10", "e.g. 10")}
                    value={profile.paymentDueDay ?? ""}
                    onChange={(e) => setProfile({ ...profile, paymentDueDay: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractStart">{t("Início do contrato", "Contract start")}</Label>
                  <Input
                    id="contractStart"
                    type="date"
                    value={profile.contractStart ?? ""}
                    onChange={(e) => setProfile({ ...profile, contractStart: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractEnd">{t("Fim do contrato", "Contract end")}</Label>
                  <Input
                    id="contractEnd"
                    type="date"
                    value={profile.contractEnd ?? ""}
                    onChange={(e) => setProfile({ ...profile, contractEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interests">{t("O que gosta de aprender / interesses", "What they like to learn / interests")}</Label>
                <Textarea
                  id="interests"
                  rows={2}
                  value={profile.interests ?? ""}
                  onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="learningGoals">{t("Metas de estudo", "Study goals")}</Label>
                <Textarea
                  id="learningGoals"
                  rows={2}
                  value={profile.learningGoals ?? ""}
                  onChange={(e) => setProfile({ ...profile, learningGoals: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">{t("Observações gerais", "General notes")}</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={profile.notes ?? ""}
                  onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                />
              </div>

              {profileError && <p className="text-sm text-destructive">{profileError}</p>}
              {saved && !profileError && <p className="text-sm text-muted-foreground">{t("Perfil salvo.", "Profile saved.")}</p>}

              <Button type="submit" disabled={profileSaving} className="gap-2">
                {profileSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Salvar perfil", "Save profile")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Aulas deste aluno", "This student's lessons")}</CardTitle>
          <CardDescription>{lessonsTotal} {t("aula(s)", "lesson(s)")}</CardDescription>
        </CardHeader>
        <CardContent>
          {lessonsLoading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lessons.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {t("Nenhuma aula cadastrada para este aluno ainda.", "No lessons added for this student yet.")}
            </p>
          ) : (
            <ul className="divide-y">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{lesson.subject}</p>
                    {lesson.attended === true && <Badge>{t("Compareceu", "Attended")}</Badge>}
                    {lesson.attended === false && <Badge variant="destructive">{t("Faltou", "Missed")}</Badge>}
                    {lesson.attended === null && <Badge variant="secondary">{t("Aguardando", "Pending")}</Badge>}
                    {lesson.makeupScheduled && <Badge variant="outline">{t("Reposição marcada", "Make-up scheduled")}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(lesson.scheduledAt, locale)}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {lesson.classLink && (
                      <a
                        href={lesson.classLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" /> {t("Link da aula", "Lesson link")}
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
                        <ClipboardList className="h-3 w-3" /> {t("Atividade", "Activity")}
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
              {t(
                `Mostrando as ${lessons.length} aulas mais recentes de ${lessonsTotal}. Veja o histórico completo na aba "Aulas", filtrando por este aluno.`,
                `Showing the ${lessons.length} most recent of ${lessonsTotal} lessons. See the full history in the "Lessons" tab, filtering by this student.`,
              )}
            </p>
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            {t('Para adicionar ou editar aulas, use a aba "Aulas" no menu.', 'To add or edit lessons, use the "Lessons" tab in the menu.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
