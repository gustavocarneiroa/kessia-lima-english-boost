import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

export function VocabImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (dataUrl: string) => void;
}) {
  async function onFile(file: File) {
    onChange(await blobToDataUrl(file));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
            <Upload className="h-4 w-4" />
            Escolher imagem
          </span>
        </label>
        {value && <span className="text-xs text-muted-foreground">Imagem pronta</span>}
      </div>
      {value && <img src={value} alt="" className="h-24 rounded-md object-cover" />}
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
