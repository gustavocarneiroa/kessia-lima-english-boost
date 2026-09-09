import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, UserPlus } from "lucide-react";

interface Student {
  id: string;
  email: string;
  createdAt: string;
  hasLoggedIn: boolean;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function loadStudents() {
    setLoadingList(true);
    try {
      const list = await api.get<Student[]>("/api/students");
      setStudents(list);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await api.post("/api/students", { email });
      setEmail("");
      await loadStudents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível adicionar o aluno.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    await api.delete(`/api/students/${id}`);
    await loadStudents();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
        <p className="text-muted-foreground">
          Adicione o e-mail do aluno. No primeiro login dele, a senha que ele digitar vira a
          senha da conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar aluno</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="email@aluno.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={adding} className="gap-2 sm:w-auto">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Adicionar
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos os alunos</CardTitle>
          <CardDescription>{students.length} cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum aluno ainda.</p>
          ) : (
            <ul className="divide-y">
              {students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.email}</p>
                    <Badge variant={s.hasLoggedIn ? "default" : "secondary"} className="mt-1">
                      {s.hasLoggedIn ? "Já fez login" : "Ainda não fez login"}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(s.id)} aria-label="Remover">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
