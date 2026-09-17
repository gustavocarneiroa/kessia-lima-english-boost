import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Layers, Smartphone, Users, type LucideIcon } from "lucide-react";

interface ShortcutItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  teacherOnly?: boolean;
}

const shortcuts: ShortcutItem[] = [
  {
    to: "/portal/aulas",
    label: "Aulas",
    description: "Datas, horários, links e presença",
    icon: CalendarDays,
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

export default function Overview() {
  const { user } = useAuth();
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
          <CardTitle>{isTeacher ? "Bem-vinda ao portal" : "Bem-vindo(a) ao portal"}</CardTitle>
          <CardDescription>
            {isTeacher
              ? "Use os atalhos abaixo (ou o menu ao lado) para gerenciar as aulas, os alunos, o vocabulário e os dispositivos cadastrados."
              : "Use os atalhos abaixo (ou o menu ao lado) para ver suas aulas, estudar o vocabulário e gerenciar seus dispositivos."}
          </CardDescription>
        </CardHeader>
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
