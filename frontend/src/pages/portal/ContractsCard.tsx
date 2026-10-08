import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { formatDateBr } from "@/lib/quote";
import { formatCents, type ContractData } from "@/lib/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface ContractItem {
  id: string;
  data: ContractData;
  createdAt: string;
}

// Lista de contratos (professora: de um aluno; aluno: os dele). Não aparece se não houver nenhum.
export default function ContractsCard({ path }: { path: string }) {
  const { t } = usePortalPrefs();
  const [items, setItems] = useState<ContractItem[]>([]);

  useEffect(() => {
    api
      .get<ContractItem[]>(path)
      .then(setItems)
      .catch(() => setItems([]));
  }, [path]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Contratos", "Contracts")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id}>
              <Link to={`/contrato/${c.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:underline">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  {formatDateBr(c.data.startDate)} – {formatDateBr(c.data.endDate)}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {c.data.paymentMode === "upfront"
                    ? `${t("à vista", "upfront")} ${formatCents(c.data.totalCents)}`
                    : `${c.data.installments}x ${formatCents(c.data.installmentCents)}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
