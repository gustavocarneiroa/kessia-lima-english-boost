// Contrato de prestação de serviços (gerado ao "virar contrato" um orçamento).
// Texto igual ao modelo da professora; só os dados do aluno/plano mudam.
import type { GroupType } from "@/lib/pricing";
import { WEEKDAYS, type ScheduledClass } from "@/lib/quote";

export const CONTRACTOR = {
  businessName: "Teacher Késsia Lima",
  responsible: "Kelma Késsia Lima Carneiro",
  cnpj: "46.473.017/0001-67",
  email: "kessia.lima@teacherkessialima.com.br",
  phone: "(85) 99736-2806",
  bank: ["Cora SCD - 403 / Agência - 0001", "Conta corrente - 4993951-6"],
};

export const DEFAULT_SIGN_CITY = "Caucaia - CE";
export const DEFAULT_PLAN_EXTRAS = "material usado em aula e conteúdos extras ao Google Classroom";

export interface ContractData {
  student: {
    fullName: string;
    document: string; // RG/CPF
    address: string;
    phone: string;
    email: string;
  };
  groupType: GroupType;
  schedule: ScheduledClass[];
  totalClasses: number;
  months: number;
  startDate: string;
  endDate: string;
  paymentMode: "installments" | "upfront";
  installments: number;
  installmentCents: number;
  totalCents: number;
  dueDay: number;
  planExtras: string;
  signCity: string;
  signDate: string;
}

// ---------- números por extenso ----------

const UNITS = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos",
  "setecentos", "oitocentos", "novecentos"];

function below1000(n: number): string {
  if (n === 100) return "cem";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest) {
    if (rest < 20) parts.push(UNITS[rest]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
    }
  }
  return parts.join(" e ");
}

// 266 → "duzentos e sessenta e seis"; 1500 → "mil e quinhentos"
export function numberToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 20) return UNITS[n];
  if (n < 1000) return below1000(n);
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const head = thousands === 1 ? "mil" : `${below1000(thousands)} mil`;
    if (!rest) return head;
    // "e" só quando o resto é "redondo" (mil e quinhentos) ou menor que 100 (mil e vinte)
    const joiner = rest < 100 || rest % 100 === 0 ? " e " : " ";
    return head + joiner + below1000(rest);
  }
  return String(n);
}

// "um/uma", "dois/duas" pra palavras femininas (aula, parcela)
export function numberToWordsFem(n: number): string {
  return numberToWords(n)
    .replace(/\bum\b/g, "uma")
    .replace(/\bdois\b/g, "duas")
    .replace(/duzentos/g, "duzentas")
    .replace(/(trezent|quatrocent|quinhent|seiscent|setecent|oitocent|novecent)os/g, "$1as");
}

// 26600 → "duzentos e sessenta e seis reais"; 26650 → "... reais e cinquenta centavos"
export function centsToWords(cents: number): string {
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const parts: string[] = [];
  if (reais) parts.push(`${numberToWords(reais)} ${reais === 1 ? "real" : "reais"}`);
  if (centavos) parts.push(`${numberToWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return parts.join(" e ") || "zero reais";
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

// ---------- trechos do texto ----------

const PLURAL_DAYS: Record<string, string> = {
  domingo: "domingos",
  "segunda-feira": "segundas-feiras",
  "terça-feira": "terças-feiras",
  "quarta-feira": "quartas-feiras",
  "quinta-feira": "quintas-feiras",
  "sexta-feira": "sextas-feiras",
  sábado: "sábados",
};

export function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export function sortedSchedule(schedule: ScheduledClass[]) {
  // segunda primeiro, domingo por último
  return [...schedule].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
}

export const dayName = (weekday: number) => WEEKDAYS[weekday].pt;
export const dayNamePlural = (weekday: number) => PLURAL_DAYS[WEEKDAYS[weekday].pt];

export function periodOf(time: string) {
  if (time < "12:00") return "manhã";
  if (time < "18:00") return "tarde";
  return "noite";
}

export function minutesText(hours: number) {
  const minutes = Math.round(hours * 60);
  return `${minutes} (${numberToWords(minutes)}) minutos`;
}

export const GROUP_PLAN: Record<GroupType, string> = {
  individual: "Particular",
  duo: "Dupla",
  trio: "Trio",
};

export function formatLongDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
  return `${d} de ${month.charAt(0).toUpperCase()}${month.slice(1)} de ${y}`;
}

// Contrato como o servidor devolve (server/src/modules/contracts/routes.ts).
export interface ContractRecord {
  id: string;
  studentId: string;
  data: ContractData;
  signed: boolean;
  signedUrl: string | null; // modo manual: link colado pela professora
  signedAt: string | null;
  // ZapSign: null = contrato do modo manual
  zapsignStatus: "awaiting_teacher" | "awaiting_student" | "signed" | "refused" | null;
  teacherSignedAt: string | null;
  studentSignedAt: string | null;
  hasSignedPdf: boolean;
  teacherSignUrl: string | null; // só vem pra professora
  studentSignUrl: string | null; // só enquanto é a vez do aluno
  blockAfter: string | null;
  createdAt: string;
}

export const CONTRACT_STATUS_LABELS: Record<string, [pt: string, en: string]> = {
  awaiting_teacher: ["Aguardando a assinatura da teacher", "Awaiting the teacher's signature"],
  awaiting_student: ["Aguardando a assinatura do aluno", "Awaiting the student's signature"],
  signed: ["Assinado", "Signed"],
  refused: ["Recusado", "Refused"],
  manual_pending: ["Aguardando assinatura", "Awaiting signature"],
};

export function contractStatusKey(c: Pick<ContractRecord, "signed" | "zapsignStatus">) {
  if (c.signed) return "signed";
  return c.zapsignStatus ?? "manual_pending";
}
