import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { env } from "../env.ts";

export const imageDir = join(dirname(env.DATABASE_PATH), "images");

mkdirSync(imageDir, { recursive: true });

export function imageFilePath(relative: string) {
  return join(imageDir, relative);
}

type PexelsPhoto = { src?: { large?: string; medium?: string } };
type PexelsResponse = { photos?: PexelsPhoto[] };

export async function findWordImage(word: string): Promise<{ buf: Buffer; ext: string } | null> {
  if (!env.PEXELS_API_KEY) return null;

  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(word)}&per_page=1`, {
    headers: { Authorization: env.PEXELS_API_KEY },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as PexelsResponse;
  const url = data.photos?.[0]?.src?.large ?? data.photos?.[0]?.src?.medium;
  if (!url) return null;

  const imgRes = await fetch(url);
  if (!imgRes.ok) return null;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length < 32) return null;
  return { buf, ext: "jpg" };
}
