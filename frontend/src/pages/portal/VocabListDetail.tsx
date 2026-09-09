import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { VocabAudioButton } from "./VocabAudioButton";
import { VocabAudioField } from "./VocabAudioField";

interface VocabCard {
  id: string;
  word: string;
  meaning: string;
  phonetic: string;
  sourceUrl: string | null;
  origin: "api" | "teacher";
  hasWordAudio: boolean;
  hasMeaningAudio: boolean;
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
}

export default function VocabListDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === "teacher";
  const [list, setList] = useState<ListDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [manual, setManual] = useState<{ word: string; phonetic: string; meaning: string; wordAudio: string | null; meaningAudio: string | null } | null>(
    null,
  );
  const [savingManual, setSavingManual] = useState(false);
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
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir a lista.");
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
        setManual({ word, phonetic: "", meaning: "", wordAudio: null, meaningAudio: null });
      } else {
        setError(err instanceof ApiError ? err.message : "Não foi possível adicionar a palavra.");
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
      });
      setWord("");
      setManual(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o card.");
    } finally {
      setSavingManual(false);
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
    return <p className="text-sm text-destructive">{error ?? "Lista não encontrada."}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/portal/vocabulario" className="text-sm text-muted-foreground hover:underline">
            ← Todas as listas
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{list.title}</h1>
        </div>
        {isTeacher && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void duplicate()}>
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => void removeList()}>
              <Trash2 className="h-4 w-4" />
              Apagar lista
            </Button>
          </div>
        )}
      </div>

      {cards.length > 0 && card && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estudar</CardTitle>
            <CardDescription>
              Card {index + 1} de {cards.length} — toque no card para virar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              onClick={() => setFlipped((v) => !v)}
              className="flex min-h-40 w-full flex-col items-center justify-center rounded-xl border bg-muted/30 px-6 py-8 text-center"
            >
              {flipped ? (
                <>
                  <p className="text-3xl font-semibold">{card.word}</p>
                  <p className="mt-2 text-muted-foreground">{card.phonetic}</p>
                </>
              ) : (
                <p className="text-lg leading-relaxed">{card.meaning}</p>
              )}
            </button>
            <div className="flex flex-wrap gap-2">
              {card.hasMeaningAudio && <VocabAudioButton cardId={card.id} kind="meaning" label="Ouvir significado" />}
              {card.hasWordAudio && <VocabAudioButton cardId={card.id} kind="word" label="Ouvir palavra" />}
            </div>
            {card.sourceUrl && (
              <p className="text-xs text-muted-foreground">
                Definição:{" "}
                <a className="underline" href={card.sourceUrl} target="_blank" rel="noreferrer">
                  Wiktionary
                </a>{" "}
                (CC BY-SA)
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                Anterior
              </Button>
              <Button variant="outline" disabled={index >= cards.length - 1} onClick={() => setIndex((i) => i + 1)}>
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isTeacher && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar palavra</CardTitle>
              <CardDescription>Digite só a palavra. O dicionário preenche o resto quando encontrar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={addWord} className="flex flex-col gap-3 sm:flex-row">
                <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="ex.: apple" required />
                <Button type="submit" disabled={adding}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                </Button>
              </form>
              {manual && (
                <form onSubmit={saveManual} className="space-y-3 rounded-md border p-3">
                  <p className="text-sm">Essa palavra não está no dicionário. Preencha tudo abaixo.</p>
                  <div className="space-y-1">
                    <Label>Fonética</Label>
                    <Input
                      value={manual.phonetic}
                      onChange={(e) => setManual({ ...manual, phonetic: e.target.value })}
                      placeholder="/ˈæp.əl/"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Significado</Label>
                    <Textarea
                      value={manual.meaning}
                      onChange={(e) => setManual({ ...manual, meaning: e.target.value })}
                      required
                    />
                  </div>
                  <VocabAudioField
                    label="Áudio da palavra"
                    value={manual.wordAudio}
                    onChange={(v) => setManual({ ...manual, wordAudio: v })}
                  />
                  <VocabAudioField
                    label="Áudio do significado"
                    value={manual.meaningAudio}
                    onChange={(v) => setManual({ ...manual, meaningAudio: v })}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={savingManual || !manual.wordAudio || !manual.meaningAudio}>
                      {savingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar card"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setManual(null)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enviar para alunos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cadastre alunos em Alunos primeiro.</p>
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
                      <span className="text-sm">{s.email}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button type="button" onClick={() => void saveStudents()}>
                Salvar quem pode estudar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Palavras desta lista</CardTitle>
            </CardHeader>
            <CardContent>
              {cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma palavra ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {cards.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <div>
                        <p className="font-medium">{c.word}</p>
                        <p className="text-xs text-muted-foreground">{c.phonetic}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => void removeCard(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
