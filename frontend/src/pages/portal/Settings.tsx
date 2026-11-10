import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { DEFAULT_PRICING, DURATIONS, PLAN_NAMES, usePricing, type GroupType, type Pricing, type Shift } from "@/lib/pricing";

export default function Settings() {
  const { t } = usePortalPrefs();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ configured: boolean }>("/api/settings/openai-key");
      setConfigured(res.configured);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.put("/api/settings/openai-key", { apiKey });
      setApiKey("");
      setConfigured(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível salvar a chave.", "Couldn't save the key."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await api.delete("/api/settings/openai-key");
      setConfigured(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Configurações", "Settings")}</h1>
        <p className="text-muted-foreground">{t("Ajustes gerais do portal.", "General portal settings.")}</p>
      </div>

      <PricingCard />

      <ClaudeAccessCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Chave da OpenAI (ChatGPT)", "OpenAI key (ChatGPT)")}</CardTitle>
          <CardDescription>
            {t(
              "Usada só pra gerar perguntas de listening automaticamente a partir da transcrição de um vídeo. Fica guardada só no servidor — depois de salva, ela nunca é mostrada de novo aqui, nem em nenhuma outra tela.",
              "Only used to automatically generate listening questions from a video's transcript. It's stored on the server only — once saved, it's never shown again here or on any other screen.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              {configured && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  {t("Chave configurada.", "Key configured.")}
                </div>
              )}

              <form onSubmit={save} className="space-y-3">
                <div className="space-y-1">
                  <Label>{configured ? t("Trocar chave", "Replace key") : t("Colar chave", "Paste key")}</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("Salvar", "Save")}
                  </Button>
                  {configured && (
                    <Button type="button" variant="outline" className="gap-2 text-destructive" onClick={() => void remove()} disabled={saving}>
                      <Trash2 className="h-4 w-4" />
                      {t("Remover", "Remove")}
                    </Button>
                  )}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ApiTokenRow {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// Chave pro Claude (MCP) mexer no portal no lugar da professora, sem senha.
function ClaudeAccessCard() {
  const { t } = usePortalPrefs();
  const [items, setItems] = useState<ApiTokenRow[] | null>(null);
  const [name, setName] = useState("Claude no meu computador");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ items: ApiTokenRow[] }>("/api/settings/api-tokens");
    setItems(res.items);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ token: string }>("/api/settings/api-tokens", { name });
      setCreated(res.token);
      setCopied(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível criar a chave.", "Couldn't create the key."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("Apagar esta chave? O Claude que usa ela para de ter acesso na hora.", "Delete this key? The Claude using it loses access right away."))) return;
    setBusy(true);
    try {
      await api.delete(`/api/settings/api-tokens/${id}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(created);
    setCopied(true);
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Acesso do Claude", "Claude access")}</CardTitle>
        <CardDescription>
          {t(
            "Gera uma chave pra o Claude (no seu computador) criar atividades, ver alunos e fazer outras tarefas do portal por você, sem precisar da sua senha. Ela não consegue trocar sua senha nem seus aparelhos. Se não usar mais, é só apagar.",
            "Creates a key so Claude (on your computer) can create activities, see students and do other portal tasks for you, without your password. It can't change your password or devices. Delete it when you no longer need it.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {created && (
          <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">
              {t("Copie a chave agora — ela não aparece de novo.", "Copy the key now — it won't be shown again.")}
            </p>
            <code className="block break-all rounded bg-background p-2 text-xs">{created}</code>
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => void copy()}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? t("Copiada!", "Copied!") : t("Copiar chave", "Copy key")}
            </Button>
          </div>
        )}

        {items === null ? (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          items.length > 0 && (
            <ul className="divide-y rounded-md border text-sm">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Criada em", "Created")} {fmt(it.createdAt)} ·{" "}
                      {it.lastUsedAt ? `${t("último uso", "last used")} ${fmt(it.lastUsedAt)}` : t("ainda não usada", "not used yet")}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" disabled={busy} onClick={() => void remove(it.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )
        )}

        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 basis-56 space-y-1">
            <Label>{t("Nome da chave", "Key name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>
          <Button type="submit" disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {t("Gerar chave", "Create key")}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

const GROUPS: { key: GroupType; label: [string, string] }[] = [
  { key: "individual", label: ["Individual", "Individual"] },
  { key: "duo", label: ["Dupla (por pessoa)", "Pair (per person)"] },
  { key: "trio", label: ["Trio (por pessoa)", "Trio (per person)"] },
];

function PricingCard() {
  const { t } = usePortalPrefs();
  const { pricing, setPricing, loaded } = usePricing();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const setRate = (shift: Shift, group: GroupType, value: number) =>
    setPricing({ ...pricing, [shift]: { ...pricing[shift], [group]: value } });
  const setDiscount = (months: string, value: number) =>
    setPricing({ ...pricing, durationDiscounts: { ...pricing.durationDiscounts, [months]: value } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await api.put("/api/pricing", pricing);
      setMessage({ ok: true, text: t("Preços salvos. A página de preços do site já mostra os novos valores.", "Prices saved. The site's pricing section already shows the new values.") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : t("Não foi possível salvar.", "Couldn't save.") });
    } finally {
      setSaving(false);
    }
  }

  const numberInput = (value: number, onChange: (n: number) => void, step = "0.01") => (
    <Input type="number" min="0" step={step} inputMode="decimal" value={value} onChange={(e) => onChange(Number(e.target.value))} required />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Preços das aulas", "Class prices")}</CardTitle>
        <CardDescription>
          {t(
            "Valor da hora/aula usado nos orçamentos novos e na seção de preços do site (a landing mostra o valor individual). Em cada orçamento dá pra mudar o valor só pra aquele aluno.",
            "Hourly rate used in new quotes and on the site's pricing section (the landing page shows the individual rate). Each quote can override it for that student.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <form onSubmit={save} className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 font-medium">{t("Hora/aula (R$)", "Hourly rate (R$)")}</th>
                    <th className="pb-2 pl-2 font-medium">{t("Manhã e tarde", "Day")}</th>
                    <th className="pb-2 pl-2 font-medium">{t("Noite", "Evening")}</th>
                  </tr>
                </thead>
                <tbody>
                  {GROUPS.map((g) => (
                    <tr key={g.key}>
                      <td className="py-1 pr-2">{t(...g.label)}</td>
                      <td className="py-1 pl-2">{numberInput(pricing.day[g.key], (n) => setRate("day", g.key, n))}</td>
                      <td className="py-1 pl-2">{numberInput(pricing.night[g.key], (n) => setRate("night", g.key, n))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="max-w-[12rem] space-y-1">
              <Label>{t("Noite começa às", "Evening starts at")}</Label>
              <Input type="time" value={pricing.nightStartsAt} onChange={(e) => setPricing({ ...pricing, nightStartsAt: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label>{t("Desconto por duração do plano (%)", "Discount by plan length (%)")}</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DURATIONS.map((m) => (
                  <div key={m} className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {PLAN_NAMES[m]} · {t(`${m} meses`, `${m} months`)}
                    </p>
                    {numberInput(pricing.durationDiscounts[String(m) as keyof Pricing["durationDiscounts"]], (n) => setDiscount(String(m), n), "1")}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Salvar preços", "Save prices")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPricing(DEFAULT_PRICING)} disabled={saving}>
                {t("Voltar aos valores originais", "Reset to original values")}
              </Button>
            </div>
            {message && <p className={message.ok ? "text-sm text-green-600 dark:text-green-400" : "text-sm text-destructive"}>{message.text}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
