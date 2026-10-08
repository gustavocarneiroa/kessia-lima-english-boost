import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.ts";
import { env } from "../env.ts";
import { getSetting, setSetting } from "./settings.ts";

// Assinatura de contratos pelo ZapSign (docs.zapsign.com.br). Fluxo: o portal cria o
// documento com 2 signatários em ordem — professora (1) e aluno (2). A professora
// assina na tela do ZapSign dentro do portal; aí o ZapSign manda o e-mail pro aluno,
// que também pode assinar pelo portal (que fica bloqueado até isso). O estado vem do
// próprio ZapSign: pelo webhook e por syncContract() sempre que alguém está na tela.

export const zapsignEnabled = () => !!env.ZAPSIGN_API_TOKEN;

const signedDir = join(dirname(env.DATABASE_PATH), "contratos");
mkdirSync(signedDir, { recursive: true });

export const signedPdfFilePath = (relative: string) => join(signedDir, relative);

export function removeSignedPdf(relative: string | null | undefined) {
  if (relative) rmSync(signedPdfFilePath(relative), { force: true });
}

// Segredo que o ZapSign manda de volta no cabeçalho do webhook — prova que o aviso veio dele.
export const webhookSecret = () => createHash("sha256").update(`zapsign-webhook:${env.JWT_SECRET}`).digest("hex");
export const WEBHOOK_SECRET_HEADER = "x-kessia-webhook-secret";

class ZapSignError extends Error {
  statusCode = 502;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${env.ZAPSIGN_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.ZAPSIGN_API_TOKEN}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new ZapSignError(`ZapSign ${method} ${path} respondeu ${res.status}: ${text.slice(0, 500)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

interface ZapSignSigner {
  token: string;
  sign_url: string;
  status: string; // "new" | "link-opened" | "signed" | ...
  external_id: string;
  signed_at: string | null;
}

interface ZapSignDoc {
  token: string;
  status: string; // "pending" | "signed" | "refused"
  signed_file: string | null;
  signers: ZapSignSigner[];
}

export const TEACHER_SIGNER_ID = "teacher";
export const STUDENT_SIGNER_ID = "student";

export async function createContractDocument(input: {
  contractId: string;
  name: string;
  pdfBase64: string;
  teacher: { name: string; email: string };
  student: { name: string; email: string };
}) {
  const doc = await call<ZapSignDoc>("POST", "/api/v1/docs/", {
    name: input.name,
    base64_pdf: input.pdfBase64,
    external_id: input.contractId,
    lang: "pt-br",
    signature_order_active: true,
    signers: [
      {
        name: input.teacher.name,
        email: input.teacher.email,
        auth_mode: "assinaturaTela",
        send_automatic_email: false, // ela assina na hora, dentro do portal
        order_group: 1,
        external_id: TEACHER_SIGNER_ID,
        lock_name: true,
        lock_email: true,
      },
      {
        name: input.student.name,
        email: input.student.email,
        auth_mode: "tokenEmail", // assinatura + código enviado ao e-mail do aluno
        send_automatic_email: true, // o ZapSign avisa o aluno quando chegar a vez dele
        order_group: 2,
        external_id: STUDENT_SIGNER_ID,
        lock_name: true,
        lock_email: true,
      },
    ],
  });
  const teacher = doc.signers.find((s) => s.external_id === TEACHER_SIGNER_ID) ?? doc.signers[0];
  const student = doc.signers.find((s) => s.external_id === STUDENT_SIGNER_ID) ?? doc.signers[1];
  return { docToken: doc.token, teacherSignUrl: teacher.sign_url, studentSignUrl: student.sign_url };
}

export async function deleteContractDocument(docToken: string) {
  await call("DELETE", `/api/v1/docs/${docToken}/`);
}

// Busca o estado no ZapSign e atualiza o contrato. Quando os dois assinaram, guarda
// uma cópia do PDF assinado (o link do ZapSign expira em 60 minutos).
export async function syncContract(contractId: string) {
  const row = db.select().from(schema.studentContracts).where(eq(schema.studentContracts.id, contractId)).get();
  if (!row?.zapsignDocToken || !zapsignEnabled()) return row;
  if (row.zapsignStatus === "signed" && row.signedPdfPath) return row;

  const doc = await call<ZapSignDoc>("GET", `/api/v1/docs/${row.zapsignDocToken}/`);
  const teacher = doc.signers.find((s) => s.external_id === TEACHER_SIGNER_ID);
  const student = doc.signers.find((s) => s.external_id === STUDENT_SIGNER_ID);
  const teacherSignedAt = teacher?.status === "signed" ? (teacher.signed_at ?? new Date().toISOString()) : null;
  const studentSignedAt = student?.status === "signed" ? (student.signed_at ?? new Date().toISOString()) : null;

  let status: NonNullable<typeof row.zapsignStatus>;
  if (doc.status === "refused") status = "refused";
  else if (doc.status === "signed") status = "signed";
  else status = teacherSignedAt ? "awaiting_student" : "awaiting_teacher";

  let signedPdfPath = row.signedPdfPath;
  if (status === "signed" && !signedPdfPath && doc.signed_file) {
    const res = await fetch(doc.signed_file, { signal: AbortSignal.timeout(60_000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
        signedPdfPath = `${row.id}.pdf`;
        writeFileSync(signedPdfFilePath(signedPdfPath), buf);
      }
    }
  }

  const values = {
    zapsignStatus: status,
    teacherSignedAt,
    studentSignedAt,
    signedPdfPath,
    signedAt: status === "signed" ? (row.signedAt ?? studentSignedAt ?? new Date().toISOString()) : row.signedAt,
  };
  db.update(schema.studentContracts).set(values).where(eq(schema.studentContracts.id, row.id)).run();
  return { ...row, ...values };
}

// Cadastra (uma vez por endereço) o webhook do ZapSign apontando pra este servidor.
export async function ensureWebhook(log: { info: (m: string) => void; error: (o: unknown, m: string) => void }) {
  if (!zapsignEnabled()) return;
  const url = `${env.PUBLIC_API_ORIGIN}/api/zapsign/webhook`;
  const flag = `zapsign_webhook:${env.ZAPSIGN_API_URL}:${url}`;
  if (getSetting(flag)) return;
  try {
    await call("POST", "/api/v1/user/company/webhook/", {
      url,
      type: "", // todos os eventos (assinatura, recusa...) — a rota ignora o que não interessa
      headers: [{ name: WEBHOOK_SECRET_HEADER, value: webhookSecret() }],
    });
    setSetting(flag, new Date().toISOString());
    log.info(`[zapsign] webhook cadastrado: ${url}`);
  } catch (err) {
    log.error({ err }, "[zapsign] não consegui cadastrar o webhook — tento de novo no próximo início");
  }
}
