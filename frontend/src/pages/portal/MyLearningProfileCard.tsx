import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { LearningProfileForm, LearningProfileSummary } from "@/components/LearningProfile";
import { emptyAnswers, type LearningProfileAnswers, type LearningProfileResponse } from "@/lib/learningProfile";

/** "Meu perfil de aprendizagem" — o aluno preenche e pode atualizar quando quiser. */
export default function MyLearningProfileCard() {
  const { t, locale } = usePortalPrefs();
  const [data, setData] = useState<LearningProfileResponse | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    api
      .get<LearningProfileResponse>("/api/me/learning-profile")
      .then((d) => {
        setData(d);
        setEditing(!d.answers);
        if (window.location.hash === "#perfil-de-aprendizagem") {
          setTimeout(() => document.getElementById("perfil-de-aprendizagem")?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      })
      .catch(() => setData({ answers: null, updatedAt: null }));
  }, []);

  async function save(answers: LearningProfileAnswers) {
    setSaving(true);
    setError(null);
    try {
      const d = await api.put<LearningProfileResponse>("/api/me/learning-profile", answers);
      setData(d);
      setEditing(false);
      setJustSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível salvar.", "Couldn't save."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="perfil-de-aprendizagem" className={!data?.answers ? "border-primary/40" : undefined}>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("Meu perfil de aprendizagem", "My learning profile")}</CardTitle>
          {data?.answers && !editing && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => {
                setJustSaved(false);
                setEditing(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> {t("Atualizar respostas", "Update answers")}
            </Button>
          )}
        </div>
        <CardDescription>
          {data?.answers && data.updatedAt
            ? t(
                `Respondido em ${new Date(data.updatedAt).toLocaleDateString(locale)}. Só você e a professora veem.`,
                `Answered on ${new Date(data.updatedAt).toLocaleDateString(locale)}. Only you and your teacher can see it.`,
              )
            : t(
                "Conte um pouco sobre você e seus objetivos — leva uns 3 minutos e ajuda a professora a montar aulas do seu jeito.",
                "Tell us a bit about you and your goals — it takes about 3 minutes and helps your teacher plan lessons your way.",
              )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : editing ? (
          <LearningProfileForm
            initial={{ ...emptyAnswers(), ...(data.answers ?? {}) }}
            saving={saving}
            error={error}
            onSave={save}
            onCancel={data.answers ? () => setEditing(false) : undefined}
          />
        ) : data.answers ? (
          <div className="space-y-4">
            {justSaved && (
              <p className="rounded-md bg-primary/10 p-3 text-sm">
                {t("Respostas salvas, obrigado! 💜", "Answers saved, thank you! 💜")}
              </p>
            )}
            <LearningProfileSummary answers={data.answers} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
