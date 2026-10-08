import { useState } from "react";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { addDays, dayOffOn, weekdayOf, type DayOff, type ScheduledClass } from "@/lib/quote";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEK_HEADERS: [pt: string, en: string][] = [
  ["Dom", "Sun"],
  ["Seg", "Mon"],
  ["Ter", "Tue"],
  ["Qua", "Wed"],
  ["Qui", "Thu"],
  ["Sex", "Fri"],
  ["Sáb", "Sat"],
];

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

// Mês em grade. Com "schedule", marca os dias de aula do aluno dentro do contrato;
// dias sem aula da professora aparecem sempre.
export default function MonthCalendar({
  daysOff,
  schedule = [],
  contractStart,
  contractEnd,
  initialMonth,
}: {
  daysOff: DayOff[];
  schedule?: ScheduledClass[];
  contractStart?: string | null;
  contractEnd?: string | null;
  initialMonth?: string; // "YYYY-MM"
}) {
  const { t, locale } = usePortalPrefs();
  const today = todayKey();
  const [month, setMonth] = useState(initialMonth ?? today.slice(0, 7));

  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const leading = weekdayOf(first);
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7) cells.push(null);

  const byWeekday = new Map(schedule.map((s) => [s.weekday, s]));
  const inContract = (key: string) =>
    (!contractStart || key >= contractStart) && (!contractEnd || key <= contractEnd);

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const title = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label={t("Mês anterior", "Previous month")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-semibold capitalize">{title}</p>
        <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label={t("Próximo mês", "Next month")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEK_HEADERS.map((h) => (
          <div key={h[0]}>{t(...h)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) => {
          if (!key) return <div key={i} />;
          const off = dayOffOn(key, daysOff);
          const slot = byWeekday.get(weekdayOf(key));
          const isClass = !!slot && inContract(key);
          return (
            <div
              key={key}
              title={off?.label}
              className={cn(
                "flex min-h-[3.5rem] flex-col rounded-md border p-1 text-left text-xs sm:min-h-[4.5rem] sm:p-1.5",
                key === today && "ring-2 ring-primary",
                off && "border-destructive/30 bg-destructive/10",
                !off && isClass && "border-primary/40 bg-primary/10",
              )}
            >
              <span className={cn("font-medium", off && "text-destructive")}>{Number(key.slice(8))}</span>
              {off ? (
                <span className="line-clamp-2 text-[10px] leading-tight text-destructive sm:text-[11px]">
                  {isClass ? t("Sem aula", "No class") + " · " : ""}
                  {off.label}
                </span>
              ) : isClass ? (
                <span className="text-[10px] font-medium text-primary sm:text-[11px]">
                  {t("Aula", "Class")} {slot!.time}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {schedule.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-primary/40 bg-primary/10" />
            {t("Dia de aula", "Class day")}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-destructive/30 bg-destructive/10" />
          {t("Sem aula (feriado, férias, folga)", "No class (holiday, vacation, day off)")}
        </span>
      </div>
    </div>
  );
}
