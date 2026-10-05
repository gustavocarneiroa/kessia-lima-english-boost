import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { AlertTriangle, ExternalLink, Loader2, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  important: boolean;
  expiresOn: string | null;
  expired: boolean;
  createdAt: string;
}

interface NoticeForm {
  title: string;
  body: string;
  linkUrl: string;
  important: boolean;
  expiresOn: string;
}

const emptyForm: NoticeForm = { title: "", body: "", linkUrl: "", important: false, expiresOn: "" };

function formatDay(dateKey: string, locale: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

// Ordem: importantes primeiro, depois os mais recentes; vencidos (só a professora vê) por último.
function sortNotices(list: Notice[]) {
  return [...list].sort(
    (a, b) =>
      Number(a.expired) - Number(b.expired) ||
      Number(b.important) - Number(a.important) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export default function NoticeBoard({ isTeacher }: { isTeacher: boolean }) {
  const { t, locale } = usePortalPrefs();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Notice | "new" | null>(null);
  const [form, setForm] = useState<NoticeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);

  useEffect(() => {
    api
      .get<Notice[]>("/api/notices")
      .then((res) => setNotices(sortNotices(res)))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setForm(emptyForm);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(n: Notice) {
    setForm({
      title: n.title,
      body: n.body ?? "",
      linkUrl: n.linkUrl ?? "",
      important: n.important,
      expiresOn: n.expiresOn ?? "",
    });
    setFormError(null);
    setEditing(n);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    try {
      const saved =
        editing === "new"
          ? await api.post<Notice>("/api/notices", form)
          : await api.put<Notice>(`/api/notices/${editing.id}`, form);
      setNotices((prev) => sortNotices([saved, ...prev.filter((n) => n.id !== saved.id)]));
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("Não foi possível salvar o aviso.", "Could not save the notice."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    await api.delete(`/api/notices/${id}`).catch(() => {});
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> {t("Quadro de avisos", "Notice board")}
        </CardTitle>
        {isTeacher && (
          <Button size="sm" className="gap-1" onClick={openNew}>
            <Plus className="h-4 w-4" /> {t("Novo aviso", "New notice")}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : notices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isTeacher
              ? t("Nenhum aviso ainda. Clique em “Novo aviso” para escrever o primeiro.", "No notices yet. Click “New notice” to write the first one.")
              : t("Nenhum aviso no momento.", "No notices right now.")}
          </p>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border p-3 ${
                  n.expired ? "opacity-60" : n.important ? "border-amber-400/70 bg-amber-50 dark:bg-amber-950/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.important && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
                      <p className="font-medium">{n.title}</p>
                      {n.important && !n.expired && (
                        <Badge className="bg-amber-500 hover:bg-amber-500">{t("Importante", "Important")}</Badge>
                      )}
                      {isTeacher && n.expired && <Badge variant="outline">{t("Fora do ar", "Expired")}</Badge>}
                    </div>
                    {n.body && <p className="whitespace-pre-line text-sm">{n.body}</p>}
                    {n.linkUrl && (
                      <a
                        href={n.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {t("Abrir link", "Open link")} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short" })}
                      {isTeacher &&
                        n.expiresOn &&
                        ` · ${
                          n.expired
                            ? t(`saiu do ar em ${formatDay(n.expiresOn, locale)}`, `expired on ${formatDay(n.expiresOn, locale)}`)
                            : t(`no ar até ${formatDay(n.expiresOn, locale)}`, `visible until ${formatDay(n.expiresOn, locale)}`)
                        }`}
                    </p>
                  </div>
                  {isTeacher && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(n)} aria-label={t("Editar", "Edit")}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleting(n)} aria-label={t("Excluir", "Delete")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {isTeacher && (
        <>
          <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing === "new" ? t("Novo aviso", "New notice") : t("Editar aviso", "Edit notice")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="notice-title">{t("Título", "Title")}</Label>
                  <Input
                    id="notice-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-body">{t("Mensagem (opcional)", "Message (optional)")}</Label>
                  <Textarea
                    id="notice-body"
                    rows={4}
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    maxLength={5000}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-link">{t("Link (opcional)", "Link (optional)")}</Label>
                  <Input
                    id="notice-link"
                    type="url"
                    placeholder="https://"
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-expires">{t("Fica no ar até (opcional)", "Visible until (optional)")}</Label>
                  <Input
                    id="notice-expires"
                    type="date"
                    value={form.expiresOn}
                    onChange={(e) => setForm({ ...form, expiresOn: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Depois desse dia o aviso sai sozinho do quadro dos alunos. Deixe em branco para ficar até você apagar.",
                      "After this day the notice disappears from students' board. Leave blank to keep it until you delete it.",
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="notice-important"
                    checked={form.important}
                    onCheckedChange={(checked) => setForm({ ...form, important: checked === true })}
                  />
                  <Label htmlFor="notice-important">{t("Marcar como importante", "Mark as important")}</Label>
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <DialogFooter>
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editing === "new" ? t("Publicar aviso", "Publish notice") : t("Salvar alterações", "Save changes")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Excluir este aviso?", "Delete this notice?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  “{deleting?.title}” {t("vai sair do quadro de todos os alunos.", "will be removed from every student's board.")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancelar", "Cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>{t("Excluir", "Delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </Card>
  );
}
