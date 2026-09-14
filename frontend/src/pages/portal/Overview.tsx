import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Overview() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        Olá, {user.role === "teacher" ? "professora" : "aluno(a)"}!
      </h1>
      <p className="text-muted-foreground">{user.email}</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{user.role === "teacher" ? "Bem-vinda ao portal" : "Bem-vindo(a) ao portal"}</CardTitle>
          <CardDescription>
            {user.role === "teacher"
              ? "Use o menu ao lado para gerenciar os alunos, o vocabulário e os dispositivos cadastrados."
              : "Use o menu ao lado para estudar as listas de vocabulário e gerenciar seus dispositivos."}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
