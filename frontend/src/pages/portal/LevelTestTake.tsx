import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { buildTestSequence, CEFR_LEVELS, DONT_KNOW, formatTimestamp, splitPrompt, type CefrLevel, type LevelTestAttempt, type ListeningPart } from "@/lib/levelTest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, ArrowRight, CheckCircle2, Gauge, Headphones, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import LevelTestResult from "./LevelTestResult";
import LevelTestPrompt from "./LevelTestPrompt";

interface StudentQuestion {
  level: CefrLevel;
  prompt: string;
  options: string[];
  startSeconds?: number;
}

interface MyLevelTest {
  assignedAt: string | null;
  test: {
    questions: StudentQuestion[];
    listening: ListeningPart<StudentQuestion>[];
  } | null;
  attempts: LevelTestAttempt[];
}

// Respostas em andamento ficam neste aparelho, pra quem fechar a página no meio não
// perder o que já respondeu. A chave muda a cada novo envio da professora.
const draftKey = (assignedAt: string) => `portal.levelTest.${assignedAt}`;

function readDraft(assignedAt: string): Record<number, number> {
  try {
    const raw = localStorage.getItem(draftKey(assignedAt));
    return raw ? (JSON.parse(raw) as Record<number, number>) : {};
  } catch {
    return {};
  }
}

function writeDraft(assignedAt: string, answers: Record<number, number> | null) {
  try {
    if (answers) localStorage.setItem(draftKey(assignedAt), JSON.stringify(answers));
    else localStorage.removeItem(draftKey(assignedAt));
  } catch {
    // sem armazenamento — só não lembra das respostas
  }
}

