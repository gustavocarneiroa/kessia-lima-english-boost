import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { DONT_KNOW, type LevelTestAttemptDetail, type LevelTestQuestion } from "@/lib/levelTest";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import LevelTestResult from "./LevelTestResult";

// Professora: resultado completo de uma tentativa — nível, acertos por nível e cada
// pergunta com o que o aluno marcou e a resposta certa.
export default function LevelTestAttemptDialog({ attemptId, onClose }: { attemptId: string | null; onClose: () => void }) {
  const { t } = usePortalPrefs();
  const [detail, setDetail] = useState<LevelTestAttemptDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setDetail(null);
    setFailed(false);
    if (!attemptId) return;
    api
      .get<LevelTestAttemptDetail>(`/api/level-test/attempts/${attemptId}`)
      .then(setDetail)
      .catch(() => setFailed(true));
  }, [attemptId]);

  const questions: LevelTestQuestion[] = detail ? [...detail.questions, ...(detail.listening?.questions ?? [])] : [];
  const grammarCount = detail?.questions.length ?? 0;

  return (
    <Dialog open={!!attemptId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("Teste de nível", "Level test")}
            {detail && ` — ${detail.studentName}`}
          </DialogTitle>
        </DialogHeader>
        {failed ? (
          <p className="py-6 text-center text-sm text-destructive">{t("Não foi possível abrir esse resultado.", "Couldn't open this result.")}</p>
        ) : !detail ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <LevelTestResult attempt={detail} compact />
            <ol className="space-y-3 border-t pt-4">
              {questions.map((q, i) => {
                const answer = detail.answers[i];
                const ok = answer === q.correctIndex;
                return (
                  <li key={i} className="space-y-1 text-sm">
                    {i === grammarCount && detail.listening && (
                      <p className="pb-1 pt-2 font-medium">
                        Listening ·{" "}
                        <a
                          href={`https://www.youtube.com/watch?v=${detail.listening.youtubeVideoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          {t("ver vídeo", "watch video")}
                        </a>
                      </p>
                    )}
                    <div className="flex items-start gap-2">
                      {ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-line">
                          <Badge variant="outline" className="mr-1.5 px-1.5 py-0 text-[10px]">
                            {q.level}
                          </Badge>
                          {i + 1}. {q.prompt}
                        </p>
                        {!ok && (
                          <p className="text-muted-foreground">
                            {answer === DONT_KNOW || answer === undefined
                              ? t("Marcou \"não sei\"", "Picked \"I don't know\"")
                              : `${t("Marcou", "Picked")}: ${q.options[answer] ?? "—"}`}{" "}
                            · {t("Certa", "Correct")}: <span className="font-medium text-foreground">{q.options[q.correctIndex]}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
