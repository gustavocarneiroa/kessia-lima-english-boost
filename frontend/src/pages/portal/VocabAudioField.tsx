import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mic, Square, Upload } from "lucide-react";

export function VocabAudioField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (dataUrl: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      onChange(await blobToDataUrl(blob));
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
  }

  function stop() {
    recRef.current?.stop();
    setRecording(false);
  }

  async function onFile(file: File) {
    onChange(await blobToDataUrl(file));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={start}>
            <Mic className="h-4 w-4" />
            Gravar
          </Button>
        ) : (
          <Button type="button" variant="destructive" size="sm" className="gap-2" onClick={stop}>
            <Square className="h-4 w-4" />
            Parar
          </Button>
        )}
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
            <Upload className="h-4 w-4" />
            Arquivo
          </span>
        </label>
        {value && <span className="text-xs text-muted-foreground">Áudio pronto</span>}
      </div>
      {value && <audio className="w-full" controls src={value} />}
    </div>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
