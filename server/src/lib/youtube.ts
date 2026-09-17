const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeVideoId(raw: string): string | null {
  const trimmed = raw.trim();
  if (VIDEO_ID_RE.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return VIDEO_ID_RE.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && VIDEO_ID_RE.test(id) ? id : null;
    }
    const match = url.pathname.match(/^\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[2];
  }

  return null;
}
