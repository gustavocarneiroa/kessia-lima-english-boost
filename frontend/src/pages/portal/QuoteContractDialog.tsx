import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { formatDateBr, planInstallments, WEEKDAYS, type PlannedPayment, type QuoteForm, type QuoteResult } from "@/lib/quote";
import { DEFAULT_PLAN_EXTRAS, DEFAULT_SIGN_CITY, formatCents, type ContractData } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export interface QuoteContract {
  studentId: string;
  convertedAt: string;
  email: string;
  fullName: string | null;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default function QuoteContractDialog({
  quoteId,
  form,
  result,
  onClose,
  onConverted,
}: {
  quoteId: string;
  form: QuoteForm;
  result: QuoteResult;
  onClose: () => void;
  onConverted: (c: QuoteContract) => void;
}) {
  const { t } = usePortalPrefs();
  const navigate = useNavigate();
  const [student, setStudent] = useState({
    email: form.email,
    fullName: form.studentName,
    phone: form.phone,
    document: "",
    address: "",
  });
  const [paymentMode, setPaymentMode] = useState<"installments" | "upfront">("installments");
  const [dueDay, setDueDay] = useState(10);
  const [planExtras, setPlanExtras] = useState(DEFAULT_PLAN_EXTRAS);
  const [signCity, setSignCity] = useState(DEFAULT_SIGN_CITY);
  const [signDate, setSignDate] = useState(todayKey());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schedule = form.days
    .map((d, weekday) => ({ weekday, time: d.time, hours: d.hours }))
    .filter((_, i) => form.days[i].selected);
  const missingTime = schedule.filter((s) => !s.time).map((s) => WEEKDAYS[s.weekday].pt);

  const installments = Math.max(1, Math.floor(form.installments || 1));
  const validDueDay = Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31;

  const payments: PlannedPayment[] = useMemo(() => {
    if (paymentMode === "upfront") {
      return [
        {
          description: `Pacote à vista (${formatDateBr(form.startDate)} a ${formatDateBr(form.endDate)})`,
          amountCents: Math.round(result.upfrontTotal * 100),
          dueDate: signDate || form.startDate, // à vista: no ato da assinatura
        },
      ];
    }
    if (!validDueDay) return [];
    if (!signDate) return [];
    return planInstallments(signDate, dueDay, installments, Math.round(result.installmentTotal * 100));
  }, [paymentMode, dueDay, validDueDay, installments, signDate, form.startDate, form.endDate, result]);

  async function submit() {
    setError(null);
    if (missingTime.length) {
      setError(t(`Falta o horário de: ${missingTime.join(", ")}.`, `Missing the time for: ${missingTime.join(", ")}.`));
      return;
    }
    if (!validDueDay) {
      setError(t("Dia de vencimento precisa ser entre 1 e 31.", "Due day must be between 1 and 31."));
      return;
    }
    const totalCents = payments.reduce((acc, p) => acc + p.amountCents, 0);
    const installmentCents = paymentMode === "upfront" ? totalCents : payments[0]?.amountCents ?? 0;
    const contract: ContractData = {
      student: {
        fullName: student.fullName.trim(),
        document: student.document.trim(),
        address: student.address.trim(),
        phone: student.phone.trim(),
        email: student.email.trim().toLowerCase(),
      },
      groupType: form.groupType,
      schedule,
      totalClasses: result.totalClasses,
      months: result.months,
      startDate: form.startDate,
      endDate: form.endDate,
      paymentMode,
      installments: paymentMode === "upfront" ? 1 : installments,
      installmentCents,
      totalCents,
      dueDay,
      planExtras: planExtras.trim(),
      signCity: signCity.trim(),
      signDate,
    };

    setSaving(true);
    try {
      const res = await api.post<{ studentId: string; contractId: string; created: boolean }>(`/api/quotes/${quoteId}/convert`, {
        email: contract.student.email,
        fullName: contract.student.fullName || null,
        phone: contract.student.phone || null,
        contractStart: form.startDate,
        contractEnd: form.endDate,
        classSchedule: schedule,
        contract,
        installmentValue: formatCents(installmentCents),
        paymentDueDay: String(paymentMode === "upfront" ? Number(form.startDate.slice(8, 10)) : dueDay),
        payments,
      });
      onConverted({
        studentId: res.studentId,
        convertedAt: new Date().toISOString(),
        email: contract.student.email,
        fullName: contract.student.fullName || null,
      });
      navigate(`/contrato/${res.contractId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível criar o contrato.", "Couldn't create the contract."));
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof student, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={student[key]} onChange={(e) => setStudent({ ...student, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Virar contrato", "Make contract")}</DialogTitle>
          <DialogDescription>
            {t(
              "Cadastra o aluno no portal (ou atualiza, se o e-mail já existir), salva os horários e o contrato no perfil dele e cria as cobranças no Financeiro. Depois você abre o contrato pronto pra imprimir ou salvar em PDF.",
              "Registers the student (or updates them if the email already exists), saves the schedule and contract on their profile and creates the charges in Payments. Then you open the contract, ready to print or save as PDF.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("Dados do aluno (contratante)", "Student details")}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {field("fullName", t("Nome completo", "Full name"), { required: true })}
              {field("email", "E-mail", { type: "email", required: true })}
              {field("document", "RG/CPF", { placeholder: "000.000.000-00" })}
              {field("phone", t("Telefone", "Phone"))}
            </div>
            {field("address", t("Endereço", "Address"), { placeholder: t("Rua, número - Bairro / Cidade - UF, CEP", "Street, number - City") })}
            {form.groupType !== "individual" && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "Orçamento de dupla/trio: cada aluno tem o próprio contrato. Depois deste, clique em \"Virar contrato\" de novo pro próximo aluno.",
                  "Pair/trio quote: each student gets their own contract. After this one, click \"Make contract\" again for the next student.",
                )}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("Pagamento", "Payment")}</h3>
            <ToggleGroup
              type="single"
              variant="outline"
              value={paymentMode}
              onValueChange={(v) => v && setPaymentMode(v as typeof paymentMode)}
              className="justify-start"
            >
              <ToggleGroupItem value="installments">
                {t(`Parcelado (${installments}x)`, `Installments (${installments}x)`)}
              </ToggleGroupItem>
              <ToggleGroupItem value="upfront">{t("À vista", "Upfront")}</ToggleGroupItem>
            </ToggleGroup>
            {paymentMode === "installments" && (
              <div className="max-w-[12rem] space-y-1">
                <Label>{t("Dia do vencimento", "Due day")}</Label>
                <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} />
              </div>
            )}
            {payments.length > 0 && (
              <div className="rounded-md border">
                <p className="border-b px-3 py-2 text-xs text-muted-foreground">
                  {t("Cobranças que vão ser criadas no Financeiro:", "Charges that will be created in Payments:")}
                </p>
                <ul className="max-h-48 divide-y overflow-y-auto text-sm">
                  {payments.map((p) => (
                    <li key={p.description} className="flex justify-between gap-3 px-3 py-1.5">
                      <span className="min-w-0 truncate">{p.description}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatDateBr(p.dueDate)} · {formatCents(p.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("Contrato", "Contract")}</h3>
            <div className="space-y-1">
              <Label>{t("O plano inclui (texto do contrato)", "Plan includes (contract text)")}</Label>
              <Input value={planExtras} onChange={(e) => setPlanExtras(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("Cidade da assinatura", "Signing city")}</Label>
                <Input value={signCity} onChange={(e) => setSignCity(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("Data da assinatura", "Signing date")}</Label>
                <Input type="date" value={signDate} onChange={(e) => setSignDate(e.target.value)} />
              </div>
            </div>
          </section>

          {missingTime.length > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t(
                `Coloque o horário da aula de ${missingTime.join(", ")} no orçamento antes — ele vai no contrato e no calendário do aluno.`,
                `Set the class time for ${missingTime.join(", ")} in the quote first — it goes in the contract and the student's calendar.`,
              )}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("Cancelar", "Cancel")}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={saving || missingTime.length > 0 || !student.email.trim() || !student.fullName.trim()}
            className="gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Criar contrato", "Create contract")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
