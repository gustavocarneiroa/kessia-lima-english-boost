/**
 * Cache em memória dos challenges de WebAuthn (registro/login) — processo único,
 * TTL curto, não precisa persistir em disco.
 */
const store = new Map<string, { challenge: string; expiresAt: number }>();
const TTL_MS = 5 * 60 * 1000;

export function saveChallenge(key: string, challenge: string) {
  store.set(key, { challenge, expiresAt: Date.now() + TTL_MS });
}

export function takeChallenge(key: string): string | null {
  const entry = store.get(key);
  store.delete(key);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.challenge;
}
