import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { env } from "../env.ts";

export const audioDir = env.AUDIO_DIR ?? join(dirname(env.DATABASE_PATH), "audio");

mkdirSync(audioDir, { recursive: true });

export function audioFilePath(relative: string) {
  return join(audioDir, relative);
}
