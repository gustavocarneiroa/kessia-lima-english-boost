import crypto from "node:crypto";

// O nginx na frente da API recusa pedidos acima de 1 MB, e o PDF do contrato (imagens
// das folhas) passa disso. A tela manda o PDF em pedaços pequenos; aqui eles ficam em
// memória até o "Virar contrato" juntar. Upload esquecido some depois de 15 min.

const TTL_MS = 15 * 60 * 1000;
export const MAX_CHUNK_CHARS = 700_000;
export const MAX_CHUNKS = 12;

interface Upload {
  chunks: (string | undefined)[];
  createdAt: number;
}

const uploads = new Map<string, Upload>();

function sweep() {
  const now = Date.now();
  for (const [id, u] of uploads) if (now - u.createdAt > TTL_MS) uploads.delete(id);
}

export function startUpload(total: number) {
  sweep();
  const id = crypto.randomUUID();
  uploads.set(id, { chunks: new Array(total).fill(undefined), createdAt: Date.now() });
  return id;
}

export function putChunk(id: string, index: number, data: string) {
  const u = uploads.get(id);
  if (!u || index < 0 || index >= u.chunks.length) return false;
  u.chunks[index] = data;
  return true;
}

// Junta e libera da memória. null = upload não existe, expirou ou falta pedaço.
export function takeUpload(id: string) {
  sweep();
  const u = uploads.get(id);
  if (!u || u.chunks.some((c) => c === undefined)) return null;
  uploads.delete(id);
  return u.chunks.join("");
}
