import { env } from "../env.ts";

const DICT_URL = "https://dictionaryapi.com/api/v3/references/learners/json";
const AUDIO_BASE = "https://media.merriam-webster.com/audio/prons/en/us/mp3";

type Pronunciation = { ipa?: string; sound?: { audio?: string } };
type Hwi = { hw?: string; prs?: Pronunciation[] };
type Entry = {
  meta?: { id?: string; "app-shortdef"?: { hw?: string } };
  hwi?: Hwi;
  shortdef?: string[];
};

function firstIpa(entries: Entry[]): string | null {
  for (const e of entries) {
    const ipa = e.hwi?.prs?.find((p) => p.ipa)?.ipa;
    if (ipa) return ipa;
  }
  return null;
}

function firstAudioName(entries: Entry[]): string | null {
  for (const e of entries) {
    const audio = e.hwi?.prs?.find((p) => p.sound?.audio)?.sound?.audio;
    if (audio) return audio;
  }
  return null;
}

function firstMeaning(entries: Entry[]): string | null {
  for (const e of entries) {
    const def = e.shortdef?.find((d) => d.trim());
    if (def) return def.trim();
  }
  return null;
}

// Regra oficial do Merriam-Webster para montar a URL do áudio a partir do nome do arquivo.
function audioUrl(name: string): string {
  let subdir: string;
  if (name.startsWith("bix")) subdir = "bix";
  else if (name.startsWith("gg")) subdir = "gg";
  else if (/^[0-9]/.test(name) || /^[^a-zA-Z]/.test(name)) subdir = "number";
  else subdir = name[0]!.toLowerCase();
  return `${AUDIO_BASE}/${subdir}/${name}.mp3`;
}

export type DictionaryHit = {
  word: string;
  phonetic: string;
  meaning: string;
  sourceUrl: string | null;
  audioUrl: string | null;
};

export async function lookupEnglishWord(rawWord: string): Promise<DictionaryHit | null> {
  const word = rawWord.trim().toLowerCase();
  if (!word) return null;

  const res = await fetch(`${DICT_URL}/${encodeURIComponent(word)}?key=${env.MERRIAM_WEBSTER_LEARNERS_KEY}`);
  if (!res.ok) {
    throw Object.assign(new Error("O dicionário está indisponível agora. Tente de novo em instantes."), {
      statusCode: 502,
    });
  }

  const entries = (await res.json()) as unknown;
  if (!Array.isArray(entries) || entries.length === 0) return null;

  // A API retorna sugestões de palavras parecidas (strings) quando não encontra a palavra exata.
  const valid = entries.filter((e): e is Entry => typeof e === "object" && e !== null && "shortdef" in e);
  if (valid.length === 0) return null;

  const matched = valid.filter((e) => e.meta?.id?.split(":")[0] === word);
  const pool = matched.length > 0 ? matched : valid;

  const meaning = firstMeaning(pool);
  const phonetic = firstIpa(pool);
  if (!meaning || !phonetic) return null;

  const audioName = firstAudioName(pool);

  return {
    word: pool[0]?.hwi?.hw?.replace(/\*/g, "") ?? word,
    phonetic,
    meaning,
    sourceUrl: `https://learnersdictionary.com/definition/${encodeURIComponent(word)}`,
    audioUrl: audioName ? audioUrl(audioName) : null,
  };
}

export async function downloadAudio(url: string): Promise<{ buf: Buffer; ext: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32) return null;
    const ext = url.toLowerCase().includes(".ogg") ? "ogg" : url.toLowerCase().includes(".wav") ? "wav" : "mp3";
    return { buf, ext };
  } catch {
    return null;
  }
}
