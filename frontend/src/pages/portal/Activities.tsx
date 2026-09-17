import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Headphones, Link2 } from "lucide-react";
import ActivityForm, { type ActivityFormPayload } from "./ActivityForm";

interface Activity {
  id: string;
  title: string;
  kind: "embed" | "listening";
  createdAt: string;
}

export default function Activities() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);

  async function load() {
    setLoading(true);
    try {
      setActivities(await api.get<Activity[]>("/api/activities"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(payload: ActivityFormPayload) {
    await api.post("/api/activities", payload);
    setFormKey((k) => k + 1); // reseta o formulário
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atividades</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? "Crie um exercício de listening com um vídeo do YouTube, ou cole o código de um site (ex.: Quizlet)."
            : "Atividades que a professora enviou para você."}
        </p>
      </div>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova atividade</CardTitle>
            <CardDescription>Escolha o tipo de atividade.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityForm key={formKey} submitLabel="Criar" onSubmit={create} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividades</CardTitle>
          <CardDescription>{activities.length} atividade(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isTeacher ? "Nenhuma atividade ainda." : "Nenhuma atividade foi enviada para você ainda."}
            </p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/portal/atividades/${a.id}`}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50"
                  >
                    {a.kind === "listening" ? (
                      <Headphones className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="font-medium">{a.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
