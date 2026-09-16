import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { fetchImageBlob } from "@/lib/api";

export function VocabCardImage({ cardId }: { cardId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    fetchImageBlob(`/api/vocab/cards/${cardId}/image`)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cardId]);

  if (!url) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
        <ImageOff className="h-6 w-6" />
      </div>
    );
  }

  return <img src={url} alt="" className="h-32 w-full rounded-lg object-cover" />;
}
