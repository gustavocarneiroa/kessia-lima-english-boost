import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy } from "lucide-react";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";

// Caixinha com o link pessoal do aluno (convite pra criar a senha, ou redefinição)
// e o botão de copiar — usada no cadastro do aluno e na página dele.
export default function PasswordLinkBox({ link, invite }: { link: string; invite: boolean }) {
  const { t } = usePortalPrefs();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // clipboard indisponível — o link continua selecionável no campo
    }
  }

  return (
    <div className="mt-2 max-w-lg space-y-1.5 rounded-md border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">
        {invite
          ? t(
              "Envie este link de convite pro aluno (WhatsApp, por exemplo). É por ele que o aluno cria a senha. Vale por 7 dias e só funciona uma vez.",
              "Send this invite link to the student (on WhatsApp, for example). It's how they create their password. It's valid for 7 days and only works once.",
            )
          : t(
              "Envie este link pro aluno (WhatsApp, por exemplo). Ele vale por 48 horas e só funciona uma vez.",
              "Send this link to the student (on WhatsApp, for example). It's valid for 48 hours and only works once.",
            )}
      </p>
      <div className="flex items-center gap-2">
        <Input readOnly value={link} onFocus={(e) => e.target.select()} className="text-xs" />
        <Button type="button" variant="secondary" size="icon" onClick={copy} aria-label={t("Copiar link", "Copy link")}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
