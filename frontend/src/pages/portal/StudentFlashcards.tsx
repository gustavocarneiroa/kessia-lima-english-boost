import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil, Plus, Shuffle, Trash2 } from "lucide-react";

interface Flashcard {
  id: string;
  word: string;
  definition: string;
  example: string | null;
}

interface Student {
  id: string;
  email: string;
  fullName?: string | null;
}

interface FormState {
  word: string;
  definition: string;
  example: string;
}

const EMPTY_FORM: FormState = { word: "", definition: "", example: "" };

function cardTextClass(text: string) {
  if (text.length <= 20) return "text-3xl font-semibold";
  if (text.length <= 60) return "text-2xl font-semibold";
  return "text-lg font-semibold leading-relaxed";
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// "Meus flashcards": o aluno cria os próprios cards (palavra, definição, exemplo) e
// estuda. A professora escolhe um aluno pra ver, corrigir ou apagar os cards dele.
export default function StudentFlashcards() {
  const { user } = useAuth();
  const { t } = usePortalPrefs();
  const isTeacher = user?.role === "teacher";
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [order, setOrder] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(!isTeacher);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  async function load() {
    if (isTeacher && !studentId) return;
    setLoading(true);
    try {
      const data = await api.get<Flashcard[]>(
        isTeacher ? `/api/flashcards?studentId=${encodeURIComponent(studentId)}` : "/api/flashcards",
      );
      setCards(data);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isTeacher) void api.get<Student[]>("/api/students").then(setStudents);
  }, [isTeacher]);

  useEffect(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIndex(0);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const card = order[index];

  useEffect(() => {
    setFlipped(false);
    if (index >= order.length) setIndex(Math.max(0, order.length - 1));
  }, [order.length, index]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = { word: form.word, definition: form.definition, example: form.example };
      if (editingId) await api.put(`/api/flashcards/${editingId}`, body);
      else await api.post("/api/flashcards", body);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível salvar o flashcard.", "Couldn't save the flashcard."));
    } finally {
      setSaving(false);
    }
  }

  function startEditing(c: Flashcard) {
    setEditingId(c.id);
    setForm({ word: c.word, definition: c.definition, example: c.example ?? "" });
    // o formulário fica acima da lista — leva a pessoa até ele
    setTimeout(() => document.getElementById("fc-word")?.focus(), 0);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function remove(c: Flashcard) {
    if (!window.confirm(t(`Apagar o flashcard "${c.word}"?`, `Delete the flashcard "${c.word}"?`))) return;
    await api.delete(`/api/flashcards/${c.id}`);
    if (editingId === c.id) cancelEditing();
    await load();
  }

  function shuffle() {
    setOrder(shuffled(cards));
    setIndex(0);
    setFlipped(false);
  }

  // Formulário: o aluno usa pra criar e editar; a professora só aparece quando está corrigindo um card.
  const showForm = !isTeacher || editingId !== null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {isTeacher ? t("Flashcards dos alunos", "Students' flashcards") : t("Meus flashcards", "My flashcards")}
        </h2>
        <p className="text-muted-foreground">
          {isTeacher
            ? t(
                "Cada aluno cria os próprios flashcards. Escolha um aluno para ver, corrigir ou apagar os cards dele.",
                "Each student creates their own flashcards. Choose a student to see, fix or delete their cards.",
              )
            : t(
                "Crie seus próprios cards com as palavras que quiser lembrar. Só você e a professora veem.",
                "Create your own cards with the words you want to remember. Only you and your teacher can see them.",
              )}
        </p>
      </div>

      {isTeacher && (
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger className="sm:max-w-sm">
            <SelectValue placeholder={t("Escolha o aluno", "Choose the student")} />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.fullName || s.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {order.length > 0 && card && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Estudar", "Study")}</CardTitle>
            <CardDescription>
              {t(
                `Card ${index + 1} de ${order.length} — toque no card para virar`,
                `Card ${index + 1} of ${order.length} — tap the card to flip it`,
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="min-h-64 w-full cursor-pointer"
              style={{ perspective: "1200px" }}
              onClick={() => setFlipped((v) => !v)}
            >
              <div
                className="relative min-h-64 w-full transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Frente: a palavra */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-muted/30 p-4 text-center"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <p className={cardTextClass(card.word)}>{card.word}</p>
                </div>
                {/* Verso: definição + exemplo */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto rounded-xl border bg-muted/30 p-4 text-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <p className={cardTextClass(card.definition)}>{card.definition}</p>
                  {card.example && <p className="italic text-muted-foreground">"{card.example}"</p>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                {t("Anterior", "Previous")}
              </Button>
              <Button variant="outline" disabled={index >= order.length - 1} onClick={() => setIndex((i) => i + 1)}>
                {t("Próximo", "Next")}
              </Button>
              {order.length > 1 && (
                <Button variant="ghost" className="gap-2" onClick={shuffle}>
                  <Shuffle className="h-4 w-4" />
                  {t("Embaralhar", "Shuffle")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? t("Editar flashcard", "Edit flashcard") : t("Novo flashcard", "New flashcard")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fc-word">{t("Palavra ou expressão", "Word or expression")}</Label>
                <Input
                  id="fc-word"
                  value={form.word}
                  onChange={(e) => setForm({ ...form, word: e.target.value })}
                  placeholder="e.g. grateful"
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fc-definition">{t("Definição", "Definition")}</Label>
                <Textarea
                  id="fc-definition"
                  value={form.definition}
                  onChange={(e) => setForm({ ...form, definition: e.target.value })}
                  placeholder="e.g. feeling thankful for something"
                  maxLength={1000}
                  rows={2}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fc-example">{t("Exemplo (opcional)", "Example (optional)")}</Label>
                <Textarea
                  id="fc-example"
                  value={form.example}
                  onChange={(e) => setForm({ ...form, example: e.target.value })}
                  placeholder="e.g. I'm grateful for your help."
                  maxLength={1000}
                  rows={2}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : !editingId && <Plus className="h-4 w-4" />}
                  {editingId ? t("Salvar", "Save") : t("Adicionar", "Add")}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={cancelEditing}>
                    {t("Cancelar", "Cancel")}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {(!isTeacher || studentId) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Todos os cards", "All cards")}</CardTitle>
            <CardDescription>
              {cards.length} {t("flashcard(s)", "flashcard(s)")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isTeacher
                  ? t("Esse aluno ainda não criou nenhum flashcard.", "This student hasn't created any flashcards yet.")
                  : t("Você ainda não criou nenhum flashcard.", "You haven't created any flashcards yet.")}
              </p>
            ) : (
              <ul className="space-y-2">
                {cards.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium">{c.word}</p>
                      <p className="text-sm">{c.definition}</p>
                      {c.example && <p className="text-sm italic text-muted-foreground">"{c.example}"</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("Editar", "Edit")}
                        onClick={() => startEditing(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label={t("Apagar", "Delete")}
                        onClick={() => void remove(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
