import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;

interface Student {
  id: string;
  email: string;
  fullName?: string | null;
  createdAt: string;
  hasLoggedIn: boolean;
}

export default function Students() {
  const { t } = usePortalPrefs();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function loadStudents() {
    setLoadingList(true);
    try {
      const res = await api.get<{ items: Student[]; total: number }>(
        `/api/students?page=${page}&pageSize=${PAGE_SIZE}`,
      );
      setStudents(res.items);
      setTotal(res.total);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await api.post("/api/students", { email });
      setEmail("");
      await loadStudents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível adicionar o aluno.", "Couldn't add the student."));
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("Alunos", "Students")}</h1>
        <p className="text-muted-foreground">
          {t(
            "Adicione o e-mail do aluno. No primeiro login dele, a senha que ele digitar vira a senha da conta.",
            "Add the student's email. The password they type on their first login becomes their account password.",
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Adicionar aluno", "Add student")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder={t("email@aluno.com", "student@email.com")}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={adding} className="gap-2 sm:w-auto">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {t("Adicionar", "Add")}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Todos os alunos", "All students")}</CardTitle>
          <CardDescription>{total} {t("cadastrado(s)", "registered")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("Nenhum aluno ainda.", "No students yet.")}</p>
          ) : (
            <ul className="divide-y">
              {students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to={`/portal/alunos/${s.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate text-sm font-medium">{s.fullName || s.email}</p>
                    {s.fullName && <p className="truncate text-xs text-muted-foreground">{s.email}</p>}
                    <Badge variant={s.hasLoggedIn ? "default" : "secondary"} className="mt-1">
                      {s.hasLoggedIn ? t("Já fez login", "Has logged in") : t("Ainda não fez login", "Hasn't logged in yet")}
                    </Badge>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(s.id)} aria-label={t("Remover", "Remove")}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
