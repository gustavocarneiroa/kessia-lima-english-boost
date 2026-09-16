// Extrai só o link (src) de um <iframe> colado pela professora — nunca guardamos o
// HTML bruto, pra não correr risco de salvar/repetir algo malicioso (ex.: um <script>
// disfarçado de iframe). Height/width viram números fixos e o resto é ignorado.

export type ParsedEmbed = {
  src: string;
  height: number;
  width: string;
};

export function parseIframeEmbed(raw: string): ParsedEmbed | null {
  const tagMatch = raw.match(/<iframe\b[^>]*>/i);
  const tag = tagMatch ? tagMatch[0] : raw;

  const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (!srcMatch) return null;

  let src: URL;
  try {
    src = new URL(srcMatch[1]);
  } catch {
    return null;
  }
  if (src.protocol !== "https:") return null;

  const heightMatch = tag.match(/\bheight\s*=\s*["']?(\d+)/i);
  const height = heightMatch ? Math.min(2000, Math.max(200, Number(heightMatch[1]))) : 500;

  return { src: src.toString(), height, width: "100%" };
}