export default function LevelTestTake() {
  const { t, locale } = usePortalPrefs();
  const [data, setData] = useState<MyLevelTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [confirming, setConfirming] = useState(false);
  const [stoppingEarly, setStoppingEarly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LevelTestAttempt | null>(null);

  useEffect(() => {
    api
      .get<MyLevelTest>("/api/me/level-test")
      .then((d) => {
        setData(d);
        if (d.assignedAt) setAnswers(readDraft(d.assignedAt));
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const slots = useMemo(() => (data?.test ? buildTestSequence(data.test.questions, data.test.listening) : []), [data]);
  const questions = useMemo(() => slots.map((s) => s.question), [slots]);

  function choose(value: number) {
    const next = { ...answers, [current]: value };
    setAnswers(next);
    if (data?.assignedAt) writeDraft(data.assignedAt, next);
    if (current < questions.length - 1) setTimeout(() => setCurrent((c) => Math.min(c + 1, questions.length - 1)), 200);
  }

  async function submit() {
    if (!data?.assignedAt) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = questions.map((_, i) => answers[i] ?? DONT_KNOW);
      const res = await api.post<LevelTestAttempt>("/api/me/level-test/submit", { answers: payload });
      writeDraft(data.assignedAt, null);
      setResult(res);
      setData({ ...data, assignedAt: null, test: null, attempts: [res, ...data.attempts] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível enviar suas respostas.", "Couldn't send your answers."));
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  const header = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("Teste de nível", "Level test")}</h1>
      <p className="text-muted-foreground">
        {t("Descubra seu nível de inglês na escala internacional (A1 a C2).", "Find out your English level on the international scale (A1 to C2).")}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Acabou de terminar
  if (result) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> {t("Teste concluído!", "Test complete!")}
            </CardTitle>
            <CardDescription>
              {t(
                "Seu nível já foi salvo no seu perfil. A professora também recebe o resultado.",
                "Your level has been saved to your profile. Your teacher gets the result too.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LevelTestResult attempt={result} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Não liberado agora: mostra o último resultado, se houver
  if (!data?.assignedAt || !data.test) {
    const last = data?.attempts[0];
    return (
      <div className="space-y-6">
        {header}
        {last ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Seu último resultado", "Your latest result")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <LevelTestResult attempt={last} />
              {data.attempts.length > 1 && (
                <div className="space-y-1 border-t pt-4 text-sm">
                  <p className="font-medium">{t("Testes anteriores", "Previous tests")}</p>
                  {data.attempts.slice(1).map((a) => (
                    <p key={a.id} className="text-muted-foreground">
                      {new Date(a.submittedAt).toLocaleDateString(locale, { dateStyle: "short" })} — {a.level} ({a.score}/{a.total})
                    </p>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {t(
                  "Quer refazer o teste? Peça pra professora liberar de novo.",
                  "Want to take the test again? Ask your teacher to release it again.",
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
              <Gauge className="h-5 w-5 shrink-0" />
              {t(
                "O teste de nível ainda não foi liberado pra você. Quando a professora liberar, ele aparece aqui.",
                "The level test hasn't been released to you yet. When your teacher releases it, it shows up here.",
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Liberado, ainda não começou
  if (!started) {
    const answered = Object.keys(answers).length;
    return (
      <div className="space-y-6">
        {header}
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" /> {t("Seu teste está pronto", "Your test is ready")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                {questions.length} {t("perguntas de múltipla escolha, das mais fáceis às mais difíceis.", "multiple-choice questions, from easiest to hardest.")}
              </li>
              {data.test.listening.length === 1 && (
                <li>{t("No meio do teste tem uma parte de listening com vídeo — use fone de ouvido se puder.", "Partway through there's a listening part with a video — use headphones if you can.")}</li>
              )}
              {data.test.listening.length > 1 && (
                <li>
                  {t(
                    `No meio do teste tem ${data.test.listening.length} partes de listening com vídeo, uma em cada nível — use fone de ouvido se puder.`,
                    `Partway through there are ${data.test.listening.length} listening parts with video, one per level — use headphones if you can.`,
                  )}
                </li>
              )}
              <li>{t("Não tem tempo limite. Leva uns 20 a 30 minutos.", "There's no time limit. It takes about 20 to 30 minutes.")}</li>
              <li>
                {t(
                  "Não sabe a resposta? Clique em \"Não sei\" em vez de chutar — assim o resultado fica mais certinho.",
                  "Don't know the answer? Click \"I don't know\" instead of guessing — that makes the result more accurate.",
                )}
              </li>
              <li>{t("Sem consultar dicionário ou tradutor, combinado? 😉", "No dictionaries or translators, deal? 😉")}</li>
            </ul>
            <Button
              onClick={() => {
                const firstUnanswered = questions.findIndex((_, i) => answers[i] === undefined);
                setCurrent(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered);
                setStarted(true);
              }}
            >
              {answered > 0 ? t("Continuar de onde parei", "Continue where I left off") : t("Começar o teste", "Start the test")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Respondendo
  const q = questions[current];
  const video = slots[current]?.video ?? null;
  const startSeconds = q.startSeconds ?? 0;
  const answeredCount = questions.filter((_, i) => answers[i] !== undefined).length;
  const isLast = current === questions.length - 1;
  const unanswered = questions.length - answeredCount;
  // A partir do B1 deixa o aluno parar se achar os níveis mais altos difíceis demais — o nível
  // registrado é só até onde ele foi bem, então parar aqui não piora o resultado já alcançado.
  const canStopEarly = !isLast && answeredCount < questions.length && CEFR_LEVELS.indexOf(q.level) >= 2;

  return (
    <div className="space-y-6">
      {header}

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {t("Pergunta", "Question")} {current + 1} {t("de", "of")} {questions.length}
          </span>
          <span>
            {answeredCount} {t("respondidas", "answered")}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </div>

      {video && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Headphones className="h-4 w-4 text-primary" /> Listening
              {data.test.listening.length > 1 && (
                <span className="font-normal text-muted-foreground">
                  · {t("vídeo", "video")} {video.number} {t("de", "of")} {data.test.listening.length}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {startSeconds > 0
                ? t(
                    `O vídeo já começa perto do trecho desta pergunta (${formatTimestamp(startSeconds)}). Pode voltar ou assistir de novo quantas vezes quiser.`,
                    `The video starts near this question's part (${formatTimestamp(startSeconds)}). Feel free to rewind or rewatch as many times as you like.`,
                  )
                : t("Assista ao vídeo (quantas vezes quiser) e responda às perguntas.", "Watch the video (as many times as you like) and answer the questions.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-video w-full">
              <iframe
                key={`${video.part.youtubeVideoId}-${startSeconds}`}
                src={`https://www.youtube.com/embed/${video.part.youtubeVideoId}?start=${startSeconds}`}
                className="h-full w-full"
                style={{ border: 0 }}
                title="Listening"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          {splitPrompt(q.prompt).passage && <p className="text-sm font-medium text-muted-foreground">Reading</p>}
          <LevelTestPrompt prompt={q.prompt} className="text-lg font-medium leading-relaxed" passageClassName="text-base" />
        </CardHeader>
        <CardContent className="space-y-2">
          {q.options.map((opt, oi) => (
            <button
              key={oi}
              type="button"
              onClick={() => choose(oi)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted",
                answers[current] === oi && "border-primary bg-primary/10 hover:bg-primary/10",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  answers[current] === oi && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {String.fromCharCode(65 + oi)}
              </span>
              <span>{opt}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => choose(DONT_KNOW)}
            className={cn(
              "w-full rounded-lg border border-dashed px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted",
              answers[current] === DONT_KNOW && "border-solid border-primary bg-primary/10 text-foreground",
            )}
          >
            {t("Não sei", "I don't know")}
          </button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("Anterior", "Previous")}
        </Button>
        <div className="flex items-center gap-2">
          {canStopEarly && (
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                setStoppingEarly(true);
                setConfirming(true);
              }}
            >
              {t("Terminar por aqui", "Finish here")}
            </Button>
          )}
          {isLast || answeredCount === questions.length ? (
            <Button
              onClick={() => {
                setStoppingEarly(false);
                setConfirming(true);
              }}
            >
              {t("Terminar e ver meu nível", "Finish and see my level")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setCurrent((c) => c + 1)}>
              {t("Próxima", "Next")} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {canStopEarly && (
        <p className="text-center text-xs text-muted-foreground">
          {t(
            "Achando os níveis mais altos difíceis? Pode terminar por aqui — seu nível é baseado no que você já acertou.",
            "Finding the higher levels too hard? You can finish here — your level is based on what you've already gotten right.",
          )}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <AlertDialog open={confirming} onOpenChange={(open) => !submitting && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Terminar o teste?", "Finish the test?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {stoppingEarly && (
                <>
                  {t(
                    "Tudo bem! Seu nível fica no último em que você foi bem — as perguntas mais difíceis que faltam não entram no resultado.",
                    "That's okay! Your level stays at the last one you did well in — the harder remaining questions won't count against your result.",
                  )}
                  <br />
                  <br />
                </>
              )}
              {unanswered > 0
                ? t(
                    `Ainda tem ${unanswered} pergunta(s) sem resposta — elas vão contar como "não sei".`,
                    `There are still ${unanswered} unanswered question(s) — they'll count as "I don't know".`,
                  )
                : t("Depois de enviar não dá pra mudar as respostas.", "Once you send it, you can't change your answers.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>{t("Voltar", "Go back")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Enviar respostas", "Send answers")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
