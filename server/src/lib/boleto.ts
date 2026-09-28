import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { env } from "../env.ts";

export const boletoDir = join(dirname(env.DATABASE_PATH), "boletos");

mkdirSync(boletoDir, { recursive: true });

export function boletoFilePath(relative: string) {
  return join(boletoDir, relative);
}

// Recebe o PDF como data URL ("data:application/pdf;base64,...") e salva com nome aleatório.
export function saveBoletoPdf(raw: string): string {
  const m = raw.match(/^data:application\/pdf;base64,(.+)$/i);
  const buf = m ? Buffer.from(m[1], "base64") : null;
  if (!buf || buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw Object.assign(new Error("O arquivo precisa ser um PDF."), { statusCode: 400 });
  }
  const name = `${crypto.randomUUID()}.pdf`;
  writeFileSync(boletoFilePath(name), buf);
  return name;
}

export function removeBoletoPdf(relative: string | null | undefined) {
  if (!relative) return;
  rmSync(boletoFilePath(relative), { force: true });
}
