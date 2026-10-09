/**
 * Limite de tentativas erradas (senha/dispositivo) em memória — processo único,
 * não precisa persistir: se o servidor reiniciar, o contador zera, o que é aceitável.
 *
 * Conta só as FALHAS dentro de uma janela; ao estourar, bloqueia aquela chave até a
 * janela acabar. Login certo zera o contador do e-mail.
 */
const WINDOW_MS = 15 * 60 * 1000;

const limits = {
  // e-mail: protege uma conta específica contra quem fica chutando senha
  email: 8,
  // IP: protege contra quem testa vários e-mails. Folgado de propósito — várias
  // pessoas podem sair pelo mesmo IP (mesma rede/escola).
  ip: 40,
};

type Kind = keyof typeof limits;

const store = new Map<string, { count: number; resetAt: number }>();

function key(kind: Kind, value: string) {
  return `${kind}:${value.toLowerCase()}`;
}

/** Quantos segundos faltam pro bloqueio acabar, ou 0 se não está bloqueado. */
export function blockedFor(kind: Kind, value: string): number {
  const entry = store.get(key(kind, value));
  if (!entry) return 0;
  if (entry.resetAt <= Date.now()) {
    store.delete(key(kind, value));
    return 0;
  }
  return entry.count >= limits[kind] ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
}

export function registerFailure(kind: Kind, value: string) {
  const k = key(kind, value);
  const now = Date.now();
  const entry = store.get(k);
  if (!entry || entry.resetAt <= now) {
    store.set(k, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export function clearFailures(kind: Kind, value: string) {
  store.delete(key(kind, value));
}

/** Mensagem amigável + código, já no formato que o front mostra. */
export function tooManyAttempts(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return {
    error: "too_many_attempts",
    message: `Muitas tentativas erradas. Por segurança, espere ${minutes} minuto${minutes > 1 ? "s" : ""} e tente de novo.`,
  };
}

// Limpeza periódica pra o mapa não crescer pra sempre.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}, WINDOW_MS).unref();
