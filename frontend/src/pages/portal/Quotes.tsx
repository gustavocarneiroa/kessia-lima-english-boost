import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { formatCents } from "@/lib/contract";
import type { QuoteContract } from "./QuoteContractDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FilePlus2, Loader2, Trash2 } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;

interface QuoteItem {
  id: string;
  studentName: string;
  email: string | null;
  phone: string | null;
  totalCents: number;
  updatedAt: string;
  contracts: QuoteContract[];
}

export default function Quotes() {
  const { t, locale } = usePortalPrefs();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<QuoteItem | null>(null);
  const [acting, setActing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ items: QuoteItem[]; total: number }>(`/api/quotes?page=${page}&pageSize=${PAGE_SIZE}`);
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function confirmDelete() {
    if (!deleting) return;
    setActing(true);
    try {
      await api.delete(`/api/quotes/${deleting.id}`);
      setDeleting(null);
      await load();
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Orçamentos", "Quotes")}</h1>
          <p className="text-muted-foreground">
            {t(
              "Monte o orçamento, mande pelo WhatsApp e, quando o aluno fechar, transforme em contrato.",
              "Build the quote, send it on WhatsApp and, when the student says yes, turn it into a contract.",
            )}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/portal/orcamentos/novo">
            <FilePlus2 className="h-4 w-4" />
            {t("Novo orçamento", "New quote")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Orçamentos salvos", "Saved quotes")}</CardTitle>
          <CardDescription>{`${total} ${t("no total", "total")}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("Nenhum orçamento ainda.", "No quotes yet.")}</p>
          ) : (
            <ul className="divide-y">
              {items.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to={`/portal/orcamentos/${q.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate text-sm font-medium">{q.studentName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatCents(q.totalCents)} · {t("atualizado em", "updated")} {new Date(q.updatedAt).toLocaleDateString(locale)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {q.contracts.length > 0 ? (
                        q.contracts.map((c) => (
                          <Badge key={c.studentId + c.convertedAt}>
                            {t("Contrato", "Contract")}: {c.fullName || c.email}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary">{t("Ainda não virou contrato", "Not a contract yet")}</Badge>
                      )}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(q)}
                    aria-label={t("Excluir", "Delete")}
                    title={t("Excluir", "Delete")}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && !acting && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(`Excluir o orçamento de ${deleting?.studentName}?`, `Delete ${deleting?.studentName}'s quote?`)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Só o orçamento é apagado. Se ele já virou contrato, o aluno, o contrato e as cobranças continuam.",
                "Only the quote is deleted. If it already became a contract, the student, contract and charges stay.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Excluir", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
