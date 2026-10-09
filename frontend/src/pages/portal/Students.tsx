import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, ArchiveRestore, Loader2, Trash2, UserPlus } from "lucide-react";
import Pagination from "@/components/Pagination";
import PasswordLinkBox from "@/components/PasswordLinkBox";

const PAGE_SIZE = 20;

interface Student {
  id: string;
  email: string;
  fullName?: string | null;
  createdAt: string;
  hasLoggedIn: boolean;
  archivedAt?: string | null;
}

type View = "active" | "archived";
type PendingAction = { kind: "archive" | "delete"; student: Student };

export default function Students() {
  const { t, locale } = usePortalPrefs();
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [invite, setInvite] = useState<{ email: string; link: string } | null>(null);

  const [view, setView] = useState<View>("active");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [acting, setActing] = useState(false);

  async function loadStudents() {
    setLoadingList(true);
    try {
      const archived = view === "archived" ? "&archived=1" : "";
      const res = await api.get<{ items: Student[]; total: number }>(
        `/api/students?page=${page}&pageSize=${PAGE_SIZE}${archived}`,
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
  }, [page, view]);

  function changeView(v: string) {
    setView(v as View);
    setPage(1);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    setInvite(null);
    try {
      const res = await api.post<{ email: string; inviteLink: string }>("/api/students", { email });
      setInvite({ email: res.email, link: res.inviteLink });
      setEmail("");
      if (view === "active") await loadStudents();
      else changeView("active");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível adicionar o aluno.", "Couldn't add the student."));
    } finally {
      setAdding(false);
    }
  }

  async function handleConfirm() {
    if (!pending) return;
    setActing(true);
    try {
      if (pending.kind === "archive") await api.post(`/api/students/${pending.student.id}/archive`);
      else await api.delete(`/api/students/${pending.student.id}`);
      setPending(null);
      await loadStudents();
    } finally {
      setActing(false);
    }
  }

  async function handleUnarchive(id: string) {
    await api.post(`/api/students/${id}/unarchive`);
    await loadStudents();
  }

  const pendingName = pending ? pending.student.fullName || pending.student.email : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Alunos", "Students")}</h1>
        <p className="text-muted-foreground">
          {t(
            "Adicione o e-mail do aluno e mande pra ele o link de convite que aparecer — é por esse link que ele cria a senha.",
            "Add the student's email and send them the invite link that shows up — that's how they create their password.",
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
          {invite && (
            <div className="mt-3">
              <p className="text-sm font-medium">
                {t("Aluno adicionado:", "Student added:")} {invite.email}
              </p>
              <PasswordLinkBox link={invite.link} invite />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <Tabs value={view} onValueChange={changeView}>
            <TabsList>
              <TabsTrigger value="active">{t("Ativos", "Active")}</TabsTrigger>
              <TabsTrigger value="archived">{t("Arquivados", "Archived")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-1.5">
            <CardTitle className="text-base">
              {view === "active" ? t("Alunos ativos", "Active students") : t("Alunos arquivados", "Archived students")}
            </CardTitle>
            <CardDescription>
              {view === "active"
                ? `${total} ${t("cadastrado(s)", "registered")}`
                : t(
                    `${total} arquivado(s). Eles não entram no portal, mas todo o histórico continua guardado.`,
                    `${total} archived. They can't log in, but their whole history is kept.`,
                  )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {view === "active" ? t("Nenhum aluno ainda.", "No students yet.") : t("Nenhum aluno arquivado.", "No archived students.")}
            </p>
          ) : (
            <ul className="divide-y">
              {students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to={`/portal/alunos/${s.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate text-sm font-medium">{s.fullName || s.email}</p>
                    {s.fullName && <p className="truncate text-xs text-muted-foreground">{s.email}</p>}
                    {s.archivedAt ? (
                      <Badge variant="outline" className="mt-1">
                        {t("Arquivado em", "Archived on")} {new Date(s.archivedAt).toLocaleDateString(locale)}
                      </Badge>
                    ) : (
                      <Badge variant={s.hasLoggedIn ? "default" : "secondary"} className="mt-1">
                        {s.hasLoggedIn ? t("Já fez login", "Has logged in") : t("Ainda não fez login", "Hasn't logged in yet")}
                      </Badge>
                    )}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    {s.archivedAt ? (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleUnarchive(s.id)}>
                        <ArchiveRestore className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("Desarquivar", "Unarchive")}</span>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPending({ kind: "archive", student: s })}
                        aria-label={t("Arquivar", "Archive")}
                        title={t("Arquivar", "Archive")}
                      >
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPending({ kind: "delete", student: s })}
                      aria-label={t("Excluir", "Delete")}
                      title={t("Excluir", "Delete")}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !acting && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "archive"
                ? t(`Arquivar ${pendingName}?`, `Archive ${pendingName}?`)
                : t(`Excluir ${pendingName} de vez?`, `Delete ${pendingName} for good?`)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "archive"
                ? t(
                    "O aluno não vai mais conseguir entrar no portal e sai da lista de ativos. Aulas, atividades, pagamentos e tudo mais continuam guardados — dá pra desarquivar quando quiser.",
                    "The student won't be able to log in anymore and leaves the active list. Lessons, activities, payments and everything else are kept — you can unarchive any time.",
                  )
                : t(
                    "Isso apaga o aluno e todo o histórico dele (aulas, atividades, pagamentos, flashcards). Não dá pra desfazer. Se o contrato só terminou, prefira arquivar.",
                    "This deletes the student and their whole history (lessons, activities, payments, flashcards). It can't be undone. If the contract just ended, archive instead.",
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
              disabled={acting}
              className={pending?.kind === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            >
              {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending?.kind === "archive" ? t("Arquivar", "Archive") : t("Excluir de vez", "Delete for good")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
