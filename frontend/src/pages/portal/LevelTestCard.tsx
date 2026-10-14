import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import type { LevelTestAttempt } from "@/lib/levelTest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import LevelTestResult from "./LevelTestResult";
import LevelTestAttemptDialog from "./LevelTestAttemptDialog";

// Página do aluno (visão da professora): situação do teste de nível, último resultado
// e o botão de liberar/cancelar. Ao terminar, o nível vai sozinho pro campo do perfil.
export default function LevelTestCard({ studentId }: { studentId: string }) {
  const { t, locale } = usePortalPrefs();
  const [data, setData] = useState<{ assignedAt: string | null; attempts: LevelTestAttempt[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);

  const reload = () =>
    api
      .get<{ assignedAt: string | null; attempts: LevelTestAttempt[] }>(`/api/level-test/students/${studentId}`)
      .then(setData)
      .catch(() => setData(null));

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function toggleAssignment() {
    setBusy(true);
    try {
      if (data?.assignedAt) await api.delete(`/api/level-test/assignments/${studentId}`);
      else await api.post("/api/level-test/send", { studentIds: [studentId] });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  const last = data.attempts[0];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">{t("Teste de nível", "Level test")}</CardTitle>
          <CardDescription>
            {data.assignedAt ? (
              <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                {t("Liberado · aguardando o aluno", "Released · waiting for the student")}
              </Badge>
            ) : last ? (
              t("O nível do último teste já está no perfil abaixo.", "The latest test's level is already in the profile below.")
            ) : (
              t("Ainda não fez o teste.", "Hasn't taken the test yet.")
            )}
          </CardDescription>
        </div>
        <Button size="sm" variant={data.assignedAt ? "outline" : "default"} className="gap-2" disabled={busy} onClick={toggleAssignment}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : !data.assignedAt && <Send className="h-4 w-4" />}
          {data.assignedAt
            ? t("Cancelar liberação", "Cancel release")
            : last
              ? t("Liberar pra refazer", "Release a retake")
              : t("Liberar teste", "Release test")}
        </Button>
      </CardHeader>
      {last && (
        <CardContent className="space-y-4">
          <LevelTestResult attempt={last} compact />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Button variant="link" className="h-auto p-0" onClick={() => setOpenAttempt(last.id)}>
              {t("Ver respostas", "See answers")}
            </Button>
            {data.attempts.slice(1).map((a) => (
              <button key={a.id} type="button" className="text-muted-foreground hover:underline" onClick={() => setOpenAttempt(a.id)}>
                {new Date(a.submittedAt).toLocaleDateString(locale, { dateStyle: "short" })}: {a.level}
              </button>
            ))}
          </div>
        </CardContent>
      )}
      <LevelTestAttemptDialog attemptId={openAttempt} onClose={() => setOpenAttempt(null)} />
    </Card>
  );
}
