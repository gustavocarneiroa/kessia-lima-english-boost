import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { useDaysOff, DAY_OFF_KIND_LABELS } from "@/lib/daysOff";
import { formatDateBr, isDateKey, scheduleFromProfile, WEEKDAYS, type DayOff, type ScheduledClass } from "@/lib/quote";
import MonthCalendar from "@/components/MonthCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CalendarX, Loader2, Plus, Trash2 } from "lucide-react";

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function periodText(p: DayOff) {
  return p.end !== p.start ? `${formatDateBr(p.start)} – ${formatDateBr(p.end)}` : formatDateBr(p.start);
}

export default function Calendar() {
  const { user } = useAuth();
  return user?.role === "teacher" ? <TeacherCalendar /> : <StudentCalendar />;
}

function DaysOffList({ items, onRemove }: { items: DayOff[]; onRemove?: (p: DayOff) => void }) {
  const { t } = usePortalPrefs();
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{t("Nada por aqui.", "Nothing here.")}</p>;
  }
  return (
    <ul className="divide-y rounded-md border">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
          <CalendarX className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 tabular-nums sm:w-48">{periodText(p)}</span>
          <span className="min-w-0 flex-1 truncate">{p.label}</span>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {t(...DAY_OFF_KIND_LABELS[p.kind])}
          </Badge>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onRemove(p)}
              aria-label={t("Remover", "Remove")}
              title={t("Remover", "Remove")}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function TeacherCalendar() {
  const { t } = usePortalPrefs();
  const { daysOff, loaded, reload } = useDaysOff();
  const [draft, setDraft] = useState({ start: "", end: "", label: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [removing, setRemoving] = useState<DayOff | null>(null);
  const [acting, setActing] = useState(false);
  const today = todayKey();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await api.post("/api/days-off", { start: draft.start, end: draft.end || null, label: draft.label });
      setDraft({ start: "", end: "", label: "" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível adicionar.", "Couldn't add it."));
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setActing(true);
    try {
      await api.delete(`/api/days-off/${removing.id}`);
      setRemoving(null);
      await reload();
    } finally {
      setActing(false);
    }
  }

  const visible = daysOff.filter((p) => showPast || p.end >= today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Calendário", "Calendar")}</h1>
        <p className="text-muted-foreground">
          {t(
            "Dias em que você não dá aula. Os alunos veem isso no calendário deles, e os orçamentos já descontam essas aulas. Feriados nacionais e Dia do Professor entram sozinhos, sempre com 2 anos de antecedência.",
            "Days you don't teach. Students see them in their calendar, and quotes already leave those classes out. National holidays and Teacher's Day are added automatically, always 2 years ahead.",
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Marcar dia sem aula", "Add a day off")}</CardTitle>
          <CardDescription>{t("Férias, viagem, folga... Pra um dia só, deixe o \"Até\" vazio.", "Vacation, trip, day off... For a single day, leave \"To\" empty.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label>{t("De", "From")}</Label>
              <Input type="date" required value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("Até (opcional)", "To (optional)")}</Label>
              <Input type="date" min={draft.start} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("Motivo (os alunos veem)", "Reason (students see it)")}</Label>
              <Input required value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder={t("Férias", "Vacation")} />
            </div>
            <Button type="submit" className="gap-2" disabled={adding || !isDateKey(draft.start) || !draft.label.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("Adicionar", "Add")}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Mês a mês", "Month by month")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthCalendar daysOff={daysOff} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{showPast ? t("Todos os dias sem aula", "All days off") : t("Próximos dias sem aula", "Upcoming days off")}</CardTitle>
            <CardDescription>
              {t(
                "Removeu um feriado? Então nesse dia tem aula normal — ele não volta sozinho.",
                "Removed a holiday? Then that day has class as usual — it won't come back on its own.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loaded ? (
              <div className="flex justify-center py-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="max-h-[32rem] overflow-y-auto">
                <DaysOffList items={visible} onRemove={setRemoving} />
              </div>
            )}
            <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setShowPast((v) => !v)}>
              {showPast ? t("Esconder os que já passaram", "Hide past ones") : t("Mostrar também os que já passaram", "Also show past ones")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && !acting && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(`Remover "${removing?.label}"?`, `Remove "${removing?.label}"?`)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                `Em ${removing ? periodText(removing) : ""} passa a ter aula normal no calendário dos alunos e nos orçamentos novos. Contratos já feitos não mudam.`,
                `On ${removing ? periodText(removing) : ""} there will be class as usual in students' calendars and new quotes. Existing contracts don't change.`,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmRemove();
              }}
              disabled={acting}
            >
              {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Remover", "Remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface MyProfile {
  classSchedule?: string | null;
  classWeekday?: string | null;
  classTime?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
}

function StudentCalendar() {
  const { t, lang } = usePortalPrefs();
  const { daysOff, loaded } = useDaysOff();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const today = todayKey();

  useEffect(() => {
    api
      .get<MyProfile>("/api/me/profile")
      .then(setProfile)
      .catch(() => setProfile({}));
  }, []);

  if (!profile || !loaded) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const schedule: ScheduledClass[] = scheduleFromProfile(profile);
  const upcoming = daysOff.filter((p) => p.end >= today && (!profile.contractEnd || p.start <= profile.contractEnd));
  const scheduleText = schedule
    .map((s) => `${lang === "en" ? WEEKDAYS[s.weekday].en : WEEKDAYS[s.weekday].pt}${s.time ? ` ${t("às", "at")} ${s.time}` : ""}`)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Calendário", "Calendar")}</h1>
        <p className="text-muted-foreground">
          {t(
            "Seus dias de aula e os dias em que não vai ter aula (feriados, férias da teacher, folgas).",
            "Your class days and the days there's no class (holidays, teacher's vacation, days off).",
          )}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Suas aulas", "Your classes")}</CardTitle>
            <CardDescription>
              {schedule.length ? (
                <span>{scheduleText}</span>
              ) : (
                t("Seu horário ainda não foi cadastrado pela teacher.", "Your schedule hasn't been set by the teacher yet.")
              )}
              {profile.contractStart && profile.contractEnd && (
                <span className="block">
                  {t("Contrato", "Contract")}: {formatDateBr(profile.contractStart)} – {formatDateBr(profile.contractEnd)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthCalendar
              daysOff={daysOff}
              schedule={schedule}
              contractStart={profile.contractStart}
              contractEnd={profile.contractEnd}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Próximos dias sem aula", "Upcoming days off")}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[32rem] overflow-y-auto">
            <DaysOffList items={upcoming} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
