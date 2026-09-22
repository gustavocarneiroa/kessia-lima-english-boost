import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Cake,
  ClipboardList,
  Layers,
  Loader2,
  Smartphone,
  Users,
  Link as LinkIcon,
  ExternalLink,
  Puzzle,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useWordle, useWordleLeaderboard } from "@/hooks/useWordle";

interface ShortcutItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  teacherOnly?: boolean;
}

interface Birthday {
  id: string;
  email: string;
  fullName?: string | null;
  birthDate: string;
}

interface Lesson {
  id: string;
  studentId: string;
  studentEmail?: string | null;
  studentName?: string | null;
  scheduledAt: string;
  subject: string;
  classLink: string | null;
  activityLink: string | null;
  attended: boolean | null;
  makeupScheduled: boolean;
}

const shortcuts: ShortcutItem[] = [
  {
    to: "/portal/aulas",
    label: "Aulas",
    description: "Datas, horários, links e presença",
    icon: CalendarDays,
  },
  {
    to: "/portal/atividades",
    label: "Atividades",
    description: "Exercícios para praticar o conteúdo",
    icon: ClipboardList,
  },
  {
    to: "/portal/vocabulario",
    label: "Vocabulário",
    description: "Listas de palavras para estudar",
    icon: Layers,
  },
  {
    to: "/portal/alunos",
    label: "Alunos",
    description: "Cadastro e perfil de cada aluno",
    icon: Users,
    teacherOnly: true,
  },
  {
    to: "/portal/dispositivos",
    label: "Dispositivos",
    description: "Entrar sem senha com biometria",
    icon: Smartphone,
  },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Overview() {
  const { user } = useAuth();
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);
  const { today: wordleToday, loading: loadingWordle } = useWordle();
  const { entries: leaderboard, loading: loadingLeaderboard } = useWordleLeaderboard();

  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const params = new URLSearchParams();
    params.set("from", start.toISOString());
    params.set("to", end.toISOString());
    params.set("pageSize", "100");
    api
      .get<{ items: Lesson[] }>(`/api/lessons?${params.toString()}`)
      .then((res) => setTodayLessons(res.items))
      .catch(() => setTodayLessons([]))
      .finally(() => setLoadingToday(false));
  }, []);

  useEffect(() => {
    if (!isTeacher) {
      setLoadingBirthdays(false);
      return;
    }
    api
      .get<Birthday[]>("/api/birthdays/today")
      .then(setBirthdays)
      .catch(() => setBirthdays([]))
      .finally(() => setLoadingBirthdays(false));
  }, [isTeacher]);

  if (!user) return null;
  const visibleShortcuts = shortcuts.filter((s) => !s.teacherOnly || isTeacher);

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        Olá, {isTeacher ? "professora" : "aluno(a)"}!
      </h1>
      <p className="text-muted-foreground">{user.email}</p>

      {isTeacher && !loadingBirthdays && birthdays.length > 0 && (
        <Card className="mt-6 border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-primary" /> Aniversário hoje!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {birthdays.map((b) => (
                <li key={b.id}>
                  <Link to={`/portal/alunos/${b.id}`} className="font-medium hover:underline">
                    {b.fullName || b.email}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Aulas de hoje</CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingToday ? (
            <div className="flex justify-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : todayLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula marcada para hoje.</p>
          ) : (
            <ul className="divide-y">
              {[...todayLessons]
                .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                .map((lesson) => (
                  <li key={lesson.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatTime(lesson.scheduledAt)}</span>
                        <span className="text-sm text-muted-foreground">{lesson.subject}</span>
                        {isTeacher && (
                          <span className="text-sm text-muted-foreground">
                            · {lesson.studentName || lesson.studentEmail}
                          </span>
                        )}
                        {lesson.attended === true && <Badge>Compareceu</Badge>}
                        {lesson.attended === false && <Badge variant="destructive">Faltou</Badge>}
                        {lesson.makeupScheduled && <Badge variant="outline">Reposição marcada</Badge>}
                      </div>
                    </div>
                    {lesson.classLink && (
                      <a
                        href={lesson.classLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <LinkIcon className="h-3.5 w-3.5" /> Link da aula
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Puzzle className="h-4 w-4 text-primary" /> Jogo do dia · Wordle
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 sm:divide-x sm:gap-6">
          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-center">
            {loadingWordle ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {wordleToday?.result ? (
                  wordleToday.result.won ? (
                    <>
                      Você acertou em {wordleToday.result.guessesUsed}{" "}
                      {wordleToday.result.guessesUsed === 1 ? "tentativa" : "tentativas"} hoje (+{wordleToday.result.points} pts).
                    </>
                  ) : (
                    "Você já jogou hoje. Volte amanhã!"
                  )
                ) : (
                  "Você ainda não jogou hoje."
                )}
              </p>
            )}
            <Button asChild size="sm" className="shrink-0">
              <Link to="/wordle">{wordleToday?.result ? "Jogar de novo amanhã" : "Jogar agora"}</Link>
            </Button>
          </div>

          <div className="sm:pl-6">
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-primary" /> Top 3 de hoje
            </p>
            {loadingLeaderboard ? (
              <Skeleton className="h-12 w-full" />
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguém jogou hoje ainda.</p>
            ) : (
              <ul className="space-y-0.5">
                {leaderboard.slice(0, 3).map((entry, i) => (
                  <li
                    key={entry.studentId}
                    className={`flex items-center justify-between text-sm ${entry.isYou ? "font-semibold text-primary" : ""}`}
                  >
                    <span>
                      {i + 1}º {entry.isYou ? "Você" : entry.firstName}
                      {entry.won && !entry.hintUsed && " 🌟"}
                    </span>
                    <span className="text-muted-foreground">{entry.points} pts</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleShortcuts.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="flex items-start gap-3 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
