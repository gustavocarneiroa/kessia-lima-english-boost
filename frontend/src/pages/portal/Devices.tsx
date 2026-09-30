import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Fingerprint, Loader2, Smartphone } from "lucide-react";
import { usePortalPrefs, type TFn } from "@/contexts/PortalPrefsContext";

interface Device {
  id: string;
  deviceName: string | null;
  createdAt: string;
}

// O nome é salvo em português ("Celular"/"Computador") — traduz na hora de mostrar.
function deviceLabel(name: string | null, t: TFn) {
  if (name === "Celular") return t("Celular", "Phone");
  if (name === "Computador") return t("Computador", "Computer");
  return name ?? t("Dispositivo", "Device");
}

export default function Devices() {
  const { t, locale } = usePortalPrefs();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function loadDevices() {
    setLoadingList(true);
    try {
      const list = await api.get<Device[]>("/api/webauthn/devices");
      setDevices(list);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  async function addDevice() {
    setError(null);
    setAdding(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const options = await api.get<Parameters<typeof startRegistration>[0]["optionsJSON"]>(
        "/api/webauthn/register-options",
      );
      const response = await startRegistration({ optionsJSON: options });
      const deviceName =
        typeof window !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Celular" : "Computador";
      await api.post("/api/webauthn/register-verify", { response, deviceName });
      await loadDevices();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível adicionar este dispositivo.", "Couldn't add this device."));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Dispositivos", "Devices")}</h1>
        <p className="text-muted-foreground">
          {t(
            "Adicione este dispositivo para entrar depois só com biometria/PIN, sem digitar senha.",
            "Add this device so you can sign in later with just your fingerprint/face/PIN, no password needed.",
          )}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-4 pt-6">
          <Button onClick={addDevice} disabled={adding} className="gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            {t("Adicionar este dispositivo", "Add this device")}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Dispositivos cadastrados", "Registered devices")}</CardTitle>
          <CardDescription>{devices.length} {t("dispositivo(s)", "device(s)")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : devices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("Nenhum dispositivo ainda.", "No devices yet.")}</p>
          ) : (
            <ul className="divide-y">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{deviceLabel(d.deviceName, t)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Adicionado em", "Added on")} {new Date(d.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
