import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { usePricing, DURATIONS, type GroupType, type Pricing } from "@/lib/pricing";
import { useDaysOff, DAY_OFF_KIND_LABELS } from "@/lib/daysOff";
import {
  WEEKDAYS,
  addDays,
  weekdayOf,
  GROUP_LABELS,
  calculateQuote,
  emptyQuoteForm,
  endDateFor,
  formatBrl,
  formatDateBr,
  isDateKey,
  maskPhone,
  periodLabel,
  whatsappMessage,
  whatsappUrl,
  type QuoteForm,
} from "@/lib/quote";
import QuoteContractDialog, { type QuoteContract } from "./QuoteContractDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, CalendarX, FileSignature, Loader2, MessageCircle, Save } from "lucide-react";

interface SavedQuote {
  id: string;
  data: { form: QuoteForm };
  contracts: QuoteContract[];
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={suffix ? "pr-10" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function QuoteEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = usePortalPrefs();
  const { pricing, loaded: pricingLoaded } = usePricing();

  const [form, setForm] = useState<QuoteForm | null>(null);
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [contracts, setContracts] = useState<QuoteContract[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contractOpen, setContractOpen] = useState(false);
  const { daysOff } = useDaysOff();
  const justCreated = useRef<string | null>(null);

  // Carrega o orçamento salvo, ou começa um novo com os preços das Configurações.
  useEffect(() => {
    // acabou de salvar um orçamento novo: o formulário na tela já é o salvo
    if (id && id === justCreated.current) return;
    if (id) {
      api
        .get<SavedQuote>(`/api/quotes/${id}`)
        .then((q) => {
          // completa campos que um orçamento salvo antes de existirem possa não ter
          const loaded = { ...emptyQuoteForm(pricing), ...q.data.form };
          setForm(loaded);
          setSavedJson(JSON.stringify(loaded));
          setContracts(q.contracts);
        })
        .catch((err) => setLoadError(err instanceof ApiError ? err.message : t("Não foi possível abrir o orçamento.", "Couldn't open the quote.")));
    } else if (pricingLoaded) {
      setForm(emptyQuoteForm(pricing));
      setSavedJson(null);
      setContracts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pricingLoaded]);

  const result = useMemo(() => (form ? calculateQuote(form, pricing, daysOff) : null), [form, pricing, daysOff]);

  if (loadError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    );
  }

  if (!form || !result) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const dirty = JSON.stringify(form) !== savedJson;

  function update(patch: Partial<QuoteForm>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateDay(index: number, patch: Partial<QuoteForm["days"][number]>) {
    setForm((prev) => (prev ? { ...prev, days: prev.days.map((d, i) => (i === index ? { ...d, ...patch } : d)) } : prev));
  }

  function changeStart(startDate: string) {
    const patch: Partial<QuoteForm> = { startDate };
    if (isDateKey(startDate) && form!.durationMonths) patch.endDate = endDateFor(startDate, form!.durationMonths);
    update(patch);
  }

  function changeDuration(value: string) {
    const months = Number(value);
    if (!months) {
      update({ durationMonths: 0 });
      return;
    }
    update({
      durationMonths: months,
      endDate: isDateKey(form!.startDate) ? endDateFor(form!.startDate, months) : form!.endDate,
      durationDiscount: pricing.durationDiscounts[String(months) as keyof Pricing["durationDiscounts"]] ?? 0,
      installments: months,
    });
  }

  function changeGroup(groupType: string) {
    if (!groupType) return;
    const g = groupType as GroupType;
    update({ groupType: g, rates: { day: pricing.day[g], night: pricing.night[g] } });
  }

  async function save(): Promise<string | null> {
    setSaveError(null);
    if (!form!.studentName.trim()) {
      setSaveError(t("Coloque o nome do aluno antes de salvar.", "Add the student's name before saving."));
      return null;
    }
    setSaving(true);
    try {
      const body = {
        studentName: form!.studentName.trim(),
        email: form!.email.trim() || null,
        phone: form!.phone || null,
        totalCents: Math.round(result!.installmentTotal * 100),
        data: { form, result },
      };
      let quoteId = id ?? null;
      if (quoteId) await api.put(`/api/quotes/${quoteId}`, body);
      else quoteId = (await api.post<{ id: string }>("/api/quotes", body)).id;
      setSavedJson(JSON.stringify(form));
      if (!id) {
        justCreated.current = quoteId;
        navigate(`/portal/orcamentos/${quoteId}`, { replace: true });
      }
      return quoteId;
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("Não foi possível salvar.", "Couldn't save."));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function openContract() {
    const quoteId = dirty || !id ? await save() : id;
    if (quoteId) setContractOpen(true);
  }

  function sendWhatsapp() {
    window.open(whatsappUrl(form!.phone, whatsappMessage(form!, result!, pricing)), "_blank");
  }

  const dayName = (i: number) => (lang === "en" ? WEEKDAYS[i].en : WEEKDAYS[i].pt);
  const periodText = (time: string) => {
    const p = periodLabel(time, pricing);
    if (lang === "pt" || !p) return p;
    return { manhã: "morning", tarde: "afternoon", noite: "evening" }[p];
  };
  const perPerson = form.groupType !== "individual";
  // Só os que caem no período e num dia da semana com aula — os outros não mudam nada.
  const selectedWeekdays = new Set(result.days.map((d) => d.weekday));
  const daysOffInRange = result.valid
    ? daysOff.filter((p) => {
        if (p.end < form.startDate || p.start > form.endDate) return false;
        for (let k = p.start > form.startDate ? p.start : form.startDate; k <= p.end && k <= form.endDate; k = addDays(k, 1)) {
          if (selectedWeekdays.has(weekdayOf(k))) return true;
        }
        return false;
      })
    : [];
  const installments = Math.max(1, Math.floor(form.installments || 1));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackLink />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {id ? form.studentName || t("Orçamento", "Quote") : t("Novo orçamento", "New quote")}
            </h1>
            <p className="text-muted-foreground">
              {t(
                "As aulas são contadas dia a dia no período, já tirando feriados e as datas sem aula.",
                "Classes are counted day by day over the period, skipping holidays and no-class dates.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void save()} disabled={saving || (!dirty && !!id)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {!dirty && id ? t("Salvo", "Saved") : t("Salvar", "Save")}
            </Button>
            <Button variant="outline" className="gap-2" onClick={sendWhatsapp} disabled={!result.valid || form.phone.replace(/\D/g, "").length < 10}>
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button className="gap-2" onClick={() => void openContract()} disabled={!result.valid || saving}>
              <FileSignature className="h-4 w-4" />
              {t("Virar contrato", "Make contract")}
            </Button>
          </div>
        </div>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {contracts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("Virou contrato de:", "Became a contract for:")}</span>
            {contracts.map((c) => (
              <Link key={c.studentId + c.convertedAt} to={`/portal/alunos/${c.studentId}`}>
                <Badge variant="secondary" className="hover:underline">
                  {c.fullName || c.email}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Aluno", "Student")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t("Nome", "Name")}</Label>
                <Input value={form.studentName} onChange={(e) => update({ studentName: e.target.value })} placeholder="Fulano da Silva" />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => update({ phone: maskPhone(e.target.value) })}
                  placeholder="(85) 99999-9999"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="aluno@email.com" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Período do contrato", "Contract period")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t("Data inicial", "Start date")}</Label>
                <Input type="date" value={form.startDate} onChange={(e) => changeStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("Duração", "Length")}</Label>
                <Select value={String(form.durationMonths)} onValueChange={changeDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {t(`${m} meses`, `${m} months`)}
                      </SelectItem>
                    ))}
                    <SelectItem value="0">{t("Outra (escolher data final)", "Other (pick end date)")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("Data final", "End date")}</Label>
                <Input type="date" value={form.endDate} onChange={(e) => update({ endDate: e.target.value, durationMonths: 0 })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Dias e horários", "Days and times")}</CardTitle>
              <CardDescription>
                {t(
                  `Aula a partir das ${pricing.nightStartsAt} usa o valor da noite.`,
                  `Classes from ${pricing.nightStartsAt} on use the evening rate.`,
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {form.days.map((day, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 rounded-md border p-2.5">
                  <label className="flex min-w-[9rem] cursor-pointer items-center gap-2 text-sm font-medium capitalize">
                    <Checkbox checked={day.selected} onCheckedChange={(v) => updateDay(i, { selected: v === true })} />
                    {dayName(i)}
                  </label>
                  {day.selected && (
                    <>
                      <Input
                        type="time"
                        value={day.time}
                        onChange={(e) => updateDay(i, { time: e.target.value })}
                        className="w-32"
                        aria-label={t("Horário", "Time")}
                      />
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={day.hours}
                          onChange={(e) => updateDay(i, { hours: Number(e.target.value) })}
                          className="w-20"
                          aria-label={t("Horas por aula", "Hours per class")}
                        />
                        <span className="text-sm text-muted-foreground">{t("h por aula", "h per class")}</span>
                      </div>
                      {day.time && <Badge variant="outline">{periodText(day.time)}</Badge>}
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Valores", "Prices")}</CardTitle>
              <CardDescription>
                {t(
                  "Já vêm preenchidos com os preços das Configurações — mude aqui só se for um valor especial pra este aluno.",
                  "Prefilled with the prices from Settings — change them here only for a special price for this student.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleGroup type="single" value={form.groupType} onValueChange={changeGroup} variant="outline" className="justify-start">
                {(Object.keys(GROUP_LABELS) as GroupType[]).map((g) => (
                  <ToggleGroupItem key={g} value={g}>
                    {t(...GROUP_LABELS[g])}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label={t(`Hora/aula manhã e tarde${perPerson ? " (por pessoa)" : ""}`, `Hourly rate, day${perPerson ? " (per person)" : ""}`)}
                  value={form.rates.day}
                  onChange={(n) => update({ rates: { ...form.rates, day: n } })}
                  step="0.01"
                  suffix="R$"
                />
                <NumberField
                  label={t(`Hora/aula noite${perPerson ? " (por pessoa)" : ""}`, `Hourly rate, evening${perPerson ? " (per person)" : ""}`)}
                  value={form.rates.night}
                  onChange={(n) => update({ rates: { ...form.rates, night: n } })}
                  step="0.01"
                  suffix="R$"
                />
                <NumberField
                  label={t("Desconto do pacote", "Package discount")}
                  value={form.durationDiscount}
                  onChange={(n) => update({ durationDiscount: n })}
                  suffix="%"
                />
                <NumberField
                  label={t("Desconto extra à vista", "Extra discount, paid upfront")}
                  value={form.upfrontDiscount}
                  onChange={(n) => update({ upfrontDiscount: n })}
                  suffix="%"
                />
                <NumberField
                  label={t("Deslocamento por aula (presencial)", "Travel cost per class (in person)")}
                  value={form.travelPerClass}
                  onChange={(n) => update({ travelPerClass: n })}
                  step="0.01"
                  suffix="R$"
                />
                <NumberField
                  label={t("Parcelas", "Installments")}
                  value={form.installments}
                  onChange={(n) => update({ installments: n })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Dias sem aula no período", "Days off in this period")}</CardTitle>
              <CardDescription>
                {t(
                  "Feriados nacionais, Dia do Professor e as folgas/férias que você marcou no Calendário. Essas aulas já ficam fora da conta.",
                  "National holidays, Teacher's Day and the days off/vacations you set in the Calendar. These classes are already left out.",
                )}{" "}
                <Link to="/portal/calendario" className="font-medium text-primary hover:underline">
                  {t("Abrir o Calendário", "Open the Calendar")}
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result.valid ? (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  {t("Escolha as datas e os dias da semana primeiro.", "Pick the dates and weekdays first.")}
                </p>
              ) : daysOffInRange.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  {t("Nenhum dia sem aula cai nos dias escolhidos.", "No days off fall on the chosen weekdays.")}
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {daysOffInRange.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <CalendarX className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="shrink-0 tabular-nums sm:w-48">
                        {formatDateBr(p.start)}
                        {p.end !== p.start && ` – ${formatDateBr(p.end)}`}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{p.label}</span>
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {t(...DAY_OFF_KIND_LABELS[p.kind])}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Resumo", "Summary")}</CardTitle>
              {perPerson && <CardDescription>{t("Valores por pessoa.", "Prices per person.")}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!result.valid ? (
                <p className="text-muted-foreground">
                  {t(
                    "Escolha a data inicial, a data final e pelo menos um dia da semana pra ver o valor.",
                    "Pick the start date, end date and at least one weekday to see the price.",
                  )}
                </p>
              ) : (
                <>
                  <div className="space-y-1">
                    {result.days.map((d) => (
                      <div key={d.weekday} className="flex justify-between gap-2">
                        <span className="capitalize text-muted-foreground">{dayName(d.weekday)}</span>
                        <span className="tabular-nums">
                          {d.classes} {t("aulas", "classes")} · {formatBrl(d.value)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-2 border-t pt-1 font-medium">
                      <span>{t("Total de aulas", "Total classes")}</span>
                      <span className="tabular-nums">
                        {result.totalClasses} ({String(result.totalHours).replace(".", ",")}h)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Row label={t("Horas-aula", "Class hours")} value={formatBrl(result.grossValue)} />
                    {form.durationDiscount > 0 && (
                      <Row
                        label={t(`Desconto do pacote (${form.durationDiscount}%)`, `Package discount (${form.durationDiscount}%)`)}
                        value={`− ${formatBrl(result.grossValue - result.packageValue)}`}
                      />
                    )}
                    {result.travelValue > 0 && <Row label={t("Deslocamento", "Travel")} value={`+ ${formatBrl(result.travelValue)}`} />}
                  </div>

                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Parcelado", "Installments")}</p>
                    <p className="text-2xl font-semibold tabular-nums text-primary">
                      {installments}x {formatBrl(result.installmentValue)}
                    </p>
                    <p className="text-muted-foreground tabular-nums">Total: {formatBrl(result.installmentTotal)}</p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("À vista", "Upfront")}
                      {form.upfrontDiscount > 0 && ` (−${form.upfrontDiscount}%)`}
                    </p>
                    <p className="text-xl font-semibold tabular-nums">{formatBrl(result.upfrontTotal)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {id && contractOpen && (
        <QuoteContractDialog
          quoteId={id}
          form={form}
          result={result}
          onClose={() => setContractOpen(false)}
          onConverted={(c) => setContracts((prev) => [...prev, c])}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function BackLink() {
  const { t } = usePortalPrefs();
  return (
    <Link to="/portal/orcamentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      {t("Orçamentos", "Quotes")}
    </Link>
  );
}
