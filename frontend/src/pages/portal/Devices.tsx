import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Fingerprint, Loader2, LogOut, Smartphone, Trash2 } from "lucide-react";
import { usePortalPrefs, type TFn } from "@/contexts/PortalPrefsContext";
import { useAuth } from "@/contexts/AuthContext";

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
  const { logoutAll } = useAuth();
  // "remove" = tirar um aparelho da lista; "logout-all" = sair de todos os aparelhos
  const [pending, setPending] = useState<{ kind: "remove"; device: Device } | { kind: "logout-all" } | null>(null);
  const [acting, setActing] = useState(false);

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

  async function handleConfirm() {
    if (!pending) return;
    setActing(true);
    setError(null);
    try {
      if (pending.kind === "remove") {
        await api.delete(`/api/webauthn/devices/${encodeURIComponent(pending.device.id)}`);
        setPending(null);
        await loadDevices();
      } else {
        await logoutAll();
        // sem sessão, o portal leva sozinho de volta pra tela de login
      }
    } catch (err) {
      setPending(null);
      setError(err instanceof ApiError ? err.message : t("Algo deu errado. Tente de novo.", "Something went wrong. Try again."));
    } finally {
      setActing(false);
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
                  <div className="flex-1">
                    <p className="text-sm font-medium">{deviceLabel(d.deviceName, t)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Adicionado em", "Added on")} {new Date(d.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPending({ kind: "remove", device: d })}
                    aria-label={t("Remover dispositivo", "Remove device")}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Sair de todos os aparelhos", "Sign out everywhere")}</CardTitle>
          <CardDescription>
            {t(
              "Use se você esqueceu o portal aberto em outro computador ou celular. Vai ser preciso entrar de novo em todos, inclusive neste.",
              "Use this if you left the portal open on another computer or phone. You'll need to sign in again everywhere, including here.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="gap-2" onClick={() => setPending({ kind: "logout-all" })}>
            <LogOut className="h-4 w-4" />
            {t("Sair de todos os aparelhos", "Sign out everywhere")}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && !acting && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "remove"
                ? t("Remover este dispositivo?", "Remove this device?")
                : t("Sair de todos os aparelhos?", "Sign out everywhere?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "remove"
                ? t(
                    "Ele não vai mais conseguir entrar só com a digital/rosto/PIN. Dá pra adicionar de novo depois.",
                    "It won't be able to sign in with just fingerprint/face/PIN anymore. You can add it again later.",
                  )
                : t(
                    "Você vai precisar entrar de novo em todos os aparelhos, inclusive neste.",
                    "You'll need to sign in again on every device, including this one.",
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={acting}
            >
              {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending?.kind === "remove" ? t("Remover", "Remove") : t("Sair de todos", "Sign out everywhere")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
