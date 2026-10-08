import { db, schema } from "../db/client.ts";
import { getSetting, setSetting } from "./settings.ts";
import { todayDateKey } from "./wordleWords.ts";

// Quantos anos à frente (além do atual) os feriados ficam cadastrados.
const YEARS_AHEAD = 2;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

interface BrasilApiHoliday {
  date: string;
  name: string;
}

const syncedFlag = (year: number) => `holidays_synced_${year}`;

// Busca os feriados nacionais do ano na BrasilAPI (ela calcula qualquer ano,
// inclusive Carnaval/Páscoa) e soma o Dia do Professor (15/10). Cada ano é
// importado uma vez só: se a professora apagar um feriado (resolveu dar aula),
// ele não volta na próxima checagem.
async function syncYear(year: number) {
  if (getSetting(syncedFlag(year))) return;

  const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`BrasilAPI respondeu ${res.status} para ${year}`);
  const holidays = (await res.json()) as BrasilApiHoliday[];

  const now = new Date().toISOString();
  const rows = [
    ...holidays.map((h) => ({ start: h.date, label: h.name, kind: "holiday" as const })),
    { start: `${year}-10-15`, label: "Dia do Professor", kind: "teacher_day" as const },
  ];

  db.transaction((tx) => {
    for (const r of rows) {
      tx.insert(schema.daysOff)
        .values({ id: crypto.randomUUID(), start: r.start, end: r.start, label: r.label, kind: r.kind, createdAt: now })
        .run();
    }
  });
  setSetting(syncedFlag(year), now);
}

export async function syncHolidays(log: { info: (msg: string) => void; error: (obj: unknown, msg: string) => void }) {
  const currentYear = Number(todayDateKey().slice(0, 4));
  for (let year = currentYear; year <= currentYear + YEARS_AHEAD; year++) {
    try {
      const already = getSetting(syncedFlag(year));
      await syncYear(year);
      if (!already) log.info(`[feriados] ${year} importado`);
    } catch (err) {
      log.error({ err }, `[feriados] falha ao importar ${year} — tento de novo mais tarde`);
    }
  }
}

// Roda ao subir o servidor e a cada 6h: na virada do ano o novo "ano + 2" entra
// sozinho, e se a BrasilAPI estiver fora do ar a próxima checagem tenta de novo.
export function startHolidaySync(log: Parameters<typeof syncHolidays>[0]) {
  void syncHolidays(log);
  setInterval(() => void syncHolidays(log), CHECK_INTERVAL_MS).unref();
}
