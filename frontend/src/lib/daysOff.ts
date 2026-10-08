import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DayOff } from "@/lib/quote";

// Lista inteira (são poucas dezenas por ano) — quem usa filtra pelo período que precisa.
export function useDaysOff() {
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      setDaysOff(await api.get<DayOff[]>("/api/days-off"));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { daysOff, loaded, reload };
}

export const DAY_OFF_KIND_LABELS: Record<DayOff["kind"], [pt: string, en: string]> = {
  holiday: ["feriado", "holiday"],
  teacher_day: ["data comemorativa", "special date"],
  custom: ["folga", "day off"],
};
