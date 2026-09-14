import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { fetchAudioBlob } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function VocabAudioButton({ cardId, kind, label }: { cardId: string; kind: "word" | "meaning"; label: string }) {
  const [busy, setBusy] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  async function play() {
    setBusy(true);
    try {
      const blob = await fetchAudioBlob(`/api/vocab/cards/${cardId}/audio/${kind}`);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      await audio.play();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={play}>
      <Volume2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
