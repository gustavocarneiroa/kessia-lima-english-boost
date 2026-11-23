import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { LearningProfileSummary } from "@/components/LearningProfile";
import type { LearningProfileResponse } from "@/lib/learningProfile";

/** Página do aluno (professora): respostas do "perfil de aprendizagem" que o aluno preencheu. */
export default function StudentLearningProfileCard({ studentId }: { studentId: string }) {
  const { t, locale } = usePortalPrefs();
  const [data, setData] = useState<LearningProfileResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    api
      .get<LearningProfileResponse>(`/api/students/${studentId}/learning-profile`)
      .then(setData)
      .catch(() => setFailed(true));
  }, [studentId]);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{t("Perfil de aprendizagem", "Learning profile")}</CardTitle>
        <CardDescription>
          {data?.answers && data.updatedAt
            ? t(
                `Respondido pelo aluno em ${new Date(data.updatedAt).toLocaleDateString(locale)}.`,
                `Answered by the student on ${new Date(data.updatedAt).toLocaleDateString(locale)}.`,
              )
            : t("O que o aluno contou sobre objetivos, dificuldades e gostos.", "What the student shared about goals, difficulties and tastes.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {failed ? (
          <p className="text-sm text-destructive">{t("Não foi possível carregar.", "Couldn't load.")}</p>
        ) : !data ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : data.answers ? (
          <LearningProfileSummary answers={data.answers} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t(
              'O aluno ainda não respondeu. Ele vê um aviso na tela inicial dele e responde em "Meu perfil".',
              'The student hasn\'t answered yet. They see a reminder on their home screen and answer under "My profile".',
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
