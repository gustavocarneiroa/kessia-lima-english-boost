import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { formatDateBr } from "@/lib/quote";
import { CONTRACT_STATUS_LABELS, contractStatusKey, formatCents, type ContractRecord } from "@/lib/contract";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export function ContractStatusBadge({ contract }: { contract: Pick<ContractRecord, "signed" | "zapsignStatus"> }) {
  const { t } = usePortalPrefs();
  const key = contractStatusKey(contract);
  if (key === "signed") return <Badge className="bg-green-600 hover:bg-green-600">{t(...CONTRACT_STATUS_LABELS.signed)}</Badge>;
  if (key === "refused") return <Badge variant="destructive">{t(...CONTRACT_STATUS_LABELS.refused)}</Badge>;
  return (
    <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
      {t(...CONTRACT_STATUS_LABELS[key])}
    </Badge>
  );
}

// Lista de contratos (professora: de um aluno; aluno: os dele), do mais novo pro mais
// antigo. Cada um abre a página do contrato: assinar, baixar o PDF ou o assinado.
// Não aparece se não houver nenhum.
export default function ContractsCard({ path }: { path: string }) {
  const { t } = usePortalPrefs();
  const [items, setItems] = useState<ContractRecord[]>([]);

  useEffect(() => {
    api
      .get<ContractRecord[]>(path)
      .then(setItems)
      .catch(() => setItems([]));
  }, [path]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Contratos", "Contracts")}</CardTitle>
        <CardDescription>
          {t(
            "Abra um contrato pra assinar, baixar o PDF ou baixar a versão assinada.",
            "Open a contract to sign it, download the PDF or the signed version.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id}>
              <Link to={`/contrato/${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:underline">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  {formatDateBr(c.data.startDate)} – {formatDateBr(c.data.endDate)}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {c.data.paymentMode === "upfront"
                    ? `${t("à vista", "upfront")} ${formatCents(c.data.totalCents)}`
                    : `${c.data.installments}x ${formatCents(c.data.installmentCents)}`}
                </span>
                <ContractStatusBadge contract={c} />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
