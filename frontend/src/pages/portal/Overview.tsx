import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ClipboardList,
  Layers,
  Loader2,
  Smartphone,
  Users,
  Link as LinkIcon,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

interface ShortcutItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  teacherOnly?: boolean;
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

  if (!user) return null;

  const isTeacher = user.role === "teacher";
  const visibleShortcuts = shortcuts.filter((s) => !s.teacherOnly || isTeacher);

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        Olá, {isTeacher ? "professora" : "aluno(a)"}!
      </h1>
      <p className="text-muted-foreground">{user.email}</p>

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
