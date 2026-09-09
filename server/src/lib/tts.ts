import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

async function googleTranslateTts(text: string): Promise<Buffer> {
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error("tts http");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 32) throw new Error("tts empty");
  return buf;
}

function espeakWav(text: string): Buffer | null {
  for (const bin of ["espeak-ng", "espeak"] as const) {
    const r = spawnSync(bin, ["-v", "en-us", "--stdout", text], {
      encoding: "buffer",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 20_000,
    });
    if (r.status === 0 && r.stdout && r.stdout.length > 44) return Buffer.from(r.stdout);
  }
  return null;
}

/** Prefer espeak-ng; if missing, unofficial Google TTS MP3 (no API key). */
export async function synthesizeSpeech(text: string): Promise<{ buf: Buffer; ext: "wav" | "mp3" }> {
  const spoken = text.trim().slice(0, 2000);
  if (!spoken) throw Object.assign(new Error("Texto vazio para áudio."), { statusCode: 400 });

  const wav = espeakWav(spoken);
  if (wav) return { buf: wav, ext: "wav" };

  try {
    return { buf: await googleTranslateTts(spoken.slice(0, 180)), ext: "mp3" };
  } catch {
    throw Object.assign(
      new Error("Não foi possível gerar o áudio. Instale o espeak-ng no servidor ou tente de novo."),
      { statusCode: 503 },
    );
  }
}

export function writeAudio(path: string, buf: Buffer) {
  writeFileSync(path, buf);
}
