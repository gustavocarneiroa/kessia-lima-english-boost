import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
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
import { CalendarPlus, Check, Loader2, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
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
  status: PaymentStatus;
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

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatMoney(cents: number) {
  return brl.format(cents / 100);
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

function formatDate(key: string) {
  const [y, m, d] = key.split("-");
  return y && m && d ? `${d}/${m}/${y}` : key;
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
  if (status === "paid") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Paga</Badge>;
  if (status === "overdue") return <Badge variant="destructive">Atrasada</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

export default function Finance() {
  const { user } = useAuth();
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
      setError("Escolha o aluno, a descrição e a data de vencimento.");
      return;
    }
    if (!amountCents) {
      setError("Digite um valor válido, ex: 280,00.");
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
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar a cobrança.");
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerateError(null);
    setGenerateResult(null);
    if (!generateMonth) {
      setGenerateError("Escolha o mês.");
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
      setGenerateError(err instanceof ApiError ? err.message : "Não foi possível gerar as mensalidades.");
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
      setListError(err instanceof ApiError ? err.message : "Não foi possível atualizar a cobrança.");
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
      setEditError("Escolha o aluno, a descrição e a data de vencimento.");
      return;
    }
    if (!amountCents) {
      setEditError("Digite um valor válido, ex: 280,00.");
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
      setEditError(err instanceof ApiError ? err.message : "Não foi possível salvar as alterações.");
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
      setListError(err instanceof ApiError ? err.message : "Não foi possível excluir a cobrança.");
    } finally {
      setDeleteSaving(false);
    }
  }

  const summaryScope = [
    filterStudentId ? studentNameById.get(filterStudentId) : null,
    filterMonth ? `vencimento em ${formatDate(`${filterMonth}-01`).slice(3)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? "Registre as mensalidades de cada aluno e marque quando forem pagas. Os boletos e Pix continuam sendo gerados no app da Cora."
            : "Veja suas mensalidades e se estão pagas, pendentes ou atrasadas."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isTeacher ? "Recebido" : "Pago"}</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{formatMoney(summary.paidCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isTeacher ? "A receber" : "A pagar"}</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(summary.pendingCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Atrasado</CardDescription>
            <CardTitle className="text-2xl text-destructive">{formatMoney(summary.overdueCents)}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      {summaryScope && <p className="-mt-3 text-xs text-muted-foreground">Totais filtrados: {summaryScope}</p>}

      {isTeacher && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gerar mensalidades do mês</CardTitle>
              <CardDescription>
                Cria de uma vez a mensalidade de cada aluno, usando o valor da parcela e o dia de vencimento do
                cadastro dele. Quem já tem cobrança no mês é pulado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="generate-month">Mês</Label>
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
                  Gerar mensalidades
                </Button>
              </div>
              {generateError && <p className="text-sm text-destructive">{generateError}</p>}
              {generateResult && (
                <div className="space-y-2 text-sm">
                  <p className="font-medium">
                    {generateResult.created.length === 0
                      ? "Nenhuma mensalidade nova criada."
                      : `${generateResult.created.length} mensalidade(s) criada(s): ${generateResult.created.join(", ")}.`}
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
              <CardTitle className="text-base">Nova cobrança avulsa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={create} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Aluno</Label>
                    <Select value={form.studentId} onValueChange={(v) => void selectStudentForNewPayment(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o aluno" />
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
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      placeholder="ex: Material didático"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      placeholder="280,00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dueDate">Vencimento</Label>
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
                  Adicionar cobrança
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isTeacher ? "Cobranças" : "Suas mensalidades"}</CardTitle>
          <CardDescription>{total} cobrança(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isTeacher && (
              <div className="space-y-1.5">
                <Label>Aluno</Label>
                <Select
                  value={filterStudentId || "all"}
                  onValueChange={(v) => {
                    setFilterStudentId(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os alunos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os alunos</SelectItem>
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
              <Label htmlFor="filter-month">Mês do vencimento</Label>
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
              <Label>Situação</Label>
              <Select
                value={filterStatus || "all"}
                onValueChange={(v) => {
                  setFilterStatus(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="open">Em aberto (pendentes + atrasadas)</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="overdue">Atrasadas</SelectItem>
                  <SelectItem value="paid">Pagas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-4 gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          ) : null}

          {listError && <p className="mb-3 text-sm text-destructive">{listError}</p>}
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {hasFilters ? "Nenhuma cobrança encontrada com esses filtros." : "Nenhuma cobrança cadastrada ainda."}
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
                      <span className="font-medium text-foreground">{formatMoney(payment.amountCents)}</span>
                      {` · vence ${formatDate(payment.dueDate)}`}
                      {payment.paidAt ? ` · paga em ${formatDate(payment.paidAt)}` : ""}
                      {isTeacher
                        ? ` · ${studentNameById.get(payment.studentId) ?? payment.studentName ?? payment.studentEmail ?? ""}`
                        : ""}
                    </p>
                  </div>

                  {isTeacher && (
                    <div className="flex flex-wrap items-center gap-2">
                      {payment.paidAt ? (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setPaid(payment, false)}>
                          <Undo2 className="h-4 w-4" /> Desfazer pagamento
                        </Button>
                      ) : (
                        <Button size="sm" className="gap-1" onClick={() => setPaid(payment, true)}>
                          <Check className="h-4 w-4" /> Marcar como paga
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(payment)} aria-label="Editar cobrança">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(payment)}
                        aria-label="Excluir cobrança"
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
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cobrança</DialogTitle>
          </DialogHeader>

          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Aluno</Label>
                <Select value={editForm.studentId} onValueChange={(v) => setEditForm({ ...editForm, studentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o aluno" />
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
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">Valor (R$)</Label>
                <Input
                  id="edit-amount"
                  inputMode="decimal"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-dueDate">Vencimento</Label>
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
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.description} — {deleting ? formatMoney(deleting.amountCents) : ""}. Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={deleteSaving} className="gap-2">
              {deleteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
