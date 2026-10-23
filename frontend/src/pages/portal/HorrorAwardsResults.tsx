import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { AWARD_CATEGORIES, nomineeLabel, type AwardCategoryId, type AwardsResults } from "@/lib/horrorAwards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Copy, Loader2, Mail, Trash2 } from "lucide-react";

// Horror Movie Awards (só professora): link da votação aberta, quem já votou e o
// resultado de cada categoria, escondido até ela "abrir o envelope" na aula.
type Reveal = "sealed" | "drumroll" | "open";

export default function HorrorAwardsResults() {
  const { t } = usePortalPrefs();
  const [data, setData] = useState<AwardsResults | null>(null);
  const [reveal, setReveal] = useState<Partial<Record<AwardCategoryId, Reveal>>>({});
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  const link = `${window.location.origin}/awards`;

  async function load() {
    setData(await api.get<AwardsResults>("/api/awards/results"));
  }

  // atualiza sozinho enquanto os alunos votam
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load().catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — o link continua selecionável no campo
    }
  }

  async function setOpen(open: boolean) {
    setData((d) => (d ? { ...d, open } : d));
    await api.put("/api/awards/open", { open });
  }

  async function clearVotes() {
    await api.delete("/api/awards/votes");
    setReveal({});
    setClearing(false);
    await load();
  }

  function openEnvelope(id: AwardCategoryId) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReveal((r) => ({ ...r, [id]: "drumroll" }));
    setTimeout(() => setReveal((r) => ({ ...r, [id]: "open" })), reduce ? 200 : 2200);
  }

  if (!data) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Horror Movie Awards</h1>
        <p className="text-muted-foreground">
          {t(
            "Mande o link pros alunos votarem (não precisa de login). Na aula, compartilhe esta tela e abra os envelopes um por um.",
            "Send the link to your students (no login needed). In class, share this screen and open the envelopes one by one.",
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Link da votação", "Voting link")}</CardTitle>
          <CardDescription>
            {data.voters.length === 0
              ? t("Ninguém votou ainda.", "Nobody has voted yet.")
              : `${data.voters.length} ${data.voters.length === 1 ? t("pessoa votou", "person voted") : t("pessoas votaram", "people voted")}: ${data.voters.map((v) => v.name).join(", ")}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input id="awards-link" readOnly value={link} onFocus={(e) => e.target.select()} />
            <Button variant="outline" onClick={copy} className="shrink-0">
              {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copied ? t("Copiado", "Copied") : t("Copiar", "Copy")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox id="awards-open" checked={data.open} onCheckedChange={(v) => void setOpen(v === true)} />
              {t("Votação aberta (desmarque pra encerrar)", "Voting open (untick to close)")}
            </label>
            <Button variant="ghost" size="sm" onClick={() => setClearing(true)} disabled={data.voters.length === 0}>
              <Trash2 className="mr-1 h-4 w-4" />
              {t("Apagar todos os votos", "Delete all votes")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {AWARD_CATEGORIES.map((c) => {
          const results = (data.categories.find((x) => x.id === c.id)?.results ?? []).map((r) => ({ ...r, label: nomineeLabel(c, r.label) }));
          const total = results.reduce((s, r) => s + r.count, 0);
          const top = results[0]?.count ?? 0;
          const winners = results.filter((r) => r.count === top && top > 0);
          const state = reveal[c.id] ?? "sealed";
          return (
            <Card key={c.id} className="overflow-hidden">
              <CardHeader className="bg-[#1c1219] text-[#f1e7dc]">
                <CardTitle className="font-serif text-lg text-[#d9b45a]">{c.title}</CardTitle>
                <CardDescription className="text-[#b09d96]">
                  {total} {total === 1 ? t("voto", "vote") : t("votos", "votes")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {state === "sealed" && (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Button onClick={() => openEnvelope(c.id)} disabled={total === 0}>
                      <Mail className="mr-2 h-4 w-4" />
                      {t("Abrir o envelope", "Open the envelope")}
                    </Button>
                    {total === 0 && <p className="text-sm text-muted-foreground">{t("Ainda sem votos.", "No votes yet.")}</p>}
                  </div>
                )}
                {state === "drumroll" && (
                  <div className="py-6 text-center">
                    <p className="text-muted-foreground">And the award goes to…</p>
                    <p className="mt-2 animate-pulse text-4xl">🥁</p>
                  </div>
                )}
                {state === "open" && (
                  <>
                    <div className="rounded-md bg-[#d9b45a]/15 p-4 text-center animate-in zoom-in-75 duration-500">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {winners.length > 1 ? "It's a tie! The winners are" : "And the award goes to…"}
                      </p>
                      <p className="mt-1 font-serif text-2xl font-bold">{winners.map((w) => w.label).join(" & ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {top} {top === 1 ? "vote" : "votes"}
                      </p>
                    </div>
                    <ol className="space-y-3">
                      {results.map((r) => (
                        <li key={r.label} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 font-medium">{r.label}</span>
                            <Badge variant={r.count === top ? "default" : "secondary"} className="tabular-nums">
                              {r.count}
                            </Badge>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded bg-muted">
                            <div className="h-full bg-[#b3263a]" style={{ width: `${(r.count / top) * 100}%` }} />
                          </div>
                          <ul className="space-y-0.5 text-sm text-muted-foreground">
                            {r.voters.map((v, i) => (
                              <li key={i}>
                                <span className="font-medium text-foreground">{v.name}</span>
                                {v.reason ? `: “${v.reason}”` : ""}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                    <Button variant="ghost" size="sm" onClick={() => setReveal((rv) => ({ ...rv, [c.id]: "sealed" }))}>
                      {t("Fechar o envelope de novo", "Seal the envelope again")}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={clearing} onOpenChange={setClearing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Apagar todos os votos?", "Delete all votes?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Todos os votos e justificativas somem e a votação começa do zero. Não dá pra desfazer.",
                "Every vote and reason is removed and voting starts over. This can't be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void clearVotes()}>{t("Apagar votos", "Delete votes")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
