import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { BookOpen, Loader2, Lock, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { LESSON_STATUS_LABELS } from "@/lib/lessonReport";

type L = [pt: string, en: string];

const CATEGORY_LABELS: Record<string, L> = {
  pedagogical: ["Pedagógico", "Teaching"],
  behavior: ["Comportamento", "Behavior"],
  personal: ["Pessoal", "Personal"],
  financial: ["Financeiro", "Payments"],
  contact: ["Conversa / contato", "Conversation / contact"],
  other: ["Outro", "Other"],
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);

interface NoteItem {
  kind: "note";
  id: string;
  date: string;
  category: string;
  text: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
interface LessonItem {
  kind: "lesson";
  id: string;
  lessonId: string;
  date: string;
  scheduledAt: string;
  subject: string;
  status: string;
  summary: string | null;
  comments: string | null;
}
type DiaryItem = NoteItem | LessonItem;

interface Draft {
  date: string;
  category: string;
  text: string;
  pinned: boolean;
}

function todayKey() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatDay(key: string, locale: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

const emptyDraft = (): Draft => ({ date: todayKey(), category: "pedagogical", text: "", pinned: false });

function NoteForm({
  initial,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: Draft;
  saving: boolean;
  error: string | null;
  onSave: (d: Draft) => void;
  onCancel?: () => void;
}) {
  const { t } = usePortalPrefs();
  const [draft, setDraft] = useState<Draft>(initial);
  return (
    <form
      className="space-y-3 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("Data", "Date")}</Label>
          <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required />
        </div>
        <div className="space-y-1">
          <Label>{t("Tipo", "Type")}</Label>
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(...CATEGORY_LABELS[c])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>{t("Anotação", "Note")}</Label>
        <Textarea
          rows={3}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder={t(
            "Ex.: comentou que vai viajar em janeiro; tem dificuldade com present perfect…",
            "E.g. mentioned a trip in January; struggles with present perfect…",
          )}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={draft.pinned} onCheckedChange={(v) => setDraft({ ...draft, pinned: v === true })} />
        {t("Fixar no topo (pra não esquecer)", "Pin to top (so you don't forget)")}
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || !draft.text.trim()} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? t("Salvando…", "Saving…") : t("Salvar anotação", "Save note")}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
            {t("Cancelar", "Cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

export default function DiaryCard({ studentId }: { studentId: string }) {
  const { t, locale } = usePortalPrefs();
  const [items, setItems] = useState<DiaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<NoteItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      const res = await api.get<{ items: DiaryItem[] }>(`/api/students/${studentId}/diary`);
      setItems(res.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t("Não foi possível carregar o diário.", "Couldn't load the journal."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function save(draft: Draft, noteId?: string) {
    setSaving(true);
    setFormError(null);
    try {
      if (noteId) await api.put(`/api/diary/${noteId}`, draft);
      else await api.post(`/api/students/${studentId}/diary`, draft);
      setAdding(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("Não foi possível salvar.", "Couldn't save."));
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(note: NoteItem) {
    await api.put(`/api/diary/${note.id}`, { pinned: !note.pinned }).catch(() => {});
    load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/diary/${toDelete.id}`);
      setToDelete(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  const visible = items.filter((i) =>
    filter === "all" ? true : filter === "lessons" ? i.kind === "lesson" : i.kind === "note" && i.category === filter,
  );
  const pinned = visible.filter((i): i is NoteItem => i.kind === "note" && i.pinned);
  const rest = visible.filter((i) => !(i.kind === "note" && i.pinned));
  const noteCount = items.filter((i) => i.kind === "note").length;

  function renderItem(item: DiaryItem) {
    if (item.kind === "lesson") {
      return (
        <li key={item.id} className="space-y-1 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{formatDay(item.date, locale)}</span>
            <Badge variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" /> {t("Registro da aula", "Lesson report")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {item.subject} · {t(...(LESSON_STATUS_LABELS[item.status] ?? [item.status, item.status]))}
            </span>
          </div>
          {item.summary && (
            <p className="whitespace-pre-wrap text-sm">
              <span className="font-medium">{t("Resumo: ", "Summary: ")}</span>
              {item.summary}
            </p>
          )}
          {item.comments && (
            <p className="whitespace-pre-wrap text-sm">
              <span className="font-medium">{t("Comentários: ", "Comments: ")}</span>
              {item.comments}
            </p>
          )}
        </li>
      );
    }
    if (editingId === item.id) {
      return (
        <li key={item.id} className="py-3">
          <NoteForm
            initial={{ date: item.date, category: item.category, text: item.text, pinned: item.pinned }}
            saving={saving}
            error={formError}
            onSave={(d) => save(d, item.id)}
            onCancel={() => {
              setEditingId(null);
              setFormError(null);
            }}
          />
        </li>
      );
    }
    return (
      <li key={item.id} className="space-y-1 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{formatDay(item.date, locale)}</span>
          <Badge variant="secondary">{t(...(CATEGORY_LABELS[item.category] ?? [item.category, item.category]))}</Badge>
          {item.pinned && (
            <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
              <Pin className="h-3 w-3" /> {t("Fixada", "Pinned")}
            </Badge>
          )}
          <div className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => togglePin(item)}
              aria-label={item.pinned ? t("Desafixar", "Unpin") : t("Fixar", "Pin")}
              title={item.pinned ? t("Desafixar", "Unpin") : t("Fixar", "Pin")}
            >
              <Pin className={item.pinned ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setAdding(false);
                setFormError(null);
                setEditingId(item.id);
              }}
              aria-label={t("Editar", "Edit")}
              title={t("Editar", "Edit")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => setToDelete(item)}
              aria-label={t("Apagar", "Delete")}
              title={t("Apagar", "Delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm">{item.text}</p>
      </li>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {t("Diário", "Journal")}
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </CardTitle>
          {!adding && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => {
                setEditingId(null);
                setFormError(null);
                setAdding(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t("Nova anotação", "New note")}
            </Button>
          )}
        </div>
        <CardDescription>
          {t(
            `Só você vê. ${noteCount} anotação(ões) + o que você escreveu em "só você vê" nos registros de aula.`,
            `Only you can see this. ${noteCount} note(s) + what you wrote under "only you" in lesson reports.`,
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <NoteForm
            initial={emptyDraft()}
            saving={saving}
            error={formError}
            onSave={(d) => save(d)}
            onCancel={() => {
              setAdding(false);
              setFormError(null);
            }}
          />
        )}

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{t("Mostrar", "Show")}</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Tudo", "Everything")}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(...CATEGORY_LABELS[c])}
                  </SelectItem>
                ))}
                <SelectItem value="lessons">{t("Registros de aula", "Lesson reports")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {t(
              'Nenhuma anotação ainda. Clique em "Nova anotação" pra guardar algo sobre este aluno — uma conversa, uma dificuldade, algo pessoal que vale lembrar.',
              'No notes yet. Click "New note" to save something about this student — a conversation, a difficulty, something personal worth remembering.',
            )}
          </p>
        ) : visible.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t("Nada desse tipo ainda.", "Nothing of this type yet.")}</p>
        ) : (
          <>
            {pinned.length > 0 && <ul className="divide-y rounded-md bg-primary/5 px-3">{pinned.map(renderItem)}</ul>}
            <ul className="divide-y">{rest.map(renderItem)}</ul>
          </>
        )}
      </CardContent>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Apagar esta anotação?", "Delete this note?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Não dá pra desfazer depois.", "This can't be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("Apagando…", "Deleting…") : t("Apagar", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
