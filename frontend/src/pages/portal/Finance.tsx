import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, fetchBoletoBlob } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { CalendarPlus, Check, Download, FileUp, Loader2, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;

type PaymentStatus = "paid" | "pending" | "overdue";

interface Payment {
  id: string;
  studentId: string;
  studentEmail?: string | null;
  studentName?: string | null;
  description: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  hasBoleto: boolean;
  status: PaymentStatus;
}

const MAX_BOLETO_BYTES = 5 * 1024 * 1024;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface Summary {
  paidCents: number;
  pendingCents: number;
  overdueCents: number;
}

interface Student {
  id: string;
  email: string;
  fullName?: string | null;
}

const emptyForm = {
  studentId: "",
  description: "",
  amount: "",
  dueDate: "",
};

function formatMoney(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100);
}

// "280", "280,50", "R$ 1.280,50" → centavos
function parseMoney(value: string): number | null {
  let s = value.replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatDate(key: string, locale: string) {
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return locale === "en-US" ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

// "2026-09" → "setembro de 2026" / "September 2026"
function formatMonth(key: string, locale: string) {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = usePortalPrefs();
  if (status === "paid")
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t("Paga", "Paid")}</Badge>;
  if (status === "overdue") return <Badge variant="destructive">{t("Atrasada", "Overdue")}</Badge>;
  return <Badge variant="secondary">{t("Pendente", "Pending")}</Badge>;
}

export default function Finance() {
  const { user } = useAuth();
  const { t, locale } = usePortalPrefs();
  const isTeacher = user?.role === "teacher";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({ paidCents: 0, pendingCents: 0, overdueCents: 0 });
  const [total, setTotal] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [generateMonth, setGenerateMonth] = useState(currentMonthKey());
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{
    created: string[];
    skipped: { name: string; reason: string }[];
  } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [filterStudentId, setFilterStudentId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [editing, setEditing] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleting, setDeleting] = useState<Payment | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const boletoInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<Payment | null>(null);
  const [boletoBusyId, setBoletoBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (filterStudentId) params.set("studentId", filterStudentId);
      if (filterMonth) params.set("month", filterMonth);
      if (filterStatus) params.set("status", filterStatus);
      const res = await api.get<{ items: Payment[]; summary: Summary; total: number }>(
        `/api/payments?${params.toString()}`,
      );
      setPayments(res.items);
      setSummary(res.summary);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStudentId, filterMonth, filterStatus]);

  useEffect(() => {
    if (isTeacher) {
      api.get<Student[]>("/api/students").then(setStudents).catch(() => setStudents([]));
    }
  }, [isTeacher]);

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(s.id, s.fullName || s.email));
    return map;
  }, [students]);

  function clearFilters() {
    setFilterStudentId("");
    setFilterMonth("");
    setFilterStatus("");
    setPage(1);
  }

  const hasFilters = filterStudentId || filterMonth || filterStatus;

  async function selectStudentForNewPayment(studentId: string) {
    setForm((prev) => ({ ...prev, studentId }));
    try {
      const profile = await api.get<{ installmentValue?: string | null }>(`/api/students/${studentId}/profile`);
      const cents = parseMoney(profile.installmentValue ?? "");
      if (cents) {
        setForm((prev) => (prev.studentId === studentId && !prev.amount ? { ...prev, amount: centsToInput(cents) } : prev));
      }
    } catch {
      // sem perfil cadastrado ainda — a professora digita o valor
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountCents = parseMoney(form.amount);
    if (!form.studentId || !form.dueDate || !form.description.trim()) {
      setError(t("Escolha o aluno, a descrição e a data de vencimento.", "Choose the student, description and due date."));
      return;
    }
    if (!amountCents) {
      setError(t("Digite um valor válido, ex: 280,00.", "Enter a valid amount, e.g. 280.00."));
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/payments", {
        studentId: form.studentId,
        description: form.description,
        amountCents,
        dueDate: form.dueDate,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível salvar a cobrança.", "Couldn't save the charge."));
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerateError(null);
    setGenerateResult(null);
    if (!generateMonth) {
      setGenerateError(t("Escolha o mês.", "Choose the month."));
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post<{ created: string[]; skipped: { name: string; reason: string }[] }>(
        "/api/payments/generate-month",
        { month: generateMonth },
      );
      setGenerateResult(res);
      await load();
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : t("Não foi possível gerar as mensalidades.", "Couldn't generate the monthly fees."));
    } finally {
      setGenerating(false);
    }
  }

  async function setPaid(payment: Payment, paid: boolean) {
    setListError(null);
    try {
      await api.put(`/api/payments/${payment.id}`, { paidAt: paid ? todayKey() : null });
      await load();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : t("Não foi possível atualizar a cobrança.", "Couldn't update the charge."));
    }
  }

  function chooseBoleto(payment: Payment) {
    setUploadTarget(payment);
    boletoInputRef.current?.click();
  }

  async function uploadBoleto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const payment = uploadTarget;
    if (!file || !payment) return;
    setListError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setListError(t("O boleto precisa ser um arquivo PDF.", "The boleto must be a PDF file."));
      return;
    }
    if (file.size > MAX_BOLETO_BYTES) {
      setListError(t("Esse PDF é grande demais (máximo 5 MB).", "This PDF is too large (5 MB max)."));
      return;
    }
    setBoletoBusyId(payment.id);
    try {
      const dataUrl = (await readAsDataUrl(file)).replace(/^data:[^;]*;/, "data:application/pdf;");
      await api.put(`/api/payments/${payment.id}/boleto`, { file: dataUrl });
      await load();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : t("Não foi possível anexar o boleto.", "Couldn't attach the boleto."));
    } finally {
      setBoletoBusyId(null);
      setUploadTarget(null);
    }
  }

  async function removeBoleto(payment: Payment) {
    setListError(null);
    setBoletoBusyId(payment.id);
    try {
      await api.delete(`/api/payments/${payment.id}/boleto`);
      await load();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : t("Não foi possível remover o boleto.", "Couldn't remove the boleto."));
    } finally {
      setBoletoBusyId(null);
    }
  }

  async function downloadBoleto(payment: Payment) {
    setListError(null);
    setBoletoBusyId(payment.id);
    try {
      const blob = await fetchBoletoBlob(payment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `boleto-${payment.dueDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : t("Não foi possível baixar o boleto.", "Couldn't download the boleto."));
    } finally {
      setBoletoBusyId(null);
    }
  }

  function openEdit(payment: Payment) {
    setEditing(payment);
    setEditError(null);
    setEditForm({
      studentId: payment.studentId,
      description: payment.description,
      amount: centsToInput(payment.amountCents),
      dueDate: payment.dueDate,
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    const amountCents = parseMoney(editForm.amount);
    if (!editForm.studentId || !editForm.dueDate || !editForm.description.trim()) {
      setEditError(t("Escolha o aluno, a descrição e a data de vencimento.", "Choose the student, description and due date."));
      return;
    }
    if (!amountCents) {
      setEditError(t("Digite um valor válido, ex: 280,00.", "Enter a valid amount, e.g. 280.00."));
      return;
    }
    setEditSaving(true);
    try {
      await api.put(`/api/payments/${editing.id}`, {
        studentId: editForm.studentId,
        description: editForm.description,
        amountCents,
        dueDate: editForm.dueDate,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : t("Não foi possível salvar as alterações.", "Couldn't save the changes."));
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmRemove() {
    if (!deleting) return;
    setListError(null);
    setDeleteSaving(true);
    try {
      await api.delete(`/api/payments/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : t("Não foi possível excluir a cobrança.", "Couldn't delete the charge."));
    } finally {
      setDeleteSaving(false);
    }
  }

  const summaryScope = [
    filterStudentId ? studentNameById.get(filterStudentId) : null,
    filterMonth ? `${t("vencimento em", "due in")} ${formatMonth(filterMonth, locale)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Financeiro", "Payments")}</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? t(
                "Registre as mensalidades de cada aluno, anexe o boleto gerado no app da Cora e marque quando forem pagas.",
                "Record each student's monthly fees, attach the boleto generated in the Cora app, and mark them as paid.",
              )
            : t(
                "Veja suas mensalidades, baixe o boleto e acompanhe se estão pagas, pendentes ou atrasadas.",
                "See your monthly fees, download the boleto, and check whether they're paid, pending or overdue.",
              )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isTeacher ? t("Recebido", "Received") : t("Pago", "Paid")}</CardDescription>
            <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">{formatMoney(summary.paidCents, locale)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isTeacher ? t("A receber", "To receive") : t("A pagar", "To pay")}</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(summary.pendingCents, locale)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("Atrasado", "Overdue")}</CardDescription>
            <CardTitle className="text-2xl text-destructive">{formatMoney(summary.overdueCents, locale)}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      {summaryScope && <p className="-mt-3 text-xs text-muted-foreground">{t("Totais filtrados:", "Filtered totals:")} {summaryScope}</p>}

      {isTeacher && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Gerar mensalidades do mês", "Generate this month's fees")}</CardTitle>
              <CardDescription>
                {t(
                  "Cria de uma vez a mensalidade de cada aluno, usando o valor da parcela e o dia de vencimento do cadastro dele. Quem já tem cobrança no mês é pulado.",
                  "Creates every student's monthly fee at once, using the installment amount and due day from their profile. Anyone who already has a charge that month is skipped.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="generate-month">{t("Mês", "Month")}</Label>
                  <Input
                    id="generate-month"
                    type="month"
                    value={generateMonth}
                    onChange={(e) => setGenerateMonth(e.target.value)}
                    className="w-[180px]"
                  />
                </div>
                <Button onClick={generate} disabled={generating} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                  {t("Gerar mensalidades", "Generate fees")}
                </Button>
              </div>
              {generateError && <p className="text-sm text-destructive">{generateError}</p>}
              {generateResult && (
                <div className="space-y-2 text-sm">
                  <p className="font-medium">
                    {generateResult.created.length === 0
                      ? t("Nenhuma mensalidade nova criada.", "No new fees created.")
                      : t(
                          `${generateResult.created.length} mensalidade(s) criada(s): ${generateResult.created.join(", ")}.`,
                          `${generateResult.created.length} fee(s) created: ${generateResult.created.join(", ")}.`,
                        )}
                  </p>
                  {generateResult.skipped.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                      {generateResult.skipped.map((s) => (
                        <li key={s.name}>
                          {s.name}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Nova cobrança avulsa", "New one-off charge")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={create} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("Aluno", "Student")}</Label>
                    <Select value={form.studentId} onValueChange={(v) => void selectStudentForNewPayment(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("Escolha o aluno", "Choose the student")} />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.fullName || s.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description">{t("Descrição", "Description")}</Label>
                    <Input
                      id="description"
                      placeholder={t("ex: Material didático", "e.g. Course materials")}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="amount">{t("Valor (R$)", "Amount (R$)")}</Label>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      placeholder={t("280,00", "280.00")}
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dueDate">{t("Vencimento", "Due date")}</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {t("Adicionar cobrança", "Add charge")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isTeacher ? t("Cobranças", "Charges") : t("Suas mensalidades", "Your monthly fees")}</CardTitle>
          <CardDescription>{total} {t("cobrança(s)", "charge(s)")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isTeacher && (
              <div className="space-y-1.5">
                <Label>{t("Aluno", "Student")}</Label>
                <Select
                  value={filterStudentId || "all"}
                  onValueChange={(v) => {
                    setFilterStudentId(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Todos os alunos", "All students")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("Todos os alunos", "All students")}</SelectItem>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName || s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="filter-month">{t("Mês do vencimento", "Due month")}</Label>
              <Input
                id="filter-month"
                type="month"
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Situação", "Status")}</Label>
              <Select
                value={filterStatus || "all"}
                onValueChange={(v) => {
                  setFilterStatus(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Todas", "All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todas", "All")}</SelectItem>
                  <SelectItem value="open">{t("Em aberto (pendentes + atrasadas)", "Open (pending + overdue)")}</SelectItem>
                  <SelectItem value="pending">{t("Pendentes", "Pending")}</SelectItem>
                  <SelectItem value="overdue">{t("Atrasadas", "Overdue")}</SelectItem>
                  <SelectItem value="paid">{t("Pagas", "Paid")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-4 gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> {t("Limpar filtros", "Clear filters")}
            </Button>
          ) : null}

          {listError && <p className="mb-3 text-sm text-destructive">{listError}</p>}
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {hasFilters
                ? t("Nenhuma cobrança encontrada com esses filtros.", "No charges match these filters.")
                : t("Nenhuma cobrança cadastrada ainda.", "No charges added yet.")}
            </p>
          ) : (
            <ul className="divide-y">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{payment.description}</p>
                      <StatusBadge status={payment.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{formatMoney(payment.amountCents, locale)}</span>
                      {` · ${t("vence", "due")} ${formatDate(payment.dueDate, locale)}`}
                      {payment.paidAt ? ` · ${t("paga em", "paid on")} ${formatDate(payment.paidAt, locale)}` : ""}
                      {isTeacher
                        ? ` · ${studentNameById.get(payment.studentId) ?? payment.studentName ?? payment.studentEmail ?? ""}`
                        : ""}
                    </p>
                  </div>

                  {!isTeacher && payment.hasBoleto && !payment.paidAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 self-start sm:self-auto"
                      disabled={boletoBusyId === payment.id}
                      onClick={() => downloadBoleto(payment)}
                    >
                      {boletoBusyId === payment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {t("Baixar boleto", "Download boleto")}
                    </Button>
                  )}

                  {isTeacher && (
                    <div className="flex flex-wrap items-center gap-2">
                      {payment.hasBoleto ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={boletoBusyId === payment.id}
                            onClick={() => downloadBoleto(payment)}
                          >
                            {boletoBusyId === payment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            Boleto
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            disabled={boletoBusyId === payment.id}
                            onClick={() => chooseBoleto(payment)}
                          >
                            {t("Trocar", "Replace")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            disabled={boletoBusyId === payment.id}
                            onClick={() => removeBoleto(payment)}
                          >
                            {t("Remover", "Remove")}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={boletoBusyId === payment.id}
                          onClick={() => chooseBoleto(payment)}
                        >
                          {boletoBusyId === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileUp className="h-4 w-4" />
                          )}
                          {t("Anexar boleto", "Attach boleto")}
                        </Button>
                      )}
                      {payment.paidAt ? (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setPaid(payment, false)}>
                          <Undo2 className="h-4 w-4" /> {t("Desfazer pagamento", "Undo payment")}
                        </Button>
                      ) : (
                        <Button size="sm" className="gap-1" onClick={() => setPaid(payment, true)}>
                          <Check className="h-4 w-4" /> {t("Marcar como paga", "Mark as paid")}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(payment)} aria-label={t("Editar cobrança", "Edit charge")}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(payment)}
                        aria-label={t("Excluir cobrança", "Delete charge")}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          {isTeacher && (
            <input
              ref={boletoInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={uploadBoleto}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Editar cobrança", "Edit charge")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("Aluno", "Student")}</Label>
                <Select value={editForm.studentId} onValueChange={(v) => setEditForm({ ...editForm, studentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Escolha o aluno", "Choose the student")} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName || s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-description">{t("Descrição", "Description")}</Label>
                <Input
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">{t("Valor (R$)", "Amount (R$)")}</Label>
                <Input
                  id="edit-amount"
                  inputMode="decimal"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-dueDate">{t("Vencimento", "Due date")}</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {editError && <p className="text-sm text-destructive">{editError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={editSaving} className="gap-2">
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Salvar alterações", "Save changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir esta cobrança?", "Delete this charge?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.description} — {deleting ? formatMoney(deleting.amountCents, locale) : ""}.{" "}
              {t("Essa ação não pode ser desfeita.", "This can't be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={deleteSaving} className="gap-2">
              {deleteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Excluir", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
