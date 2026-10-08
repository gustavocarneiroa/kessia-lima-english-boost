import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { formatDateBr } from "@/lib/quote";
import type { ContractRecord } from "@/lib/contract";
import { ContractStatusBadge } from "./ContractsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature } from "lucide-react";

type PendingContract = ContractRecord & { studentName?: string | null; studentEmail?: string };

// Tela inicial: contratos ainda não assinados. Somem sozinhos quando os dois assinam
// no ZapSign (ou, no modo manual, quando a professora cola o link do assinado).
export default function PendingContractsCard({ isTeacher }: { isTeacher: boolean }) {
  const { t } = usePortalPrefs();
  const [items, setItems] = useState<PendingContract[]>([]);

  useEffect(() => {
    const request = isTeacher
      ? api.get<PendingContract[]>("/api/contracts/pending")
      : api.get<PendingContract[]>("/api/me/contracts").then((all) => all.filter((c) => !c.signed));
    request.then(setItems).catch(() => setItems([]));
  }, [isTeacher]);

  if (items.length === 0) return null;

  const action = (c: PendingContract) => {
    if (isTeacher) {
      if (c.zapsignStatus === "awaiting_teacher") return t("Assinar agora", "Sign now");
      if (!c.zapsignStatus) return t("Abrir e colar o link", "Open and paste link");
      return t("Ver contrato", "View contract");
    }
    return c.zapsignStatus === "awaiting_student" ? t("Assinar agora", "Sign now") : t("Ver contrato", "View contract");
  };

  return (
    <Card className="mt-6 border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          {isTeacher
            ? t("Contratos aguardando assinatura", "Contracts awaiting signature")
            : items.length === 1
              ? t("Você tem um contrato para assinar", "You have a contract to sign")
              : t("Você tem contratos para assinar", "You have contracts to sign")}
        </CardTitle>
        <CardDescription>
          {isTeacher
            ? t(
                "Saem desta lista quando você e o aluno assinarem no ZapSign.",
                "They leave this list once you and the student sign on ZapSign.",
              )
            : t(
                "Assine pelo portal ou pelo e-mail que o ZapSign te mandou. Você já pode ler e baixar o contrato.",
                "Sign through the portal or the email ZapSign sent you. You can already read and download the contract.",
              )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span>
                  {isTeacher && <span className="font-medium">{c.studentName || c.studentEmail} · </span>}
                  {formatDateBr(c.data.startDate)} – {formatDateBr(c.data.endDate)}
                </span>
                <ContractStatusBadge contract={c} />
              </span>
              <Button asChild size="sm" variant={action(c) === t("Assinar agora", "Sign now") ? "default" : "outline"}>
                <Link to={`/contrato/${c.id}`}>{action(c)}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
