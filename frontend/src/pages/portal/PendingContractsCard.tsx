import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { formatDateBr } from "@/lib/quote";
import type { ContractItem } from "./ContractsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature } from "lucide-react";

type PendingContract = ContractItem & { studentName?: string | null; studentEmail?: string };

// Tela inicial: contratos sem o link do ZapSign. Some sozinho quando a professora
// cola o link (= contrato assinado).
export default function PendingContractsCard({ isTeacher }: { isTeacher: boolean }) {
  const { t } = usePortalPrefs();
  const [items, setItems] = useState<PendingContract[]>([]);

  useEffect(() => {
    const request = isTeacher
      ? api.get<PendingContract[]>("/api/contracts/pending")
      : api.get<PendingContract[]>("/api/me/contracts").then((all) => all.filter((c) => !c.signedUrl));
    request.then(setItems).catch(() => setItems([]));
  }, [isTeacher]);

  if (items.length === 0) return null;

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
                "Depois que o aluno assinar no ZapSign, abra o contrato e cole o link — ele sai desta lista.",
                "Once the student signs on ZapSign, open the contract and paste the link — it leaves this list.",
              )
            : t(
                "A teacher vai te mandar o link pra assinar pelo ZapSign. Enquanto isso, você já pode ler e baixar o contrato.",
                "The teacher will send you the link to sign on ZapSign. Meanwhile, you can read and download the contract.",
              )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0">
                {isTeacher && <span className="font-medium">{c.studentName || c.studentEmail} · </span>}
                {formatDateBr(c.data.startDate)} – {formatDateBr(c.data.endDate)}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to={`/contrato/${c.id}`}>
                  {isTeacher ? t("Abrir e colar o link", "Open and paste link") : t("Ver contrato", "View contract")}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
