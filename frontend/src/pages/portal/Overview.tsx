import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Cake,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  MessagesSquare,
  Puzzle,
  Trophy,
  X,
} from "lucide-react";
import { useWordle, useWordleLeaderboard } from "@/hooks/useWordle";
import NoticeBoard from "./NoticeBoard";


interface Birthday {
  id: string;
  email: string;
  fullName?: string | null;
  birthDate: string;
}

interface NewContent {
  lessons: { id: string; subject: string; scheduledAt: string }[];
  activities: { id: string; title: string }[];
  forumPosts: { id: string; title: string }[];
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


function formatTime(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatDayAndTime(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// "YYYY-MM-DD" no fuso de quem está vendo — é o formato que o filtro de datas da tela de aulas usa.
function localDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Overview() {
  const { user } = useAuth();
  const { t, locale } = usePortalPrefs();
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);
  const [newContent, setNewContent] = useState<NewContent | null>(null);
  const [pendingForumCount, setPendingForumCount] = useState(0);
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

  useEffect(() => {
    if (isTeacher) return;
    api
      .get<NewContent>("/api/me/new-content")
      .then((res) => {
        // Só marca como visto quando o aluno fecha o aviso ou clica num link dele —
        // abrir a tela de relance (ou o app carregar em segundo plano) não conta.
        if (res.lessons.length > 0 || res.activities.length > 0 || res.forumPosts.length > 0) {
          setNewContent(res);
        }
      })
      .catch(() => {});
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;
    api
      .get<unknown[]>("/api/forum/pending")
      .then((res) => setPendingForumCount(res.length))
      .catch(() => {});
  }, [isTeacher]);

  function dismissNewContent() {
    setNewContent(null);
    void api.post("/api/me/new-content/seen").catch(() => {});
  }

  if (!user) return null;

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isTeacher ? t("Olá, professora!", "Hi, teacher!") : t("Olá, aluno(a)!", "Hi there!")}
      </h1>
      <p className="text-muted-foreground">{user.email}</p>

      <NoticeBoard isTeacher={isTeacher} />

      {!isTeacher &&
        newContent &&
        (newContent.lessons.length > 0 || newContent.activities.length > 0 || newContent.forumPosts.length > 0) && (
        <Card className="mt-6 border-primary/40 bg-primary/5">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> {t("Novidades pra você!", "What's new for you!")}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={dismissNewContent} aria-label={t("Fechar aviso", "Dismiss")}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {newContent.lessons.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {newContent.lessons.length === 1
                    ? t("1 aula nova foi marcada:", "1 new lesson was scheduled:")
                    : t(
                        `${newContent.lessons.length} aulas novas foram marcadas:`,
                        `${newContent.lessons.length} new lessons were scheduled:`,
                      )}
                </p>
                <ul className="space-y-0.5 text-sm">
                  {newContent.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        to={`/portal/aulas?dia=${localDateKey(lesson.scheduledAt)}&aula=${lesson.id}`}
                        onClick={dismissNewContent}
                        className="text-primary underline underline-offset-2 hover:opacity-70"
                      >
                        {formatDayAndTime(lesson.scheduledAt, locale)} · {lesson.subject}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {newContent.activities.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {newContent.activities.length === 1
                    ? t("1 atividade nova foi adicionada:", "1 new activity was added:")
                    : t(
                        `${newContent.activities.length} atividades novas foram adicionadas:`,
                        `${newContent.activities.length} new activities were added:`,
                      )}
                </p>
                <ul className="space-y-0.5 text-sm">
                  {newContent.activities.map((activity) => (
                    <li key={activity.id}>
                      <Link to={`/portal/atividades/${activity.id}`} onClick={dismissNewContent} className="text-primary underline underline-offset-2 hover:opacity-70">
                        {activity.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {newContent.forumPosts.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {newContent.forumPosts.length === 1
                    ? t("1 publicação nova no fórum:", "1 new forum post:")
                    : t(
                        `${newContent.forumPosts.length} publicações novas no fórum:`,
                        `${newContent.forumPosts.length} new forum posts:`,
                      )}
                </p>
                <ul className="space-y-0.5 text-sm">
                  {newContent.forumPosts.map((post) => (
                    <li key={post.id}>
                      <Link to={`/portal/forum/${post.id}`} onClick={dismissNewContent} className="text-primary underline underline-offset-2 hover:opacity-70">
                        {post.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isTeacher && pendingForumCount > 0 && (
        <Card className="mt-6 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="flex items-center gap-2 text-sm">
              <MessagesSquare className="h-5 w-5 text-primary" />
              {pendingForumCount === 1
                ? t("1 publicação de aluno aguardando sua aprovação no fórum", "1 student post waiting for your approval in the forum")
                : t(
                    `${pendingForumCount} publicações de alunos aguardando sua aprovação no fórum`,
                    `${pendingForumCount} student posts waiting for your approval in the forum`,
                  )}
            </p>
            <Button asChild size="sm">
              <Link to="/portal/forum">{t("Revisar", "Review")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isTeacher && !loadingBirthdays && birthdays.length > 0 && (
        <Card className="mt-6 border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-primary" /> {t("Aniversário hoje!", "Birthday today!")}
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
          <CardTitle>{t("Aulas de hoje", "Today's lessons")}</CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString(locale, { weekday: "long", day: "2-digit", month: "long" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingToday ? (
            <div className="flex justify-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : todayLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Nenhuma aula marcada para hoje.", "No lessons scheduled for today.")}</p>
          ) : (
            <ul className="divide-y">
              {[...todayLessons]
                .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                .map((lesson) => (
                  <li key={lesson.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatTime(lesson.scheduledAt, locale)}</span>
                        <span className="text-sm text-muted-foreground">{lesson.subject}</span>
                        {isTeacher && (
                          <span className="text-sm text-muted-foreground">
                            · {lesson.studentName || lesson.studentEmail}
                          </span>
                        )}
                        {lesson.attended === true && <Badge>{t("Compareceu", "Attended")}</Badge>}
                        {lesson.attended === false && <Badge variant="destructive">{t("Faltou", "Missed")}</Badge>}
                        {lesson.makeupScheduled && <Badge variant="outline">{t("Reposição marcada", "Make-up scheduled")}</Badge>}
                      </div>
                    </div>
                    {lesson.classLink && (
                      <a
                        href={lesson.classLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <LinkIcon className="h-3.5 w-3.5" /> {t("Link da aula", "Lesson link")}
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
            <Puzzle className="h-4 w-4 text-primary" /> {t("Jogo do dia · Wordle", "Game of the day · Wordle")}
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
                    t(
                      `Você acertou em ${wordleToday.result.guessesUsed} ${wordleToday.result.guessesUsed === 1 ? "tentativa" : "tentativas"} hoje (+${wordleToday.result.points} pts).`,
                      `You got it in ${wordleToday.result.guessesUsed} ${wordleToday.result.guessesUsed === 1 ? "guess" : "guesses"} today (+${wordleToday.result.points} pts).`,
                    )
                  ) : (
                    t("Você já jogou hoje. Volte amanhã!", "You already played today. Come back tomorrow!")
                  )
                ) : (
                  t("Você ainda não jogou hoje.", "You haven't played today yet.")
                )}
              </p>
            )}
            <Button asChild size="sm" className="shrink-0">
              <Link to="/wordle">
                {wordleToday?.result ? t("Jogar de novo amanhã", "Play again tomorrow") : t("Jogar agora", "Play now")}
              </Link>
            </Button>
          </div>

          <div className="sm:pl-6">
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-primary" /> {t("Top 3 de hoje", "Today's top 3")}
            </p>
            {loadingLeaderboard ? (
              <Skeleton className="h-12 w-full" />
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Ninguém jogou hoje ainda.", "Nobody has played today yet.")}</p>
            ) : (
              <ul className="space-y-0.5">
                {leaderboard.slice(0, 3).map((entry, i) => (
                  <li
                    key={entry.studentId}
                    className={`flex items-center justify-between text-sm ${entry.isYou ? "font-semibold text-primary" : ""}`}
                  >
                    <span>
                      {t(`${i + 1}º`, `#${i + 1}`)} {entry.isYou ? t("Você", "You") : entry.firstName}
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
    </div>
  );
}
