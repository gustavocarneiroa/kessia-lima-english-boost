import { env } from "../env.ts";

/**
 * Envio de e-mail pelo Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Chamada direta à API — não precisa da biblioteca deles pra um POST só.
 */
export function emailEnabled() {
  return !!env.RESEND_API_KEY;
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
  const res = await fetch(`${env.RESEND_API_URL}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Resend respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

/** E-mail do "Esqueci minha senha" (ou de convite, se o aluno ainda não criou a senha). */
export function passwordEmail(link: string, invite: boolean) {
  const title = invite ? "Crie sua senha do portal" : "Redefinir sua senha";
  const intro = invite
    ? "Você pediu acesso ao Portal do Aluno da Teacher Kessia Lima. Clique no botão abaixo para criar sua senha."
    : "Recebemos um pedido para redefinir a senha do seu acesso ao Portal do Aluno da Teacher Kessia Lima.";
  const button = invite ? "Criar minha senha" : "Escolher nova senha";
  const validity = invite ? "7 dias" : "48 horas";
  const footer = `O link vale por ${validity} e só funciona uma vez. Se não foi você que pediu, pode ignorar este e-mail — sua senha continua a mesma.`;

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#f4f1fa;font-family:Arial,Helvetica,sans-serif;color:#2b1c47">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:20px;color:#6648bd">${title}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5">${intro}</p>
          <p style="margin:0 0 24px">
            <a href="${link}" style="display:inline-block;background:#6648bd;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:15px">${button}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6b6280">${footer}</p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9a93ab;word-break:break-all">Se o botão não funcionar, copie este endereço no navegador:<br>${link}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#9a93ab">Teacher Kessia Lima · teacherkessialima.com.br</p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${title}\n\n${intro}\n\n${button}: ${link}\n\n${footer}\n\nTeacher Kessia Lima`;
  return { subject: `${title} — Teacher Kessia Lima`, html, text };
}
