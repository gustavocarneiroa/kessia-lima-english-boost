import { useState, type ReactNode } from "react";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CORRECTION_LABELS,
  DIFFICULTY_LABELS,
  GOAL_LABELS,
  RATING_LABELS,
  SELF_SKILLS,
  SELF_SKILL_LABELS,
  STYLE_LABELS,
  TOPIC_LABELS,
  USAGE_LABELS,
  type LearningProfileAnswers,
} from "@/lib/learningProfile";

type L = [pt: string, en: string];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-3 py-1.5 text-left text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{title}</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

/** Formulário que o aluno preenche em "Meu perfil". */
export function LearningProfileForm({
  initial,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: LearningProfileAnswers;
  saving: boolean;
  error: string | null;
  onSave: (a: LearningProfileAnswers) => void;
  onCancel?: () => void;
}) {
  const { t } = usePortalPrefs();
  const [a, setA] = useState<LearningProfileAnswers>(initial);
  const many = t("Pode marcar quantas quiser.", "Pick as many as you like.");

  const toggle = (key: "goals" | "difficulties" | "topics" | "styles", value: string) =>
    setA((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));

  const chips = (key: "goals" | "difficulties" | "topics" | "styles", labels: Record<string, L>) => (
    <div className="flex flex-wrap gap-2">
      {Object.entries(labels).map(([id, label]) => (
        <Chip key={id} active={a[key].includes(id)} onClick={() => toggle(key, id)}>
          {t(...label)}
        </Chip>
      ))}
    </div>
  );

  const otherInput = (key: "goalsOther" | "difficultiesOther" | "topicsOther") => (
    <Input
      value={a[key] ?? ""}
      onChange={(e) => { const v = e.target.value; setA((p) => ({ ...p, [key]: v })); }}
      placeholder={t("Outro (opcional)", "Other (optional)")}
      maxLength={500}
    />
  );

  const single = (value: string | null | undefined, labels: Record<string, L>, set: (v: string | null) => void) => (
    <div className="flex flex-wrap gap-2">
      {Object.entries(labels).map(([id, label]) => (
        <Chip key={id} active={value === id} onClick={() => set(value === id ? null : id)}>
          {t(...label)}
        </Chip>
      ))}
    </div>
  );

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(a);
      }}
    >
      <Question title={t("1. Por que você está estudando inglês?", "1. Why are you studying English?")} hint={many}>
        {chips("goals", GOAL_LABELS)}
        {otherInput("goalsOther")}
      </Question>

      <Question title={t("2. O que é mais difícil pra você hoje?", "2. What's hardest for you right now?")} hint={many}>
        {chips("difficulties", DIFFICULTY_LABELS)}
        {otherInput("difficultiesOther")}
      </Question>

      <Question title={t("3. Como você avalia seu inglês hoje?", "3. How would you rate your English today?")}>
        <div className="space-y-3">
          {SELF_SKILLS.map((skill) => (
            <div key={skill} className="space-y-1">
              <p className="text-sm">{t(...SELF_SKILL_LABELS[skill])}</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip
                    key={n}
                    active={a.selfRating[skill] === n}
                    onClick={() =>
                      setA((p) => ({ ...p, selfRating: { ...p.selfRating, [skill]: p.selfRating[skill] === n ? null : n } }))
                    }
                  >
                    {t(...RATING_LABELS[n])}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Question>

      <Question title={t("4. Com que frequência você usa inglês?", "4. How often do you use English?")}>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm">{t("No trabalho", "At work")}</p>
            {single(a.usageWork, USAGE_LABELS, (v) => setA((p) => ({ ...p, usageWork: v })))}
          </div>
          <div className="space-y-1">
            <p className="text-sm">{t("Fora do trabalho", "Outside work")}</p>
            {single(a.usageOutside, USAGE_LABELS, (v) => setA((p) => ({ ...p, usageOutside: v })))}
          </div>
        </div>
      </Question>

      <Question
        title={t("5. Quais assuntos você gosta?", "5. Which topics do you enjoy?")}
        hint={t("Ajuda a professora a montar aulas do seu jeito.", "Helps your teacher plan lessons you'll enjoy.")}
      >
        {chips("topics", TOPIC_LABELS)}
        {otherInput("topicsOther")}
      </Question>

      <Question title={t("6. Como você gosta de aprender?", "6. How do you like to learn?")} hint={many}>
        {chips("styles", STYLE_LABELS)}
        <p className="pt-1 text-sm">{t("Quando eu erro, prefiro ser corrigido(a):", "When I make a mistake, I prefer to be corrected:")}</p>
        {single(a.correction, CORRECTION_LABELS, (v) => setA((p) => ({ ...p, correction: v })))}
      </Question>

      <div className="space-y-2">
        <Label htmlFor="lp-message" className="font-medium">
          {t("7. Tem algo que você quer que a professora saiba?", "7. Anything you'd like your teacher to know?")}
        </Label>
        <Textarea
          id="lp-message"
          rows={3}
          maxLength={2000}
          value={a.message ?? ""}
          onChange={(e) => { const v = e.target.value; setA((p) => ({ ...p, message: v })); }}
          placeholder={t("Opcional", "Optional")}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? t("Salvando…", "Saving…") : t("Salvar respostas", "Save answers")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            {t("Cancelar", "Cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

/** Respostas em modo leitura (aluno depois de salvar e professora na página do aluno). */
export function LearningProfileSummary({ answers }: { answers: LearningProfileAnswers }) {
  const { t } = usePortalPrefs();
  const dash = <span className="text-sm text-muted-foreground">—</span>;

  const list = (ids: string[], labels: Record<string, L>, other?: string | null) => {
    const items = [...ids.map((id) => (labels[id] ? t(...labels[id]) : id)), ...(other?.trim() ? [other.trim()] : [])];
    if (items.length === 0) return dash;
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((label) => (
          <Badge key={label} variant="secondary" className="font-normal">
            {label}
          </Badge>
        ))}
      </div>
    );
  };

  const Row = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{title}</p>
      {children}
    </div>
  );

  const usage = (v?: string | null) => (v && USAGE_LABELS[v] ? t(...USAGE_LABELS[v]) : "—");

  return (
    <div className="space-y-4">
      <Row title={t("Por que estuda inglês", "Why studying English")}>{list(answers.goals, GOAL_LABELS, answers.goalsOther)}</Row>
      <Row title={t("O que é mais difícil", "What's hardest")}>
        {list(answers.difficulties, DIFFICULTY_LABELS, answers.difficultiesOther)}
      </Row>
      <Row title={t("Autoavaliação", "Self-assessment")}>
        <div className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {SELF_SKILLS.map((skill) => {
            const n = answers.selfRating[skill];
            return (
              <p key={skill}>
                <span className="text-muted-foreground">{t(...SELF_SKILL_LABELS[skill])}: </span>
                <span className="font-medium">{n ? t(...RATING_LABELS[n]) : "—"}</span>
              </p>
            );
          })}
        </div>
      </Row>
      <Row title={t("Usa inglês", "Uses English")}>
        <p className="text-sm">
          <span className="text-muted-foreground">{t("No trabalho: ", "At work: ")}</span>
          <span className="font-medium">{usage(answers.usageWork)}</span>
          <span className="text-muted-foreground"> · {t("Fora do trabalho: ", "Outside work: ")}</span>
          <span className="font-medium">{usage(answers.usageOutside)}</span>
        </p>
      </Row>
      <Row title={t("Assuntos de que gosta", "Favorite topics")}>{list(answers.topics, TOPIC_LABELS, answers.topicsOther)}</Row>
      <Row title={t("Como gosta de aprender", "How they like to learn")}>
        {list(answers.styles, STYLE_LABELS)}
        {answers.correction && CORRECTION_LABELS[answers.correction] && (
          <p className="pt-1 text-sm">
            <span className="text-muted-foreground">{t("Correção: ", "Correction: ")}</span>
            <span className="font-medium">{t(...CORRECTION_LABELS[answers.correction])}</span>
          </p>
        )}
      </Row>
      {answers.message?.trim() && (
        <Row title={t("Recado pra professora", "Note for the teacher")}>
          <p className="whitespace-pre-wrap text-sm">{answers.message}</p>
        </Row>
      )}
    </div>
  );
}
