// Cálculo do orçamento (aba "Orçamentos" do portal) — mesma lógica do antigo
// gustavocarneiroa.github.io/orcamento, agora com os preços das Configurações.
// Datas sempre como texto "YYYY-MM-DD" e contas em UTC, pra fuso/horário de verão
// nunca deslocar um dia.
import type { GroupType, Pricing, Shift } from "@/lib/pricing";

export const WEEKDAYS = [
  { key: "sunday", pt: "domingo", en: "Sunday" },
  { key: "monday", pt: "segunda-feira", en: "Monday" },
  { key: "tuesday", pt: "terça-feira", en: "Tuesday" },
  { key: "wednesday", pt: "quarta-feira", en: "Wednesday" },
  { key: "thursday", pt: "quinta-feira", en: "Thursday" },
  { key: "friday", pt: "sexta-feira", en: "Friday" },
  { key: "saturday", pt: "sábado", en: "Saturday" },
] as const;

export type WeekdayKey = (typeof WEEKDAYS)[number]["key"];

export const GROUP_LABELS: Record<GroupType, [pt: string, en: string]> = {
  individual: ["Individual", "Individual"],
  duo: ["Dupla", "Pair"],
  trio: ["Trio", "Trio"],
};

export interface QuoteDay {
  selected: boolean;
  time: string; // "HH:MM" ou ""
  hours: number;
}

// Dias em que a professora não dá aula (aba "Calendário"): feriados nacionais e
// Dia do Professor entram sozinhos; férias e folgas ela adiciona. start === end
// para um dia só. Valem pra todos os orçamentos e pro calendário dos alunos.
export interface DayOff {
  id: string;
  start: string;
  end: string;
  label: string;
  kind: "holiday" | "teacher_day" | "custom";
}

export interface QuoteForm {
  studentName: string;
  phone: string;
  email: string;
  startDate: string;
  durationMonths: number; // 0 = data final escolhida à mão
  endDate: string;
  days: QuoteDay[]; // índice = dia da semana (0 = domingo)
  groupType: GroupType;
  rates: Record<Shift, number>; // valor da hora/aula por pessoa
  durationDiscount: number; // %
  upfrontDiscount: number; // % extra pra pagamento à vista
  travelPerClass: number; // R$ por aula (aula presencial)
  installments: number;
}

export function emptyQuoteForm(pricing: Pricing): QuoteForm {
  return {
    studentName: "",
    phone: "",
    email: "",
    startDate: "",
    durationMonths: 6,
    endDate: "",
    days: WEEKDAYS.map(() => ({ selected: false, time: "", hours: 1 })),
    groupType: "individual",
    rates: { day: pricing.day.individual, night: pricing.night.individual },
    durationDiscount: pricing.durationDiscounts["6"],
    upfrontDiscount: 0,
    travelPerClass: 0,
    installments: 6,
  };
}

// ---------- datas ----------

