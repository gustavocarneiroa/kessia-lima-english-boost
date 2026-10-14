import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { formatDateBr } from "@/lib/quote";
import { formatCents, type ContractRecord } from "@/lib/contract";
import { ContractStatusBadge } from "./ContractsCard";
import DeleteContractDialog from "@/components/DeleteContractDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2 } from "lucide-react";

type ContractItem = ContractRecord & { studentName: string | null; studentEmail: string; studentArchived: boolean };
type Filter = "all" | "pending" | "signed";

// Aba "Contratos" (só professora): todos os contratos de todos os alunos, com filtro
// por situação. Cada um abre a página do contrato; a lixeira exclui só o contrato.
export default function Contracts() {
  const { t } = usePortalPrefs();
  const [items, setItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<ContractItem | null>(null);

  async function load() {
    try {
      setItems(await api.get<ContractItem[]>("/api/contracts"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pendingCount = items.filter((c) => !c.signed).length;
  const shown = items.filter((c) => (filter === "all" ? true : filter === "signed" ? c.signed : !c.signed));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Contratos", "Contracts")}</h1>
        <p className="text-muted-foreground">
          {t(
            "Todos os contratos gerados pelos orçamentos. Abra um pra assinar, baixar ou excluir.",
            "Every contract generated from quotes. Open one to sign, download or delete it.",
          )}
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">{t("Todos", "All")}</TabsTrigger>
          <TabsTrigger value="pending">
            {t("Aguardando assinatura", "Awaiting signature")}
            {pendingCount > 0 && ` (${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="signed">{t("Assinados", "Signed")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filter === "all"
              ? t("Todos os contratos", "All contracts")
              : filter === "signed"
                ? t("Contratos assinados", "Signed contracts")
                : t("Contratos aguardando assinatura", "Contracts awaiting signature")}
          </CardTitle>
          <CardDescription>{`${shown.length} ${t("no total", "total")}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? t("Nenhum contrato ainda. Eles aparecem aqui quando um orçamento vira contrato.", "No contracts yet. They show up here when a quote becomes a contract.")
                : t("Nenhum contrato nesta lista.", "No contracts in this list.")}
            </p>
          ) : (
            <ul className="divide-y">
              {shown.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to={`/contrato/${c.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate text-sm font-medium">{c.studentName || c.data.student.fullName || c.studentEmail}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateBr(c.data.startDate)} – {formatDateBr(c.data.endDate)} ·{" "}
                      {c.data.paymentMode === "upfront"
                        ? `${t("à vista", "upfront")} ${formatCents(c.data.totalCents)}`
                        : `${c.data.installments}x ${formatCents(c.data.installmentCents)}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <ContractStatusBadge contract={c} />
                      {c.studentArchived && <Badge variant="secondary">{t("Aluno arquivado", "Archived student")}</Badge>}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(c)}
                    aria-label={t("Excluir contrato", "Delete contract")}
                    title={t("Excluir contrato", "Delete contract")}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DeleteContractDialog
        contract={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          void load();
        }}
      />
    </div>
  );
}
