import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { VocabAudioButton } from "./VocabAudioButton";
import { VocabAudioField } from "./VocabAudioField";
import { VocabCardImage } from "./VocabCardImage";
import { VocabImageField } from "./VocabImageField";

interface VocabCard {
  id: string;
  word: string;
  meaning: string;
  phonetic: string;
  sourceUrl: string | null;
  origin: "api" | "teacher";
  hasWordAudio: boolean;
  hasMeaningAudio: boolean;
  hasImage: boolean;
  sortOrder: number;
}

interface ListDetail {
  id: string;
  title: string;
  description: string | null;
  cards: VocabCard[];
  studentIds?: string[];
}

interface Student {
  id: string;
  email: string;
  fullName?: string | null;
}

// Mesmo estilo nos dois lados do card; textos longos (frases, definições do
// dicionário) diminuem pra caber.
function cardTextClass(text: string) {
  if (text.length <= 20) return "text-3xl font-semibold";
  if (text.length <= 60) return "text-2xl font-semibold";
  return "text-lg font-semibold leading-relaxed";
}

export default function VocabListDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = usePortalPrefs();
  const navigate = useNavigate();
  const isTeacher = user?.role === "teacher";
  const [list, setList] = useState<ListDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [manual, setManual] = useState<{
    word: string;
    phonetic: string;
    meaning: string;
    wordAudio: string | null;
    meaningAudio: string | null;
    image: string | null;
  } | null>(null);
  const [savingManual, setSavingManual] = useState(false);
  const [mode, setMode] = useState<"word" | "phrase">("word");
  const [phrase, setPhrase] = useState<{
    phrase: string;
    meaning: string;
    phraseAudio: string | null;
    meaningAudio: string | null;
    image: string | null;
  }>({ phrase: "", meaning: "", phraseAudio: null, meaningAudio: null, image: null });
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<ListDetail>(`/api/vocab/lists/${id}`);
      setList(data);
      setSelected(new Set(data.studentIds ?? []));
      if (isTeacher) setStudents(await api.get<Student[]>("/api/students"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível abrir a lista.", "Couldn't open the list."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const cards = list?.cards ?? [];
  const card = cards[index];

  useEffect(() => {
    setFlipped(false);
    if (index >= cards.length) setIndex(Math.max(0, cards.length - 1));
  }, [cards.length, index]);

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setAdding(true);
    try {
      await api.post(`/api/vocab/lists/${id}/cards`, { word });
      setWord("");
      setManual(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "not_in_dictionary") {
        setManual({ word, phonetic: "", meaning: "", wordAudio: null, meaningAudio: null, image: null });
      } else {
        setError(err instanceof ApiError ? err.message : t("Não foi possível adicionar a palavra.", "Couldn't add the word."));
      }
    } finally {
      setAdding(false);
    }
  }

  async function saveManual(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !manual?.wordAudio || !manual.meaningAudio) return;
    setSavingManual(true);
    setError(null);
    try {
      await api.post(`/api/vocab/lists/${id}/cards/manual`, {
        word: manual.word,
        phonetic: manual.phonetic,
        meaning: manual.meaning,
        wordAudio: manual.wordAudio,
        meaningAudio: manual.meaningAudio,
        image: manual.image,
      });
      setWord("");
      setManual(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível salvar o card.", "Couldn't save the card."));
    } finally {
      setSavingManual(false);
    }
  }

  async function savePhrase(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingPhrase(true);
    setError(null);
    try {
      await api.post(`/api/vocab/lists/${id}/cards/phrase`, phrase);
      setPhrase({ phrase: "", meaning: "", phraseAudio: null, meaningAudio: null, image: null });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível salvar a frase.", "Couldn't save the phrase."));
    } finally {
      setSavingPhrase(false);
    }
  }

  async function saveTitle(e: React.FormEvent) {
    e.preventDefault();
    if (!id || editingTitle === null) return;
    setSavingTitle(true);
    setError(null);
    try {
      await api.patch(`/api/vocab/lists/${id}`, { title: editingTitle });
      setList((l) => (l ? { ...l, title: editingTitle.trim() } : l));
      setEditingTitle(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível mudar o nome da lista.", "Couldn't rename the list."));
    } finally {
      setSavingTitle(false);
    }
  }

  async function duplicate() {
    if (!id) return;
    const copy = await api.post<{ id: string }>(`/api/vocab/lists/${id}/duplicate`);
    navigate(`/portal/vocabulario/${copy.id}`);
  }

  async function removeList() {
    if (!id) return;
    await api.delete(`/api/vocab/lists/${id}`);
    navigate("/portal/vocabulario");
  }

  async function removeCard(cardId: string) {
    if (!id) return;
    await api.delete(`/api/vocab/lists/${id}/cards/${cardId}`);
    await load();
  }

  async function replaceCardImage(cardId: string, file: File) {
    if (!id) return;
    const image = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    await api.put(`/api/vocab/lists/${id}/cards/${cardId}/image`, { image });
    await load();
  }

  async function saveStudents() {
    if (!id) return;
    await api.put(`/api/vocab/lists/${id}/students`, { studentIds: [...selected] });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!list) {
    return <p className="text-sm text-destructive">{error ?? t("Lista não encontrada.", "List not found.")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/portal/vocabulario" className="text-sm text-muted-foreground hover:underline">
            ← {t("Todas as listas", "All lists")}
          </Link>
          {editingTitle !== null ? (
            <form onSubmit={saveTitle} className="mt-1 flex flex-wrap items-center gap-2">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                maxLength={200}
                className="w-80 max-w-full"
                autoFocus
                required
              />
              <Button type="submit" size="sm" disabled={savingTitle || !editingTitle.trim()}>
                {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Salvar", "Save")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTitle(null)}>
                {t("Cancelar", "Cancel")}
              </Button>
            </form>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{list.title}</h1>
              {isTeacher && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("Editar nome da lista", "Rename list")}
                  title={t("Editar nome da lista", "Rename list")}
                  onClick={() => setEditingTitle(list.title)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        {isTeacher && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void duplicate()}>
              <Copy className="h-4 w-4" />
              {t("Duplicar", "Duplicate")}
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => void removeList()}>
              <Trash2 className="h-4 w-4" />
              {t("Apagar lista", "Delete list")}
            </Button>
          </div>
        )}
      </div>

      {cards.length > 0 && card && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Estudar", "Study")}</CardTitle>
            <CardDescription>
              {t(
                `Card ${index + 1} de ${cards.length} — toque no card para virar`,
                `Card ${index + 1} of ${cards.length} — tap the card to flip it`,
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
                {/* Frente: a palavra/frase em inglês */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border bg-muted/30 p-4 text-center"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="flex items-center gap-2">
                    <p className={cardTextClass(card.word)}>{card.word}</p>
                    {card.hasWordAudio && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <VocabAudioButton cardId={card.id} kind="word" label={t("Ouvir", "Listen")} />
                      </span>
                    )}
                  </div>
                  {card.phonetic && <p className="text-muted-foreground">{card.phonetic}</p>}
                </div>
                {/* Verso: imagem + significado, no mesmo formato da frente */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 p-4 text-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  {card.hasImage && <VocabCardImage cardId={card.id} />}
                  <div className="flex items-center gap-2">
                    <p className={cardTextClass(card.meaning)}>{card.meaning}</p>
                    {card.hasMeaningAudio && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <VocabAudioButton cardId={card.id} kind="meaning" label={t("Ouvir", "Listen")} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">{t("Toque no card para virar", "Tap the card to flip it")}</p>
            {card.sourceUrl && (
              <p className="text-xs text-muted-foreground">
                {t("Definição:", "Definition:")}{" "}
                <a className="underline" href={card.sourceUrl} target="_blank" rel="noreferrer">
                  Merriam-Webster Learner's Dictionary
                </a>
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                {t("Anterior", "Previous")}
              </Button>
              <Button variant="outline" disabled={index >= cards.length - 1} onClick={() => setIndex((i) => i + 1)}>
                {t("Próximo", "Next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isTeacher && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{mode === "word" ? t("Adicionar palavra", "Add word") : t("Adicionar frase", "Add phrase")}</CardTitle>
              <CardDescription>
                {mode === "word"
                  ? t(
                      "Digite só a palavra. O dicionário preenche o resto quando encontrar.",
                      "Just type the word. The dictionary fills in the rest when it finds it.",
                    )
                  : t(
                      "Uma frase ou expressão inteira. O áudio da frase é gerado sozinho se você não gravar.",
                      "A whole phrase or expression. The phrase audio is generated automatically if you don't record it.",
                    )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "word" ? "default" : "outline"}
                  onClick={() => setMode("word")}
                >
                  {t("Palavra", "Word")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "phrase" ? "default" : "outline"}
                  onClick={() => {
                    setMode("phrase");
                    setManual(null);
                  }}
                >
                  {t("Frase", "Phrase")}
                </Button>
              </div>
              {mode === "phrase" && (
                <form onSubmit={savePhrase} className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t("Frase em inglês", "Phrase in English")}</Label>
                    <Textarea
                      value={phrase.phrase}
                      onChange={(e) => setPhrase({ ...phrase, phrase: e.target.value })}
                      placeholder={t("ex.: How are you doing?", "e.g. How are you doing?")}
                      maxLength={300}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("Significado", "Meaning")}</Label>
                    <Textarea
                      value={phrase.meaning}
                      onChange={(e) => setPhrase({ ...phrase, meaning: e.target.value })}
                      placeholder={t(
                        "ex.: Como você está? (jeito informal de cumprimentar)",
                        "e.g. Como você está? (informal way to greet someone)",
                      )}
                      required
                    />
                  </div>
                  <VocabImageField
                    label={t("Imagem (opcional)", "Image (optional)")}
                    value={phrase.image}
                    onChange={(v) => setPhrase({ ...phrase, image: v })}
                  />
                  <VocabAudioField
                    label={t(
                      "Áudio da frase (opcional — se não gravar, é gerado sozinho)",
                      "Phrase audio (optional — generated automatically if you don't record it)",
                    )}
                    value={phrase.phraseAudio}
                    onChange={(v) => setPhrase({ ...phrase, phraseAudio: v })}
                  />
                  <VocabAudioField
                    label={t("Áudio do significado (opcional)", "Meaning audio (optional)")}
                    value={phrase.meaningAudio}
                    onChange={(v) => setPhrase({ ...phrase, meaningAudio: v })}
                  />
                  <Button type="submit" disabled={savingPhrase}>
                    {savingPhrase ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Salvar frase", "Save phrase")}
                  </Button>
                </form>
              )}
              {mode === "word" && (
                <form onSubmit={addWord} className="flex flex-col gap-3 sm:flex-row">
                  <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder={t("ex.: apple", "e.g. apple")} required />
                  <Button type="submit" disabled={adding}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Buscar", "Look up")}
                  </Button>
                </form>
              )}
              {mode === "word" && manual && (
                <form onSubmit={saveManual} className="space-y-3 rounded-md border p-3">
                  <p className="text-sm">
                    {t(
                      "Essa palavra não está no dicionário. Preencha tudo abaixo.",
                      "This word isn't in the dictionary. Fill in everything below.",
                    )}
                  </p>
                  <div className="space-y-1">
                    <Label>{t("Fonética", "Phonetics")}</Label>
                    <Input
                      value={manual.phonetic}
                      onChange={(e) => setManual({ ...manual, phonetic: e.target.value })}
                      placeholder="/ˈæp.əl/"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("Significado", "Meaning")}</Label>
                    <Textarea
                      value={manual.meaning}
                      onChange={(e) => setManual({ ...manual, meaning: e.target.value })}
                      required
                    />
                  </div>
                  <VocabImageField
                    label={t("Imagem (opcional)", "Image (optional)")}
                    value={manual.image}
                    onChange={(v) => setManual({ ...manual, image: v })}
                  />
                  <VocabAudioField
                    label={t("Áudio da palavra", "Word audio")}
                    value={manual.wordAudio}
                    onChange={(v) => setManual({ ...manual, wordAudio: v })}
                  />
                  <VocabAudioField
                    label={t("Áudio do significado", "Meaning audio")}
                    value={manual.meaningAudio}
                    onChange={(v) => setManual({ ...manual, meaningAudio: v })}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={savingManual || !manual.wordAudio || !manual.meaningAudio}>
                      {savingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Salvar card", "Save card")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setManual(null)}>
                      {t("Cancelar", "Cancel")}
                    </Button>
                  </div>
                </form>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Enviar para alunos", "Send to students")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("Cadastre alunos em Alunos primeiro.", "Add students under Students first.")}</p>
              ) : (
                <ul className="space-y-2">
                  {students.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v === true) next.add(s.id);
                          else next.delete(s.id);
                          setSelected(next);
                        }}
                      />
                      <span className="text-sm">{s.fullName || s.email}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button type="button" onClick={() => void saveStudents()}>
                {t("Salvar quem pode estudar", "Save who can study it")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Palavras e frases desta lista", "Words and phrases in this list")}</CardTitle>
            </CardHeader>
            <CardContent>
              {cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("Nenhuma palavra ou frase ainda.", "No words or phrases yet.")}</p>
              ) : (
                <ul className="space-y-2">
                  {cards.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <div>
                        <p className="font-medium">{c.word}</p>
                        <p className="text-xs text-muted-foreground">{c.phonetic}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-2 py-1 text-xs">
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void replaceCardImage(c.id, f);
                            }}
                          />
                          {c.hasImage ? t("Trocar imagem", "Replace image") : t("Adicionar imagem", "Add image")}
                        </label>
                        <Button variant="ghost" size="icon" onClick={() => void removeCard(c.id)} aria-label={t("Remover", "Remove")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
