import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";

interface Activity {
  id: string;
  title: string;
  kind: "embed";
  createdAt: string;
}

export default function Activities() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/api/activities", { title, embedCode });
      setTitle("");
      setEmbedCode("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a atividade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atividades</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? "Cole o código de incorporação de um site (ex.: Quizlet) e envie para os alunos."
            : "Atividades que a professora enviou para você."}
        </p>
      </div>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova atividade</CardTitle>
            <CardDescription>
              Cole aqui o código &lt;iframe&gt; que o site (Quizlet, etc.) te deu pra incorporar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-1">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: Match — verbos" required />
              </div>
              <div className="space-y-1">
                <Label>Código de incorporação</Label>
                <Textarea
                  value={embedCode}
                  onChange={(e) => setEmbedCode(e.target.value)}
                  placeholder='<iframe src="https://..." height="500" width="100%"></iframe>'
                  className="font-mono text-xs"
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
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
                  <Link to={`/portal/atividades/${a.id}`} className="block rounded-md border px-3 py-2 hover:bg-muted/50">
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
