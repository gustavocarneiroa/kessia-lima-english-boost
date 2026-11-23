import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import type { LearningProfileResponse } from "@/lib/learningProfile";

// Tela inicial do aluno: aviso pra completar o perfil de aprendizagem. Some depois que ele responde.
export default function LearningProfileNoticeCard() {
  const { t } = usePortalPrefs();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .get<LearningProfileResponse>("/api/me/learning-profile")
      .then((d) => setPending(!d.answers))
      .catch(() => setPending(false));
  }, []);

  if (!pending) return null;

  return (
    <Card className="mt-6 border-primary/40 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">{t("Complete seu perfil de aprendizagem", "Complete your learning profile")}</p>
            <p className="text-sm text-muted-foreground">
              {t(
                "Leva uns 3 minutos e ajuda a professora a montar aulas do seu jeito.",
                "It takes about 3 minutes and helps your teacher plan lessons your way.",
              )}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/portal/perfil#perfil-de-aprendizagem">{t("Responder", "Answer")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
