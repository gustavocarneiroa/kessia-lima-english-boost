import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { ContractRecord } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";

const POLL_MS = 5000;

// Tela de assinatura do ZapSign dentro do portal. Enquanto aberta, pergunta ao
// servidor (que consulta o ZapSign) se a assinatura já entrou; quando muda, avisa.
export default function ZapSignSigning({
  contract,
  signUrl,
  onUpdate,
}: {
  contract: ContractRecord;
  signUrl: string;
  onUpdate: (c: ContractRecord) => void;
}) {
  const statusRef = useRef(contract.zapsignStatus);
  statusRef.current = contract.zapsignStatus;

  useEffect(() => {
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const fresh = await api.post<ContractRecord>(`/api/contracts/${contract.id}/sync`);
        if (!stopped && fresh.zapsignStatus !== statusRef.current) onUpdate(fresh);
      } catch {
        // tenta de novo no próximo ciclo
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [contract.id, onUpdate]);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border bg-white">
        <iframe
          src={signUrl}
          title="Assinatura do contrato (ZapSign)"
          className="h-[78vh] w-full"
          allow="camera; geolocation; clipboard-write"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Assim que a assinatura for concluída, esta tela atualiza sozinha.
        </span>
        <Button asChild variant="link" size="sm" className="h-auto gap-1 p-0 text-xs">
          <a href={signUrl} target="_blank" rel="noopener noreferrer">
            Não carregou? Abrir em outra aba
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
