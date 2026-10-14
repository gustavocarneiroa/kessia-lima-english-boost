import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { CEFR_LEVELS, LEVEL_INFO, type LevelTestAttempt } from "@/lib/levelTest";
import { cn } from "@/lib/utils";

// Resultado de um teste de nível: o nível (grande), o que ele significa e os acertos
// por nível. Usado pelo aluno logo depois de terminar e pela professora.
export default function LevelTestResult({ attempt, compact = false }: { attempt: LevelTestAttempt; compact?: boolean }) {
  const { t, locale } = usePortalPrefs();
  const info = LEVEL_INFO[attempt.level];
  const levels = CEFR_LEVELS.filter((l) => (attempt.byLevel[l]?.total ?? 0) > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl bg-primary font-bold text-primary-foreground",
            compact ? "h-14 w-14 text-xl" : "h-20 w-20 text-3xl",
          )}
        >
          {attempt.level}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("font-semibold", compact ? "text-base" : "text-xl")}>{t(...info.name)}</p>
          <p className="text-sm text-muted-foreground">{t(...info.description)}</p>
          <p className="text-xs text-muted-foreground">
            {attempt.score} {t("acertos de", "correct out of")} {attempt.total} ·{" "}
            {new Date(attempt.submittedAt).toLocaleDateString(locale, { dateStyle: "short" })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("Acertos por nível", "Correct answers by level")}</p>
        {levels.map((l) => {
          const { correct, total } = attempt.byLevel[l]!;
          const pct = Math.round((correct / total) * 100);
          return (
            <div key={l} className="flex items-center gap-3 text-sm">
              <span className="w-7 font-medium tabular-nums">{l}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", pct >= 60 ? "bg-primary" : "bg-muted-foreground/40")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-right tabular-nums text-muted-foreground">
                {correct}/{total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
