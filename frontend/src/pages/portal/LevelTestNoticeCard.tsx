import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gauge } from "lucide-react";

// Tela inicial do aluno: aviso de que a professora liberou o teste de nível.
// Some sozinho quando ele termina o teste.
export default function LevelTestNoticeCard() {
  const { t } = usePortalPrefs();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .get<{ assignedAt: string | null }>("/api/me/level-test")
      .then((d) => setPending(!!d.assignedAt))
      .catch(() => setPending(false));
  }, []);

  if (!pending) return null;

  return (
    <Card className="mt-6 border-primary/40 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div className="flex items-center gap-3">
          <Gauge className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">{t("Seu teste de nível está liberado!", "Your level test is ready!")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Leva uns 20 a 30 minutos e mostra seu nível de inglês na hora.", "It takes about 20 to 30 minutes and shows your English level right away.")}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/portal/teste-de-nivel">{t("Fazer o teste", "Take the test")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
