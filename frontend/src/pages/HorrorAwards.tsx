import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { AWARD_CATEGORIES, type AwardCategoryId } from "@/lib/horrorAwards";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Página aberta (sem login) da votação do Horror Movie Awards. Cada navegador ganha um
// voterId guardado nele: votar de novo só troca o voto anterior. Rascunho também fica
// no navegador, pra não perder o que escreveu se a página recarregar.
const STORE_KEY = "horror-awards";
const OTHER = "__other__";

type Choice = { pick: string; other: string; reason: string };
type Saved = { voterId: string; name: string; choices: Partial<Record<AwardCategoryId, Choice>>; sent: boolean };

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    // navegador sem armazenamento: começa do zero
  }
  return { voterId: crypto.randomUUID(), name: "", choices: {}, sent: false };
}

function useHorrorFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Creepster&display=swap";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
}

const logoFont = { fontFamily: '"Creepster", "Chiller", fantasy' };
const displayFont = { fontFamily: '"Cinzel", Georgia, serif' };

export default function HorrorAwards() {
  useHorrorFonts();
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [open, setOpen] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Horror Movie Awards · Teacher Kessia Lima";
    api
      .get<{ open: boolean }>("/api/awards")
      .then((r) => setOpen(r.open))
      .catch(() => setOpen(true));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    } catch {
      // sem armazenamento: só não lembra depois
    }
  }, [saved]);

  function setChoice(id: AwardCategoryId, patch: Partial<Choice>) {
    setSaved((s) => ({
      ...s,
      choices: { ...s.choices, [id]: { pick: "", other: "", reason: "", ...s.choices[id], ...patch } },
    }));
  }

  const picks = Object.fromEntries(
    AWARD_CATEGORIES.flatMap((c) => {
      const ch = saved.choices[c.id];
      const pick = ch?.pick === OTHER ? ch.other.trim() : ch?.pick;
      return pick ? [[c.id, { pick, reason: ch?.reason.trim() ?? "" }]] : [];
    }),
  );
  const pickedCount = Object.keys(picks).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!saved.name.trim()) return setError("Write your name first.");
    if (pickedCount === 0) return setError("Choose at least one nominee.");
    setSending(true);
    try {
      await api.post("/api/awards/vote", { voterId: saved.voterId, name: saved.name.trim(), picks });
      setSaved((s) => ({ ...s, sent: true }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiError && err.code === "closed") setOpen(false);
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#120c11] bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,#3a1422_0%,transparent_70%)] text-[#f1e7dc] [color-scheme:dark]">
      <div className="mx-auto grid max-w-2xl gap-6 px-4 py-10">
        <header className="grid gap-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#d9b45a]" style={displayFont}>
            Teacher Kessia Lima · Halloween Class
          </p>
          <h1 className="text-5xl leading-none sm:text-6xl" style={{ ...logoFont, textShadow: "0 0 24px rgba(179,38,58,.55)" }}>
            Horror Movie Awards
          </h1>
          <p className="text-[#b09d96]">Choose your nominee in each category and tell us why. In English, please!</p>
        </header>

        {open === null ? (
          <div className="flex justify-center py-10 text-[#b09d96]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : saved.sent ? (
          <section className="grid gap-4 rounded-md border border-[#9c7b2e] bg-[#1c1219] p-6 text-center">
            <h2 className="text-2xl font-black text-[#d9b45a]" style={displayFont}>
              Thank you, {saved.name}!
            </h2>
            <p>Your votes are in. The winners will be revealed in class. 🎃</p>
            {open && (
              <button
                type="button"
                onClick={() => setSaved((s) => ({ ...s, sent: false }))}
                className="mx-auto text-sm text-[#b09d96] underline hover:text-[#f1e7dc]"
              >
                Change my votes
              </button>
            )}
          </section>
        ) : !open ? (
          <section className="rounded-md border border-[#3a2833] bg-[#1c1219] p-6 text-center">
            <h2 className="text-xl font-bold text-[#d9b45a]" style={displayFont}>
              Voting is closed
            </h2>
            <p className="mt-2 text-[#b09d96]">The envelopes are sealed. See you in class!</p>
          </section>
        ) : (
          <form onSubmit={submit} className="grid gap-5">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold">Your name</span>
              <input
                id="voter-name"
                value={saved.name}
                onChange={(e) => setSaved((s) => ({ ...s, name: e.target.value }))}
                maxLength={60}
                autoComplete="given-name"
                className="rounded border border-[#3a2833] bg-[#120c11] px-3 py-2.5 text-base outline-none focus:border-[#d9b45a]"
                placeholder="e.g. Ana"
              />
            </label>

            {AWARD_CATEGORIES.map((c, i) => {
              const ch = saved.choices[c.id];
              return (
                <fieldset key={c.id} className="grid gap-3 rounded-md border border-[#3a2833] bg-[#1c1219] p-4 sm:p-5">
                  <legend className="sr-only">{c.title}</legend>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.25em] text-[#b09d96]" style={displayFont}>
                      Category {i + 1} of {AWARD_CATEGORIES.length}
                    </p>
                    <h2 className="text-xl font-black leading-tight text-[#d9b45a] sm:text-2xl" style={displayFont}>
                      {c.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...c.nominees, OTHER].map((n) => {
                      const selected = ch?.pick === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setChoice(c.id, { pick: selected ? "" : n })}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9b45a]",
                            selected
                              ? "border-[#d9b45a] bg-[#d9b45a] text-[#1a1208]"
                              : "border-[#3a2833] bg-[#241821] hover:border-[#9c7b2e]",
                          )}
                        >
                          {n === OTHER ? `${c.otherLabel}…` : n}
                        </button>
                      );
                    })}
                  </div>
                  {ch?.pick === OTHER && (
                    <input
                      id={`other-${c.id}`}
                      value={ch.other}
                      onChange={(e) => setChoice(c.id, { other: e.target.value })}
                      maxLength={100}
                      autoFocus
                      placeholder={c.id === "creepiest" ? "Character's name" : "Movie title"}
                      aria-label={c.otherLabel}
                      className="rounded border border-[#3a2833] bg-[#120c11] px-3 py-2 outline-none focus:border-[#d9b45a]"
                    />
                  )}
                  {ch?.pick && (
                    <label className="grid gap-1.5">
                      <span className="text-sm text-[#b09d96]">
                        Why? <span className="italic">Try: “{c.starters[0]}”</span>
                      </span>
                      <textarea
                        id={`reason-${c.id}`}
                        value={ch.reason}
                        onChange={(e) => setChoice(c.id, { reason: e.target.value })}
                        maxLength={400}
                        rows={2}
                        className="resize-y rounded border border-[#3a2833] bg-[#120c11] px-3 py-2 outline-none focus:border-[#d9b45a]"
                      />
                    </label>
                  )}
                </fieldset>
              );
            })}

            {error && <p className="text-center text-sm text-[#e08a96]">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="flex items-center justify-center gap-2 rounded bg-[#d9b45a] px-5 py-3 text-base font-bold text-[#1a1208] hover:brightness-110 disabled:opacity-60"
              style={displayFont}
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send my votes ({pickedCount}/{AWARD_CATEGORIES.length})
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
