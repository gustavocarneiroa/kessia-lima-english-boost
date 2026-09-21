// Dicionário público e gratuito (sem chave) usado só pra buscar fonética/áudio
// de cada palpite do Wordle — não é o mesmo dicionário usado no Vocabulário.
type Phonetic = { text?: string; audio?: string };
type Entry = { phonetic?: string; phonetics?: Phonetic[] };

export async function lookupPronunciation(word: string): Promise<{ phonetic: string | null; audioUrl: string | null }> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) return { phonetic: null, audioUrl: null };

    const entries = (await res.json()) as unknown;
    if (!Array.isArray(entries) || entries.length === 0) return { phonetic: null, audioUrl: null };

    for (const entry of entries as Entry[]) {
      const withAudio = entry.phonetics?.find((p) => p.audio);
      const phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || null;
      const audioUrl = withAudio?.audio || null;
      if (phonetic || audioUrl) return { phonetic, audioUrl };
    }
    return { phonetic: null, audioUrl: null };
  } catch {
    return { phonetic: null, audioUrl: null };
  }
}
