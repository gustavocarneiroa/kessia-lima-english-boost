import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ExternalLink, Loader2, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Skill = "grammar" | "listening" | "reading" | "speaking" | "vocabulary" | "writing";
type Price = "free" | "freemium" | "paid";

interface PracticeResource {
  id: string;
  name: string;
  url: string;
  skills: Skill[];
  price: Price;
  recommended: boolean;
  note: string | null;
  description: string | null;
}

const SKILLS: { value: Skill; label: [pt: string, en: string] }[] = [
  { value: "listening", label: ["Listening (ouvir)", "Listening"] },
  { value: "speaking", label: ["Speaking (falar)", "Speaking"] },
  { value: "reading", label: ["Reading (ler)", "Reading"] },
  { value: "writing", label: ["Writing (escrever)", "Writing"] },
  { value: "vocabulary", label: ["Vocabulário", "Vocabulary"] },
  { value: "grammar", label: ["Gramática", "Grammar"] },
];

const SHORT_SKILL: Record<Skill, [pt: string, en: string]> = {
  listening: ["Listening", "Listening"],
  speaking: ["Speaking", "Speaking"],
  reading: ["Reading", "Reading"],
  writing: ["Writing", "Writing"],
  vocabulary: ["Vocabulário", "Vocabulary"],
  grammar: ["Gramática", "Grammar"],
};

const PRICES: Record<Price, [pt: string, en: string]> = {
  free: ["Gratuito", "Free"],
  freemium: ["Tem versão gratuita", "Has a free version"],
  paid: ["Pago", "Paid"],
};