function toUtc(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDays(key: string, days: number) {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toKey(d);
}

function daysInMonth(year: number, month0: number) {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

// Mesmo dia N meses depois (31/01 + 1 mês = 28/02), sem estourar o mês.
export function addMonths(key: string, months: number) {
  const [y, m, d] = key.split("-").map(Number);
  const total = m - 1 + months;
  const year = y + Math.floor(total / 12);
  const month0 = ((total % 12) + 12) % 12;
  const day = Math.min(d, daysInMonth(year, month0));
  return toKey(new Date(Date.UTC(year, month0, day)));
}

// Contrato de 6 meses começando 17/09 termina 17/03 (como nos contratos da professora).
export function endDateFor(startDate: string, months: number) {
  return addMonths(startDate, months);
}

export function formatDateBr(key: string) {
  const [y, m, d] = key.split("-");
  return y && m && d ? `${d}/${m}/${y}` : key;
}

export function weekdayOf(key: string) {
  return toUtc(key).getUTCDay();
}

export function yearsBetween(start: string, end: string) {
  const years: number[] = [];
  for (let y = Number(start.slice(0, 4)); y <= Number(end.slice(0, 4)); y++) years.push(y);
  return years;
}

// ---------- turno ----------

export function shiftOf(time: string, pricing: Pricing): Shift {
  return time && time >= pricing.nightStartsAt ? "night" : "day";
}

// Texto da mensagem: manhã (antes de 12h), tarde, noite (a partir do horário de noite).
export function periodLabel(time: string, pricing: Pricing) {
  if (!time) return "";
  if (time >= pricing.nightStartsAt) return "noite";
  return time < "12:00" ? "manhã" : "tarde";
}

// ---------- cálculo ----------

export interface QuoteDayResult {
  weekday: number;
  classes: number;
  hours: number;
  shift: Shift;
  rate: number;
  value: number;
}

export interface QuoteResult {
  valid: boolean;
  days: QuoteDayResult[];
  totalClasses: number;
  totalHours: number;
  grossValue: number; // horas × valor da hora, sem desconto
  packageValue: number; // com desconto da duração
  travelValue: number;
  installmentTotal: number; // pacote + deslocamento
  installmentValue: number;
  upfrontTotal: number; // com desconto à vista + deslocamento
  months: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function dayOffOn(key: string, daysOff: DayOff[]) {
  return daysOff.find((p) => key >= p.start && key <= p.end);
}

// Meses entre as datas (17/09 → 17/03 = 6; 13/10 → 12/04 também conta 6).
export function monthsBetween(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = addDays(end, 1).split("-").map(Number);
  const months = (ey - sy) * 12 + (em - sm) - (ed < sd ? 1 : 0);
  return Math.max(1, months);
}

export interface ScheduledClass {
  weekday: number;
  time: string;
  hours: number;
}

// Todas as datas de aula do período: cada dia da semana do horário, menos os dias sem aula.
export function classDates(start: string, end: string, schedule: ScheduledClass[], daysOff: DayOff[]) {
  const byWeekday = new Map(schedule.map((s) => [s.weekday, s]));
  const dates: (ScheduledClass & { date: string })[] = [];
  for (let key = start; key <= end; key = addDays(key, 1)) {
    const slot = byWeekday.get(weekdayOf(key));
    if (slot && !dayOffOn(key, daysOff)) dates.push({ ...slot, date: key });
  }
  return dates;
}

export function calculateQuote(form: QuoteForm, pricing: Pricing, daysOff: DayOff[]): QuoteResult {
  const selected = form.days.map((d, weekday) => ({ ...d, weekday })).filter((d) => d.selected);
  const valid =
    isDateKey(form.startDate) && isDateKey(form.endDate) && form.endDate >= form.startDate && selected.length > 0;

  const counts = new Array(7).fill(0);
  if (valid) {
    for (let key = form.startDate; key <= form.endDate; key = addDays(key, 1)) {
      if (!dayOffOn(key, daysOff)) counts[weekdayOf(key)]++;
    }
  }

  const days = selected.map((d) => {
    const shift = shiftOf(d.time, pricing);
    const rate = form.rates[shift] || 0;
    const classes = counts[d.weekday];
    const hours = d.hours || 0;
    return { weekday: d.weekday, classes, hours, shift, rate, value: classes * hours * rate };
  });

  const totalClasses = days.reduce((acc, d) => acc + d.classes, 0);
  const totalHours = days.reduce((acc, d) => acc + d.classes * d.hours, 0);
  const grossValue = round2(days.reduce((acc, d) => acc + d.value, 0));
  const packageValue = round2(grossValue * (1 - (form.durationDiscount || 0) / 100));
  const travelValue = round2(totalClasses * (form.travelPerClass || 0));
  const installments = Math.max(1, Math.floor(form.installments || 1));
  const installmentTotal = round2(packageValue + travelValue);
  const upfrontTotal = round2(packageValue * (1 - (form.upfrontDiscount || 0) / 100) + travelValue);

  return {
    valid,
    days,
    totalClasses,
    totalHours,
    grossValue,
    packageValue,
    travelValue,
    installmentTotal,
    installmentValue: round2(installmentTotal / installments),
    upfrontTotal,
    months: valid ? monthsBetween(form.startDate, form.endDate) : 0,
  };
}

export function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Telefone no formato (85) 99999-9999 enquanto digita.
export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatHours(h: number) {
  return `${String(h).replace(".", ",")}h`;
}

// Mesmo texto do orçamento antigo, com as linhas de à vista/deslocamento quando houver.
export function whatsappMessage(form: QuoteForm, result: QuoteResult, pricing: Pricing) {
  const group = GROUP_LABELS[form.groupType][0].toUpperCase();
  const perPerson = form.groupType === "individual" ? "" : " individual";
  const installments = Math.max(1, Math.floor(form.installments || 1));
  const lines = [
    `*Orçamento Particular (${group})*`,
    "",
    `- ${result.days.length} vez(es) na semana por ${result.months} meses:`,
    ...result.days.map((d) => {
      const day = form.days[d.weekday];
      const period = periodLabel(day.time, pricing);
      return `${capitalize(WEEKDAYS[d.weekday].pt)}${period ? ` (${period})` : ""}: ${formatHours(d.hours)}`;
    }),
    `Início do contrato: ${formatDateBr(form.startDate)}`,
    `Fim do contrato: ${formatDateBr(form.endDate)}`,
    `Total de aulas: ${result.totalClasses}`,
    "",
    `Valor total do pacote${perPerson}: ${formatBrl(result.installmentTotal)}`,
    `Valor por parcela${perPerson}: ${installments}x ${formatBrl(result.installmentValue)}`,
  ];
  if (form.upfrontDiscount > 0) {
    lines.push(`Valor à vista${perPerson} (${form.upfrontDiscount}% de desconto): ${formatBrl(result.upfrontTotal)}`);
  }
  if (result.travelValue > 0) {
    lines.push(`(inclui ${formatBrl(result.travelValue)} de deslocamento para as aulas presenciais)`);
  }
  lines.push(
    "",
    "- Esse valor já foi retirado os feriados nacionais e as semanas de férias que ocorrem no decorrer no ano.",
  );
  return lines.join("\n");
}

export function whatsappUrl(phone: string, message: string) {
  return `https://api.whatsapp.com/send/?phone=55${phone.replace(/\D/g, "")}&text=${encodeURIComponent(message)}`;
}

// ---------- parcelas do contrato ----------

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export interface PlannedPayment {
  description: string;
  amountCents: number;
  dueDate: string;
}

function dueDateIn(year: number, month0: number, dueDay: number) {
  const day = Math.min(dueDay, daysInMonth(year, month0));
  return toKey(new Date(Date.UTC(year, month0, day)));
}

// Como no contrato (cláusula 8.1): a 1ª parcela é paga no ato da assinatura; as
// outras vencem no dia escolhido de cada mês seguinte.
export function planInstallments(signDate: string, dueDay: number, count: number, totalCents: number): PlannedPayment[] {
  const [y, m] = signDate.split("-").map(Number);

  // Centavos que sobram da divisão vão na última parcela, pra soma bater com o total.
  const base = Math.floor(totalCents / count);
  const payments: PlannedPayment[] = [];
  for (let i = 0; i < count; i++) {
    const total0 = m - 1 + i;
    const py = y + Math.floor(total0 / 12);
    const pm0 = total0 % 12;
    payments.push({
      description: `Mensalidade ${MONTH_NAMES[pm0]}/${py} (${i + 1}/${count})${i === 0 ? " — na assinatura" : ""}`,
      amountCents: i === count - 1 ? totalCents - base * (count - 1) : base,
      dueDate: i === 0 ? signDate : dueDateIn(py, pm0, dueDay),
    });
  }
  return payments;
}

// Perfil antigo só tinha um dia/horário fixo; o contrato novo grava a lista completa.
const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function scheduleFromProfile(profile: {
  classSchedule?: string | null;
  classWeekday?: string | null;
  classTime?: string | null;
}): ScheduledClass[] {
  if (profile.classSchedule) {
    try {
      const parsed = JSON.parse(profile.classSchedule);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // cai no formato antigo
    }
  }
  const weekday = WEEKDAY_KEYS.indexOf(profile.classWeekday ?? "");
  return weekday >= 0 ? [{ weekday, time: profile.classTime ?? "", hours: 1 }] : [];
}
