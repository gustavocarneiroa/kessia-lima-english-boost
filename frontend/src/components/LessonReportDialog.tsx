import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Lock, Eye } from "lucide-react";
import {
  DURATION_OPTIONS,
  HOMEWORK_LABELS,
  LESSON_STATUS_LABELS,
  PARTICIPATION_LABELS,
  PORTUGUESE_LABELS,
  PUNCTUALITY_LABELS,
  SKILL_LABELS,
  isRealized,
  type LessonReport,
} from "@/lib/lessonReport";

export interface ReportableLesson {
  id: string;
  subject: string;
  scheduledAt: string;
  activityLink: string | null;
  report?: LessonReport | null;
}

interface Props {
  lesson: ReportableLesson | null;
  studentName?: string;
  onClose: () => void;
  onSaved: () => void;
}

type FormState = {
  status: string;
  durationMinutes: string;
  punctuality: string;
  homework: string;
  participation: string;
  portuguese: string;
  skills: string[];
  material: string;
  materialLink: string;
  summary: string;
  comments: string;
  studentHomework: string;
  studentLinks: string;
  studentMessage: string;
};

function initialForm(lesson: ReportableLesson): FormState {
  const r = lesson.report;
  const past = new Date(lesson.scheduledAt).getTime() <= Date.now();
  return {
    status: r?.status ?? (past ? "given" : "cancelled_student_notice"),
    durationMinutes: String(r?.durationMinutes ?? 60),
    punctuality: r?.punctuality ?? "on_time",
    homework: r?.homework ?? "na",
    participation: r?.participation ?? "",
    portuguese: r?.portuguese ?? "",
    skills: r?.skills ?? [],
    material: r?.material ?? lesson.subject ?? "",
    materialLink: r?.materialLink ?? "",
    summary: r?.summary ?? "",
    comments: r?.comments ?? "",
    studentHomework: r?.studentHomework ?? "",
    studentLinks: r?.studentLinks ?? lesson.activityLink ?? "",
    studentMessage: r?.studentMessage ?? "",
  };
}

function OptionSelect({
  value,
  onChange,
  labels,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  labels: Record<string, [string, string]>;
  placeholder: string;
}) {
  const { t } = usePortalPrefs();
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(labels).map(([key, [pt, en]]) => (
          <SelectItem key={key} value={key}>
            {t(pt, en)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Janela "Registrar aula" — o report pedagógico de uma aula (só professora). */
export default function LessonReportDialog({ lesson, studentName, onClose, onSaved }: Props) {
  const { t, locale } = usePortalPrefs();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(lesson ? initialForm(lesson) : null);
    setError(null);
  }, [lesson]);

  if (!lesson || !form) return null;
  const realized = isRealized(form.status);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm({ ...form, [key]: value });

  function toggleSkill(skill: string, on: boolean) {
    set("skills", on ? [...form!.skills, skill] : form!.skills.filter((s) => s !== skill));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !lesson) return;
    setError(null);
    if (realized && (!form.participation || !form.portuguese)) {
      setError(t("Marque a participação e o uso do português.", "Choose participation and Portuguese use."));
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/lessons/${lesson.id}/report`, {
        status: form.status,
        durationMinutes: realized ? Number(form.durationMinutes) : null,
        punctuality: realized ? form.punctuality : null,
        homework: realized ? form.homework : null,
        participation: realized ? form.participation : null,
        portuguese: realized ? form.portuguese : null,
        skills: realized ? form.skills : [],
        material: form.material,
        materialLink: form.materialLink,
        summary: form.summary,
        comments: form.comments,
        studentHomework: form.studentHomework,
        studentLinks: form.studentLinks,
        studentMessage: form.studentMessage,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível salvar o registro.", "Couldn't save the report."));
    } finally {
      setSaving(false);
    }
  }

  const when = new Date(lesson.scheduledAt).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Registrar aula", "Lesson report")}</DialogTitle>
          <DialogDescription>
            {[studentName, lesson.subject, when].filter(Boolean).join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("Como foi a aula?", "What happened?")}</Label>
              <OptionSelect
                value={form.status}
                onChange={(v) => set("status", v)}
                labels={LESSON_STATUS_LABELS}
                placeholder={t("Escolha", "Choose")}
              />
            </div>

            {realized && (
              <>
                <div className="space-y-1.5">
                  <Label>{t("Duração", "Duration")}</Label>
                  <Select value={form.durationMinutes} onValueChange={(v) => set("durationMinutes", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Pontualidade", "Punctuality")}</Label>
                  <OptionSelect
                    value={form.punctuality}
                    onChange={(v) => set("punctuality", v)}
                    labels={PUNCTUALITY_LABELS}
                    placeholder={t("Escolha", "Choose")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Fez o homework da aula passada?", "Did last lesson's homework?")}</Label>
                  <OptionSelect
                    value={form.homework}
                    onChange={(v) => set("homework", v)}
                    labels={HOMEWORK_LABELS}
                    placeholder={t("Escolha", "Choose")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Participação", "Participation")}</Label>
                  <OptionSelect
                    value={form.participation}
                    onChange={(v) => set("participation", v)}
                    labels={PARTICIPATION_LABELS}
                    placeholder={t("Escolha", "Choose")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Uso do português", "Portuguese use")}</Label>
                  <OptionSelect
                    value={form.portuguese}
                    onChange={(v) => set("portuguese", v)}
                    labels={PORTUGUESE_LABELS}
                    placeholder={t("Escolha", "Choose")}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("Skills praticadas", "Skills practised")}</Label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {Object.entries(SKILL_LABELS).map(([key, [pt, en]]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.skills.includes(key)}
                          onCheckedChange={(c) => toggleSkill(key, c === true)}
                        />
                        {t(pt, en)}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="r-material">{t("Material / conteúdo", "Material / content")}</Label>
              <Input id="r-material" value={form.material} onChange={(e) => set("material", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-material-link">{t("Link do material", "Material link")}</Label>
              <Input
                id="r-material-link"
                type="url"
                placeholder="https://..."
                value={form.materialLink}
                onChange={(e) => set("materialLink", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-dashed p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" /> {t("Só você vê", "Only you see this")}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="r-summary">{t("Resumo da aula", "Lesson summary")}</Label>
              <Textarea
                id="r-summary"
                rows={3}
                placeholder={t("O que foi trabalhado, dificuldades, o que retomar…", "What was covered, difficulties, what to review…")}
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-comments">{t("Comentários", "Comments")}</Label>
              <Textarea id="r-comments" rows={2} value={form.comments} onChange={(e) => set("comments", e.target.value)} />
            </div>
          </div>

          <div className="space-y-4 rounded-lg bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4" /> {t("O aluno vê na página de aulas dele", "The student sees this on their lessons page")}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="r-hw">{t("Homework pra próxima aula", "Homework for next lesson")}</Label>
              <Textarea id="r-hw" rows={2} value={form.studentHomework} onChange={(e) => set("studentHomework", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-links">{t("Links (um por linha)", "Links (one per line)")}</Label>
              <Textarea id="r-links" rows={2} value={form.studentLinks} onChange={(e) => set("studentLinks", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-msg">{t("Recado pro aluno", "Message to the student")}</Label>
              <Textarea id="r-msg" rows={2} value={form.studentMessage} onChange={(e) => set("studentMessage", e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? t("Salvando…", "Saving…") : t("Salvar registro", "Save report")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
