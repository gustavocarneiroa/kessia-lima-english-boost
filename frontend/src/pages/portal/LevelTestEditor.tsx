import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { CEFR_LEVELS, LEVEL_INFO, type CefrLevel, type LevelTest, type LevelTestQuestion } from "@/lib/levelTest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { CheckCircle2, Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Professora: edita as perguntas do teste de nível, separadas por nível (A1 → C2), e a
// parte opcional de listening (um vídeo do YouTube + perguntas sobre ele).

type Draft = LevelTestQuestion & { key: number };

let nextKey = 1;
const withKey = (q: LevelTestQuestion): Draft => ({ ...q, key: nextKey++ });
const emptyQuestion = (level: CefrLevel): Draft => withKey({ level, prompt: "", options: ["", "", "", ""], correctIndex: 0 });
const stripKey = ({ key: _key, ...q }: Draft): LevelTestQuestion => ({
  ...q,
  prompt: q.prompt.trim(),
  options: q.options.map((o) => o.trim()),
});

function QuestionEditor({
  q,
  index,
  showLevel,
  onChange,
  onRemove,
}: {
  q: Draft;
  index: number;
  showLevel: boolean;
  onChange: (q: Draft) => void;
  onRemove: () => void;
}) {
  const { t } = usePortalPrefs();

  return (
    <div className="space-y-3 rounded-lg border p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <span className="pt-2 text-sm font-medium text-muted-foreground tabular-nums">{index + 1}.</span>
        <Textarea
          value={q.prompt}
          onChange={(e) => onChange({ ...q, prompt: e.target.value })}
          placeholder={t("Enunciado (ex.: She ___ coffee every morning.)", "Prompt (e.g. She ___ coffee every morning.)")}
          rows={1}
          className="min-h-[40px] flex-1"
        />
        {showLevel && (
          <Select value={q.level} onValueChange={(v) => onChange({ ...q, level: v as CefrLevel })}>
            <SelectTrigger className="w-20 shrink-0" aria-label={t("Nível", "Level")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CEFR_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onRemove} aria-label={t("Excluir pergunta", "Delete question")}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 pl-6">
        {q.options.map((opt, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...q, correctIndex: oi })}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                q.correctIndex === oi ? "border-green-600 bg-green-600 text-white" : "text-muted-foreground hover:bg-muted",
              )}
              aria-label={t("Marcar como resposta certa", "Mark as correct answer")}
              title={t("Marcar como resposta certa", "Mark as correct answer")}
            >
              {q.correctIndex === oi ? <CheckCircle2 className="h-4 w-4" /> : String.fromCharCode(65 + oi)}
            </button>
            <Input
              value={opt}
              onChange={(e) => onChange({ ...q, options: q.options.map((o, j) => (j === oi ? e.target.value : o)) })}
              placeholder={`${t("Opção", "Option")} ${String.fromCharCode(65 + oi)}`}
            />
            {q.options.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  const options = q.options.filter((_, j) => j !== oi);
                  const correctIndex = q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex;
                  onChange({ ...q, options, correctIndex });
                }}
                aria-label={t("Remover opção", "Remove option")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {q.options.length < 6 && (
          <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => onChange({ ...q, options: [...q.options, ""] })}>
            <Plus className="h-3.5 w-3.5" /> {t("Opção", "Option")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function LevelTestEditor() {
  const { t } = usePortalPrefs();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Draft[]>([]);
  const [listeningOn, setListeningOn] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [listeningQuestions, setListeningQuestions] = useState<Draft[]>([]);
  const [defaultTest, setDefaultTest] = useState<LevelTest | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function load(test: LevelTest) {
    setQuestions(test.questions.map(withKey));
    setListeningOn(!!test.listening);
    setYoutubeUrl(test.listening ? `https://www.youtube.com/watch?v=${test.listening.youtubeVideoId}` : "");
    setListeningQuestions((test.listening?.questions ?? []).map(withKey));
  }

  useEffect(() => {
    api
      .get<{ test: LevelTest; defaultTest: LevelTest }>("/api/level-test")
      .then((d) => {
        load(d.test);
        setDefaultTest(d.defaultTest);
      })
      .finally(() => setLoading(false));
  }, []);

  function edit<T>(setter: (fn: (prev: T) => T) => void, fn: (prev: T) => T) {
    setter(fn);
    setDirty(true);
    setMessage(null);
  }

  const updateQuestion = (key: number, q: Draft) => edit(setQuestions, (prev) => prev.map((p) => (p.key === key ? q : p)));
  const removeQuestion = (key: number) => edit(setQuestions, (prev) => prev.filter((p) => p.key !== key));
  const updateListening = (key: number, q: Draft) => edit(setListeningQuestions, (prev) => prev.map((p) => (p.key === key ? q : p)));
  const removeListening = (key: number) => edit(setListeningQuestions, (prev) => prev.filter((p) => p.key !== key));

  async function save() {
    setMessage(null);
    const all = [...questions, ...(listeningOn ? listeningQuestions : [])];
    if (all.some((q) => !q.prompt.trim() || q.options.some((o) => !o.trim()))) {
      setMessage({ ok: false, text: t("Tem pergunta com enunciado ou opção em branco.", "Some question has an empty prompt or option.") });
      return;
    }
    if (listeningOn && (!youtubeUrl.trim() || listeningQuestions.length === 0)) {
      setMessage({
        ok: false,
        text: t("Pra ter listening, cole o link do vídeo e crie pelo menos uma pergunta.", "For listening, paste the video link and add at least one question."),
      });
      return;
    }
    setSaving(true);
    try {
      // Salva já na ordem do teste: por nível, do mais fácil ao mais difícil.
      const ordered = CEFR_LEVELS.flatMap((l) => questions.filter((q) => q.level === l));
      const res = await api.put<{ test: LevelTest }>("/api/level-test", {
        questions: ordered.map(stripKey),
        listening: listeningOn ? { youtubeUrl: youtubeUrl.trim(), questions: listeningQuestions.map(stripKey) } : null,
      });
      load(res.test);
      setDirty(false);
      setMessage({ ok: true, text: t("Teste salvo! Quem fizer a partir de agora já pega esta versão.", "Test saved! Anyone taking it from now on gets this version.") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : t("Não foi possível salvar.", "Couldn't save.") });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p>
            {t(
              "Cada pergunta mede um nível. O aluno sobe de nível enquanto acertar pelo menos 60% das perguntas daquele nível — o resultado é o último nível em que ele passou.",
              "Each question measures one level. The student moves up while getting at least 60% of a level's questions right — the result is the last level they passed.",
            )}
          </p>
          <p>
            {t(
              "Clique na letra ao lado de uma opção pra marcar a resposta certa (fica verde). O ideal é ter pelo menos 5 perguntas por nível.",
              "Click the letter next to an option to mark the correct answer (it turns green). Aim for at least 5 questions per level.",
            )}
          </p>
        </CardContent>
      </Card>

      {CEFR_LEVELS.map((level) => {
        const items = questions.filter((q) => q.level === level);
        return (
          <Card key={level}>
            <CardHeader>
              <CardTitle className="text-base">
                {level} · {t(...LEVEL_INFO[level].name)}
              </CardTitle>
              <CardDescription>
                {items.length} {t("pergunta(s)", "question(s)")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((q, i) => (
                <QuestionEditor
                  key={q.key}
                  q={q}
                  index={i}
                  showLevel
                  onChange={(next) => updateQuestion(q.key, next)}
                  onRemove={() => removeQuestion(q.key)}
                />
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => edit(setQuestions, (prev) => [...prev, emptyQuestion(level)])}>
                <Plus className="h-4 w-4" /> {t(`Pergunta ${level}`, `${level} question`)}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Listening</CardTitle>
            <CardDescription>
              {t(
                "Opcional. Um vídeo do YouTube no fim do teste, com perguntas sobre ele. Escolha o nível de cada pergunta.",
                "Optional. A YouTube video at the end of the test, with questions about it. Pick each question's level.",
              )}
            </CardDescription>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={listeningOn}
              onCheckedChange={(v) => {
                setListeningOn(!!v);
                setDirty(true);
                setMessage(null);
              }}
            />
            {t("Incluir", "Include")}
          </label>
        </CardHeader>
        {listeningOn && (
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="lt-youtube">{t("Link do vídeo no YouTube", "YouTube video link")}</Label>
              <Input
                id="lt-youtube"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setDirty(true);
                  setMessage(null);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            {listeningQuestions.map((q, i) => (
              <QuestionEditor
                key={q.key}
                q={q}
                index={i}
                showLevel
                onChange={(next) => updateListening(q.key, next)}
                onRemove={() => removeListening(q.key)}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => edit(setListeningQuestions, (prev) => [...prev, emptyQuestion("A2")])}
            >
              <Plus className="h-4 w-4" /> {t("Pergunta de listening", "Listening question")}
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("Salvar teste", "Save test")}
        </Button>
        {defaultTest && (
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-4 w-4" /> {t("Voltar às perguntas padrão", "Restore default questions")}
          </Button>
        )}
        {message && <p className={cn("text-sm", message.ok ? "text-green-700 dark:text-green-400" : "text-destructive")}>{message.text}</p>}
        {!message && dirty && <p className="text-sm text-muted-foreground">{t("Alterações não salvas", "Unsaved changes")}</p>}
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Voltar às perguntas padrão?", "Restore default questions?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "As perguntas na tela voltam para a primeira versão. Nada muda de verdade até você clicar em \"Salvar teste\".",
                "The questions on screen go back to the first version. Nothing really changes until you click \"Save test\".",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (defaultTest) load(defaultTest);
                setDirty(true);
                setMessage(null);
              }}
            >
              {t("Voltar às padrão", "Restore defaults")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