const emptyForm = {
  name: "",
  url: "",
  skills: [] as Skill[],
  price: "free" as Price,
  recommended: false,
  note: "",
  description: "",
};

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function Resources() {
  const { user } = useAuth();
  const { t } = usePortalPrefs();
  const isTeacher = user?.role === "teacher";

  const [resources, setResources] = useState<PracticeResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [price, setPrice] = useState<"" | Price>("");

  // null = fechado; "new" = adicionando; objeto = editando
  const [editing, setEditing] = useState<PracticeResource | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<PracticeResource | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function load() {
    try {
      setResources(await api.get<PracticeResource[]>("/api/resources"));
      setLoadError(null);
    } catch {
      setLoadError(t("Não foi possível carregar os recursos.", "Couldn't load the resources."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources
      .filter(
        (r) =>
          (!q ||
            r.name.toLowerCase().includes(q) ||
            (r.description ?? "").toLowerCase().includes(q) ||
            r.url.toLowerCase().includes(q)) &&
          skills.every((s) => r.skills.includes(s)) &&
          (!price || r.price === price),
      )
      .sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.name.localeCompare(b.name, "pt"));
  }, [resources, query, skills, price]);

  const hasFilters = query || skills.length > 0 || price;

  function toggleSkill(skill: Skill) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  function clearFilters() {
    setQuery("");
    setSkills([]);
    setPrice("");
  }

  function openNew() {
    setForm(emptyForm);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(r: PracticeResource) {
    setForm({
      name: r.name,
      url: r.url,
      skills: r.skills,
      price: r.price,
      recommended: r.recommended,
      note: r.note ?? "",
      description: r.description ?? "",
    });
    setFormError(null);
    setEditing(r);
  }

  function toggleFormSkill(skill: Skill) {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    if (form.skills.length === 0) {
      setFormError(t("Escolha pelo menos uma habilidade.", "Choose at least one skill."));
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/api/resources", form);
      } else {
        await api.put(`/api/resources/${editing.id}`, form);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("Não foi possível salvar o recurso.", "Couldn't save the resource."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!deleting) return;
    setDeleteError(null);
    setDeleteSaving(true);
    try {
      await api.delete(`/api/resources/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("Não foi possível excluir o recurso.", "Couldn't delete the resource."));
    } finally {
      setDeleteSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Recursos", "Resources")}</h1>
          <p className="text-muted-foreground">
            {t(
              "Sites e aplicativos para continuar praticando inglês fora da aula. Filtre pela habilidade que você quer treinar.",
              "Websites and apps to keep practicing English outside class. Filter by the skill you want to work on.",
            )}
          </p>
        </div>
        {isTeacher && (
          <Button onClick={openNew} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" /> {t("Adicionar recurso", "Add resource")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label>{t("Habilidade", "Skill")}</Label>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => {
                const active = skills.includes(s.value);
                return (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    onClick={() => toggleSkill(s.value)}
                  >
                    {t(...s.label)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resource-search">{t("Buscar", "Search")}</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="resource-search"
                  className="pl-9"
                  placeholder={t("ex: podcast, pronúncia, BBC", "e.g. podcast, pronunciation, BBC")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Preço", "Price")}</Label>
              <Select value={price || "all"} onValueChange={(v) => setPrice(v === "all" ? "" : (v as Price))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todos", "All")}</SelectItem>
                  {(Object.keys(PRICES) as Price[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(...PRICES[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> {t("Limpar filtros", "Clear filters")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : loadError ? (
        <p className="py-6 text-center text-sm text-destructive">{loadError}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {t("recurso(s)", "resource(s)")}
          </p>

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {hasFilters
                ? t("Nenhum recurso encontrado com esses filtros.", "No resources match these filters.")
                : t("Nenhum recurso cadastrado ainda.", "No resources added yet.")}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) => (
                <Card key={r.id} className={cn("flex flex-col", r.recommended && "border-primary")}>
                  <CardHeader className="space-y-1 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {r.name}
                        </a>
                      </CardTitle>
                      {r.recommended && (
                        <Badge className="shrink-0 gap-1">
                          <Star className="h-3 w-3" /> {t("Recomendo!", "Recommended!")}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="truncate">{hostname(r.url)}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.skills.map((s) => (
                        <Badge key={s} variant={skills.includes(s) ? "default" : "secondary"}>
                          {t(...SHORT_SKILL[s])}
                        </Badge>
                      ))}
                      <Badge variant="outline">{t(...PRICES[r.price])}</Badge>
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                    {r.note && <p className="text-sm italic text-muted-foreground">{r.note}</p>}
                    <div className="mt-auto flex items-center gap-1 pt-1">
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {t("Abrir site", "Open website")} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      {isTeacher && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto"
                            onClick={() => openEdit(r)}
                            aria-label={t("Editar recurso", "Edit resource")}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(r);
                            }}
                            aria-label={t("Excluir recurso", "Delete resource")}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("Novo recurso", "New resource") : t("Editar recurso", "Edit resource")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="resource-name">{t("Nome", "Name")}</Label>
              <Input
                id="resource-name"
                placeholder="ex: BBC Learning English"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-url">{t("Link", "Link")}</Label>
              <Input
                id="resource-url"
                type="url"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Habilidades", "Skills")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {SKILLS.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.skills.includes(s.value)} onCheckedChange={() => toggleFormSkill(s.value)} />
                    {t(...s.label)}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Preço", "Price")}</Label>
              <Select value={form.price} onValueChange={(v) => setForm({ ...form, price: v as Price })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRICES) as Price[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(...PRICES[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-description">{t("Descrição", "Description")}</Label>
              <Textarea
                id="resource-description"
                rows={4}
                placeholder={t("O que o aluno encontra nesse site e por que vale a pena.", "What students will find here and why it's worth it.")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-note">{t("Comentário curto (opcional)", "Short note (optional)")}</Label>
              <Input
                id="resource-note"
                placeholder={t("ex: falantes de vários países do mundo", "e.g. speakers from many countries")}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.recommended}
                onCheckedChange={(checked) => setForm({ ...form, recommended: checked === true })}
              />
              {t("Marcar como “Recomendo!” (aparece primeiro, com destaque)", "Mark as “Recommended!” (shown first, highlighted)")}
            </label>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing === "new" ? t("Adicionar recurso", "Add resource") : t("Salvar alterações", "Save changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir este recurso?", "Delete this resource?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name}. {t("Essa ação não pode ser desfeita.", "This can't be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmRemove();
              }}
              disabled={deleteSaving}
              className="gap-2"
            >
              {deleteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Excluir", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
