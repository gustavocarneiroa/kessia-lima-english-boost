import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;

interface VocabList {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export default function VocabLists() {
  const { user } = useAuth();
  const { t } = usePortalPrefs();
  const isTeacher = user?.role === "teacher";
  const [lists, setLists] = useState<VocabList[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ items: VocabList[]; total: number }>(
        `/api/vocab/lists?page=${page}&pageSize=${PAGE_SIZE}`,
      );
      setLists(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/api/vocab/lists", { title });
      setTitle("");
      if (page !== 1) setPage(1);
      else await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível criar a lista.", "Couldn't create the list."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Vocabulário", "Vocabulary")}</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? t(
                "Crie listas de palavras, complete o que o dicionário não souber e envie para os alunos.",
                "Create word lists, fill in whatever the dictionary doesn't know, and send them to your students.",
              )
            : t("Estude as listas que a professora enviou para você.", "Study the lists your teacher sent you.")}
        </p>
      </div>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Nova lista", "New list")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("Nome da lista", "List name")}
                required
              />
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t("Criar", "Create")}
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Listas", "Lists")}</CardTitle>
          <CardDescription>{total} {t("lista(s)", "list(s)")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isTeacher
                ? t("Nenhuma lista ainda.", "No lists yet.")
                : t("Nenhuma lista foi enviada para você ainda.", "No lists have been sent to you yet.")}
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
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
