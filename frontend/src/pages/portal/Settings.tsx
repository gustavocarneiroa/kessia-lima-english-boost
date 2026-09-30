import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";

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
