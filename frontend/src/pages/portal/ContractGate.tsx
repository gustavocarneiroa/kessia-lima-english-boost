import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { formatDateBr } from "@/lib/quote";
import type { ContractRecord } from "@/lib/contract";
import ZapSignSigning from "@/components/ZapSignSigning";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass, Loader2, LogOut, PenLine, XCircle } from "lucide-react";
import logo from "@/assets/logo.png";

interface Gate {
  blocked: boolean;
  contract: ContractRecord | null;
}

// Aluno com contrato do ZapSign ainda não assinado (aluno novo, ou renovação depois
// que o contrato anterior acabou): o portal mostra só esta tela até a assinatura.
export default function ContractGate({
  enabled,
  onLogout,
  children,
}: {
  enabled: boolean;
  onLogout: () => void;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return <StudentContractGate onLogout={onLogout}>{children}</StudentContractGate>;
}

function StudentContractGate({ onLogout, children }: { onLogout: () => void; children: ReactNode }) {
  const { t } = usePortalPrefs();
  const [gate, setGate] = useState<Gate | null>(null);

  const load = useCallback(() => {
    api
      .get<Gate>("/api/me/contract-gate")
      .then(setGate)
      .catch(() => setGate({ blocked: false, contract: null })); // sem resposta, não trava o aluno
  }, []);

  useEffect(load, [load]);

  const onUpdate = useCallback(
    (c: ContractRecord) => {
      if (c.zapsignStatus === "signed") load();
      else setGate({ blocked: true, contract: c });
    },
    [load],
  );

  // Esperando a professora assinar: confere de tempos em tempos (a tela do aluno ainda não tem o que assinar).
  const waitingTeacher = gate?.contract?.zapsignStatus === "awaiting_teacher";
  useEffect(() => {
    if (!waitingTeacher || !gate?.contract) return;
    const id = gate.contract.id;
    const timer = setInterval(async () => {
      try {
        const fresh = await api.post<ContractRecord>(`/api/contracts/${id}/sync`);
        if (fresh.zapsignStatus !== "awaiting_teacher") onUpdate(fresh);
      } catch {
        // tenta de novo
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [waitingTeacher, gate?.contract, onUpdate]);

  if (!gate) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!gate.blocked || !gate.contract) return <>{children}</>;

  const c = gate.contract;
  const period = `${formatDateBr(c.data.startDate)} a ${formatDateBr(c.data.endDate)}`;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <img src={logo} alt="Teacher Kessia" className="h-7 w-auto dark:invert" />
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          {t("Sair", "Log out")}
        </Button>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {c.zapsignStatus === "refused" ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : c.zapsignStatus === "awaiting_teacher" ? (
                <Hourglass className="h-5 w-5 text-amber-600" />
              ) : (
                <PenLine className="h-5 w-5 text-amber-600" />
              )}
              {c.zapsignStatus === "refused"
                ? t("Contrato recusado", "Contract refused")
                : c.zapsignStatus === "awaiting_teacher"
                  ? t("Seu contrato está quase pronto", "Your contract is almost ready")
                  : t("Assine seu contrato para liberar o portal", "Sign your contract to unlock the portal")}
            </CardTitle>
            <CardDescription>
              {c.zapsignStatus === "refused"
                ? t("Fale com a teacher para gerar um novo contrato.", "Talk to the teacher to get a new contract.")
                : c.zapsignStatus === "awaiting_teacher"
                  ? t(
                      `Contrato de ${period}. A teacher está assinando agora — assim que ela assinar, a assinatura do seu lado aparece aqui e você também recebe um e-mail do ZapSign.`,
                      `Contract for ${period}. The teacher is signing it now — once she does, your signature step shows up here and you also get an email from ZapSign.`,
                    )
                  : t(
                      `Contrato de ${period}. Leia e assine abaixo — o ZapSign vai pedir um código enviado ao seu e-mail. Assim que você assinar, o portal libera.`,
                      `Contract for ${period}. Read and sign below — ZapSign will ask for a code sent to your email. Once you sign, the portal unlocks.`,
                    )}
            </CardDescription>
          </CardHeader>
          {c.zapsignStatus === "awaiting_teacher" && (
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("Esta tela atualiza sozinha.", "This screen updates by itself.")}
            </CardContent>
          )}
        </Card>

        {c.zapsignStatus === "awaiting_student" && c.studentSignUrl && (
          <ZapSignSigning contract={c} signUrl={c.studentSignUrl} onUpdate={onUpdate} />
        )}
      </main>
    </div>
  );
}
