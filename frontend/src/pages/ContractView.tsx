import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, fetchSignedContractBlob } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateBr } from "@/lib/quote";
import type { ContractRecord } from "@/lib/contract";
import { contractFileName, downloadContractPdf } from "@/lib/contractPdf";
import ContractDocument from "@/components/ContractDocument";
import ZapSignSigning from "@/components/ZapSignSigning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, CheckCircle2, Copy, Download, ExternalLink, Hourglass, Loader2, PenLine, Printer, XCircle } from "lucide-react";

// Página fora do layout do portal (sem menu lateral). Conforme a etapa, mostra:
// a tela do ZapSign pra quem tem que assinar agora, o contrato montado (pra ler,
// baixar ou imprimir) ou, depois de assinado pelos dois, o PDF assinado.
export default function ContractView() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);
  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    api
      .post<ContractRecord>(`/api/contracts/${id}/sync`)
      .then((c) => {
        setContract(c);
        document.title = contractFileName(c.data).replace(/\.pdf$/, "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível abrir o contrato."));
  }, [id, user]);

  const onUpdate = useCallback((c: ContractRecord) => setContract(c), []);

  async function downloadGenerated() {
    if (!contract || !documentRef.current) return;
    setError(null);
    setDownloading(true);
    try {
      await downloadContractPdf(documentRef.current, contractFileName(contract.data));
    } catch {
      setError('Não foi possível montar o PDF. Tente "Imprimir" e escolha "Salvar como PDF".');
    } finally {
      setDownloading(false);
    }
  }

  async function downloadSigned() {
    if (!contract) return;
    setError(null);
    setDownloading(true);
    try {
      const blob = await fetchSignedContractBlob(contract.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = contractFileName(contract.data).replace(/\.pdf$/, " - ASSINADO.pdf");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível baixar o contrato assinado.");
    } finally {
      setDownloading(false);
    }
  }

  const backTo = isTeacher && contract ? `/portal/alunos/${contract.studentId}` : "/portal";
  const z = contract?.zapsignStatus ?? null;
  const signUrl = !contract
    ? null
    : isTeacher && z === "awaiting_teacher"
      ? contract.teacherSignUrl
      : !isTeacher && z === "awaiting_student"
        ? contract.studentSignUrl
        : null;
  const showDocument = !!contract && !contract.signed && !signUrl && z !== "refused";

  return (
    <div className="min-h-screen bg-neutral-200 py-6 text-neutral-900 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao portal
        </Link>
        {showDocument && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()} className="gap-2 bg-white">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={() => void downloadGenerated()} disabled={downloading} className="gap-2">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "Montando o PDF..." : "Baixar PDF"}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="mb-4 px-4 text-center text-sm text-red-600 print:hidden">{error}</p>}

      {!contract ? (
        !error && (
          <div className="flex justify-center py-10 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )
      ) : (
        <>
          <div className="mx-auto mb-4 max-w-[210mm] space-y-4 px-4 print:hidden">
            <StatusPanel
              contract={contract}
              isTeacher={isTeacher}
              downloading={downloading}
              onDownloadSigned={() => void downloadSigned()}
            />
            {signUrl && <ZapSignSigning contract={contract} signUrl={signUrl} onUpdate={onUpdate} />}
            {isTeacher && !z && <SignedLinkPanel contract={contract} onChange={setContract} />}
          </div>

          {showDocument && (
            <div ref={documentRef}>
              <ContractDocument data={contract.data} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg bg-white p-5 shadow">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusPanel({
  contract,
  isTeacher,
  downloading,
  onDownloadSigned,
}: {
  contract: ContractRecord;
  isTeacher: boolean;
  downloading: boolean;
  onDownloadSigned: () => void;
}) {
  const period = `${contract.data.student.fullName} · ${formatDateBr(contract.data.startDate)} a ${formatDateBr(contract.data.endDate)}`;
  const z = contract.zapsignStatus;

  if (contract.signed) {
    return (
      <Panel icon={<CheckCircle2 className="h-6 w-6 text-green-600" />} title="Contrato assinado">
        <p className="text-sm text-neutral-600">{period}</p>
        {z === "signed" ? (
          <>
            <p className="text-sm text-neutral-700">Assinado pela teacher e pelo aluno.</p>
            <div className="pt-1">
              {contract.hasSignedPdf ? (
                <Button onClick={onDownloadSigned} disabled={downloading} className="gap-2">
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Baixar contrato assinado
                </Button>
              ) : (
                <p className="text-sm text-neutral-500">A cópia assinada está sendo preparada. Volte em alguns minutos.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-700">A versão assinada fica no ZapSign. Lá dá pra ver e baixar o PDF com as assinaturas.</p>
            <div className="pt-1">
              <Button asChild className="gap-2">
                <a href={contract.signedUrl!} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Abrir contrato assinado no ZapSign
                </a>
              </Button>
            </div>
          </>
        )}
      </Panel>
    );
  }

  if (z === "refused") {
    return (
      <Panel icon={<XCircle className="h-6 w-6 text-red-600" />} title="Contrato recusado">
        <p className="text-sm text-neutral-600">{period}</p>
        <p className="text-sm text-neutral-700">
          {isTeacher
            ? "A assinatura foi recusada no ZapSign. Exclua este contrato na página do aluno e gere um novo pelo orçamento."
            : "A assinatura foi recusada. Fale com a teacher para gerar um novo contrato."}
        </p>
      </Panel>
    );
  }

  if (z === "awaiting_teacher") {
    return isTeacher ? (
      <Panel icon={<PenLine className="h-6 w-6 text-amber-600" />} title="Assine o contrato">
        <p className="text-sm text-neutral-600">{period}</p>
        <p className="text-sm text-neutral-700">
          Assine abaixo. Assim que você assinar, o ZapSign manda o e-mail pro aluno assinar a parte dele.
        </p>
      </Panel>
    ) : (
      <Panel icon={<Hourglass className="h-6 w-6 text-amber-600" />} title="Contrato a caminho">
        <p className="text-sm text-neutral-600">{period}</p>
        <p className="text-sm text-neutral-700">
          A teacher está assinando o seu contrato. Assim que ela assinar, você recebe um e-mail do ZapSign e pode assinar
          aqui mesmo. Enquanto isso, você já pode ler e baixar o contrato.
        </p>
      </Panel>
    );
  }

  if (z === "awaiting_student") {
    return isTeacher ? (
      <Panel icon={<Hourglass className="h-6 w-6 text-amber-600" />} title="Aguardando o aluno assinar">
        <p className="text-sm text-neutral-600">{period}</p>
        <p className="text-sm text-neutral-700">
          Você já assinou. O aluno recebeu o e-mail do ZapSign e também consegue assinar entrando no portal.
        </p>
        {contract.studentSignUrl && <CopyLink url={contract.studentSignUrl} />}
      </Panel>
    ) : (
      <Panel icon={<PenLine className="h-6 w-6 text-amber-600" />} title="Assine o seu contrato">
        <p className="text-sm text-neutral-600">{period}</p>
        <p className="text-sm text-neutral-700">
          Leia e assine abaixo. O ZapSign vai pedir um código que chega no seu e-mail. Depois que os dois assinarem, a
          cópia do contrato assinado fica disponível aqui no portal.
        </p>
      </Panel>
    );
  }

  // modo manual (sem ZapSign)
  return isTeacher ? null : (
    <p className="text-sm text-neutral-700">
      Este contrato está <b>aguardando assinatura</b>. A teacher vai te mandar o link pra assinar pelo ZapSign; depois
      disso, o contrato assinado aparece aqui.
    </p>
  );
}

// Link de assinatura do aluno, pra professora mandar por WhatsApp se ele não achar o e-mail.
function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-1 gap-2"
      onClick={() => {
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Link copiado" : "Copiar link de assinatura do aluno"}
    </Button>
  );
}

// Modo manual (contratos sem ZapSign): a professora cola, troca ou remove o link do assinado.
function SignedLinkPanel({ contract, onChange }: { contract: ContractRecord; onChange: (c: ContractRecord) => void }) {
  const [url, setUrl] = useState(contract.signedUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      onChange(await api.put<ContractRecord>(`/api/contracts/${contract.id}/signed-link`, { url: url.trim() }));
      setMessage("Link salvo. O aluno já vê o contrato assinado e o aviso de assinatura sumiu da tela inicial.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Não foi possível salvar o link.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setMessage(null);
    setSaving(true);
    try {
      onChange(await api.delete<ContractRecord>(`/api/contracts/${contract.id}/signed-link`));
      setUrl("");
      setMessage("Link removido. O contrato voltou a ficar aguardando assinatura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-2 rounded-lg border border-neutral-300 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <PenLine className="h-4 w-4" />
        {contract.signedUrl ? "Link do contrato assinado (ZapSign)" : "Já foi assinado? Cole aqui o link do ZapSign"}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://app.zapsign.com.br/..." required />
        <Button type="submit" disabled={saving || !url.trim() || url.trim() === contract.signedUrl} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
        {contract.signedUrl && (
          <Button type="button" variant="outline" onClick={() => void remove()} disabled={saving}>
            Remover
          </Button>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        Com o link salvo, você e o aluno passam a ver o contrato assinado no ZapSign no lugar do PDF montado.
      </p>
      {message && <p className="text-sm text-neutral-700">{message}</p>}
    </form>
  );
}
