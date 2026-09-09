import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";

interface VocabList {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export default function VocabLists() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [lists, setLists] = useState<VocabList[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setLists(await api.get<VocabList[]>("/api/vocab/lists"));
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
      await api.post("/api/vocab/lists", { title });
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a lista.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vocabulário</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? "Crie listas de palavras, complete o que o dicionário não souber e envie para os alunos."
            : "Estude as listas que a professora enviou para você."}
        </p>
      </div>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova lista</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome da lista"
                required
              />
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
          <CardTitle className="text-base">Listas</CardTitle>
          <CardDescription>{lists.length} lista(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isTeacher ? "Nenhuma lista ainda." : "Nenhuma lista foi enviada para você ainda."}
            </p>
          ) : (
            <ul className="space-y-2">
              {lists.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/portal/vocabulario/${l.id}`}
                    className="block rounded-md border px-3 py-2 hover:bg-muted/50"
                  >
                    <p className="font-medium">{l.title}</p>
                    {l.description && <p className="text-sm text-muted-foreground">{l.description}</p>}
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
