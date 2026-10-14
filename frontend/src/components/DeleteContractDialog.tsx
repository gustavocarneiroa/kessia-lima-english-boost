import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDateBr } from "@/lib/quote";
import type { ContractRecord } from "@/lib/contract";
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
import { Loader2 } from "lucide-react";

// Confirmação de "Excluir contrato" (só a professora). Só o documento sai — aluno,
// cobranças e horários continuam. Se estava no ZapSign sem assinar, o servidor cancela lá.
export default function DeleteContractDialog({
  contract,
  onClose,
  onDeleted,
}: {
  contract: ContractRecord | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!contract) return;
    setActing(true);
    setError(null);
    try {
      await api.delete(`/api/contracts/${contract.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível excluir o contrato.");
    } finally {
      setActing(false);
    }
  }

  const who = contract?.data.student.fullName;
  const period = contract ? `${formatDateBr(contract.data.startDate)} a ${formatDateBr(contract.data.endDate)}` : "";

  return (
    <AlertDialog
      open={contract !== null}
      onOpenChange={(open) => {
        if (!open && !acting) {
          setError(null);
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir o contrato de {who}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Contrato de {period}. Não dá pra desfazer.</p>
              <p>
                Só o contrato é apagado: o aluno, as cobranças e os horários de aula continuam como estão (se quiser,
                apague as cobranças no Financeiro).
              </p>
              {contract?.signed ? (
                <p>Ele já foi assinado — a cópia assinada guardada no portal também será apagada.</p>
              ) : contract?.zapsignStatus ? (
                <p>Ele também é cancelado no ZapSign, e o aluno não consegue mais assinar.</p>
              ) : null}
              {error && <p className="text-destructive">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={acting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void confirm();
            }}
            disabled={acting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir contrato
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
