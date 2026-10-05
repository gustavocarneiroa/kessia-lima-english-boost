import { useMemo, useState } from "react";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { PRACTICE_RESOURCES, type Price, type Skill } from "@/config/practiceResources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Search, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SKILLS: { value: Skill; label: [pt: string, en: string] }[] = [
  { value: "listening", label: ["Listening (ouvir)", "Listening"] },
  { value: "speaking", label: ["Speaking (falar)", "Speaking"] },
  { value: "reading", label: ["Reading (ler)", "Reading"] },
  { value: "writing", label: ["Writing (escrever)", "Writing"] },
  { value: "vocabulary", label: ["Vocabulário", "Vocabulary"] },
  { value: "grammar", label: ["Gramática", "Grammar"] },
];

const SHORT_SKILL: Record<Skill, [pt: string, en: string]> = {
  listening: ["Listening", "Listening"],
  speaking: ["Speaking", "Speaking"],
  reading: ["Reading", "Reading"],
  writing: ["Writing", "Writing"],
  vocabulary: ["Vocabulário", "Vocabulary"],
  grammar: ["Gramática", "Grammar"],
};

const PRICES: Record<Price, [pt: string, en: string]> = {
  free: ["Gratuito", "Free"],
  freemium: ["Tem versão gratuita", "Has a free version"],
  paid: ["Pago", "Paid"],
};

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function Resources() {
  const { t } = usePortalPrefs();
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [price, setPrice] = useState<"" | Price>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRACTICE_RESOURCES.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.url.toLowerCase().includes(q)) &&
        skills.every((s) => r.skills.includes(s)) &&
        (!price || r.price === price),
    ).sort((a, b) => Number(!!b.recommended) - Number(!!a.recommended));
  }, [query, skills, price]);

  const hasFilters = query || skills.length > 0 || price;

  function toggleSkill(skill: Skill) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  function clearFilters() {
    setQuery("");
    setSkills([]);
    setPrice("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Recursos", "Resources")}</h1>
        <p className="text-muted-foreground">
          {t(
            "Sites e aplicativos para continuar praticando inglês fora da aula. Filtre pela habilidade que você quer treinar.",
            "Websites and apps to keep practicing English outside class. Filter by the skill you want to work on.",
          )}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label>{t("Habilidade", "Skill")}</Label>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => {
                const active = skills.includes(s.value);
                return (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    onClick={() => toggleSkill(s.value)}
                  >
                    {t(...s.label)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resource-search">{t("Buscar", "Search")}</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="resource-search"
                  className="pl-9"
                  placeholder={t("ex: podcast, pronúncia, BBC", "e.g. podcast, pronunciation, BBC")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Preço", "Price")}</Label>
              <Select value={price || "all"} onValueChange={(v) => setPrice(v === "all" ? "" : (v as Price))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todos", "All")}</SelectItem>
                  {(Object.keys(PRICES) as Price[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(...PRICES[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> {t("Limpar filtros", "Clear filters")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {filtered.length} {t("recurso(s)", "resource(s)")}
      </p>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("Nenhum recurso encontrado com esses filtros.", "No resources match these filters.")}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.url} className={cn("flex flex-col", r.recommended && "border-primary")}>
              <CardHeader className="space-y-1 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {r.name}
                    </a>
                  </CardTitle>
                  {r.recommended && (
                    <Badge className="shrink-0 gap-1">
                      <Star className="h-3 w-3" /> {t("Recomendo!", "Recommended!")}
                    </Badge>
                  )}
                </div>
                <CardDescription className="truncate">{hostname(r.url)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {r.skills.map((s) => (
                    <Badge key={s} variant={skills.includes(s) ? "default" : "secondary"}>
                      {t(...SHORT_SKILL[s])}
                    </Badge>
                  ))}
                  <Badge variant="outline">{t(...PRICES[r.price])}</Badge>
                </div>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                {r.note && <p className="text-sm italic text-muted-foreground">{r.note}</p>}
                <div className="mt-auto pt-1">
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {t("Abrir site", "Open website")} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
