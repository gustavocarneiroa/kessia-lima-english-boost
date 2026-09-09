const DICT_URL = "https://freedictionaryapi.com/api/v1/entries/en";

type Pronunciation = { type?: string; text?: string };
type Sense = {
  definition?: string;
  examples?: string[];
  subsenses?: Sense[];
};
type Entry = {
  pronunciations?: Pronunciation[];
  senses?: Sense[];
};
type DictResponse = {
  word?: string;
  entries?: Entry[];
  source?: { url?: string };
};

function firstIpa(entries: Entry[]): string | null {
  for (const e of entries) {
    const ipa = e.pronunciations?.find((p) => p.type === "ipa" && p.text)?.text;
    if (ipa) return ipa;
  }
  return null;
}

function firstMeaning(senses: Sense[] | undefined): string | null {
  if (!senses) return null;
  for (const s of senses) {
    const ex = s.examples?.find((x) => x.trim());
    if (ex) return ex.trim();
    if (s.definition?.trim()) return s.definition.trim();
    const nested = firstMeaning(s.subsenses);
    if (nested) return nested;
  }
  return null;
}

function findAudioUrl(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") {
    if (/^https?:\/\/.+\.(mp3|ogg|wav)(\?|$)/i.test(value)) return value;
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAudioUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.audio === "string") {
      const found = findAudioUrl(rec.audio, depth + 1);
      if (found) return found;
    }
    for (const v of Object.values(rec)) {
      const found = findAudioUrl(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
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

  const res = await fetch(`${DICT_URL}/${encodeURIComponent(word)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw Object.assign(new Error("O dicionário está indisponível agora. Tente de novo em instantes."), {
      statusCode: 502,
    });
  }

  const data = (await res.json()) as DictResponse;
  const entries = data.entries ?? [];
  if (entries.length === 0) return null;

  const meaning = firstMeaning(entries[0]?.senses) ?? firstMeaning(entries.flatMap((e) => e.senses ?? []));
  const phonetic = firstIpa(entries);
  if (!meaning || !phonetic) return null;

  return {
    word: data.word ?? word,
    phonetic,
    meaning,
    sourceUrl: data.source?.url ?? null,
    audioUrl: findAudioUrl(data),
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
