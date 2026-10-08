import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen, ExternalLink } from "lucide-react";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";

interface Profile {
  fullName?: string | null;
  phone?: string | null;
  occupation?: string | null;
  englishLevel?: string | null;
  interests?: string | null;
  learningGoals?: string | null;
  classWeekday?: string | null;
  classTime?: string | null;
  installmentValue?: string | null;
  paymentDueDay?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  driveFolderUrl?: string | null;
}

const WEEKDAY_LABELS: Record<string, [pt: string, en: string]> = {
  monday: ["Segunda-feira", "Monday"],
  tuesday: ["Terça-feira", "Tuesday"],
  wednesday: ["Quarta-feira", "Wednesday"],
  thursday: ["Quinta-feira", "Thursday"],
  friday: ["Sexta-feira", "Friday"],
  saturday: ["Sábado", "Saturday"],
  sunday: ["Domingo", "Sunday"],
};

function formatDate(value: string | null | undefined, lang: "pt" | "en") {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return lang === "en" ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

export default function MyProfile() {
  const { t, lang } = usePortalPrefs();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Profile>("/api/me/profile")
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const weekday = profile?.classWeekday ? WEEKDAY_LABELS[profile.classWeekday] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Meu perfil", "My profile")}</h1>
        <p className="text-muted-foreground">{t("Seus dados cadastrados pela professora.", "Your details, as registered by your teacher.")}</p>
      </div>

      {profile?.driveFolderUrl && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{t("Minha pasta no Google Drive", "My Google Drive folder")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Materiais e arquivos que a professora separou pra você.", "Materials and files your teacher set aside for you.")}
                </p>
              </div>
            </div>
            <Button asChild>
              <a href={profile.driveFolderUrl} target="_blank" rel="noopener noreferrer">
                {t("Abrir pasta", "Open folder")} <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Dados", "Details")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Nome completo", "Full name")} value={profile?.fullName} />
                <Field label={t("Telefone / WhatsApp", "Phone / WhatsApp")} value={profile?.phone} />
                <Field label={t("Profissão / emprego", "Occupation / job")} value={profile?.occupation} />
                <Field label={t("Nível atual de inglês", "Current English level")} value={profile?.englishLevel} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("Dia da aula", "Lesson day")}
                  value={weekday ? t(...weekday) : profile?.classWeekday}
                />
                <Field label={t("Horário da aula", "Lesson time")} value={profile?.classTime} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Valor da parcela", "Installment amount")} value={profile?.installmentValue} />
                <Field label={t("Dia de vencimento", "Due day")} value={profile?.paymentDueDay} />
                <Field label={t("Início do contrato", "Contract start")} value={formatDate(profile?.contractStart, lang)} />
                <Field label={t("Fim do contrato", "Contract end")} value={formatDate(profile?.contractEnd, lang)} />
              </div>

              <Field label={t("O que gosta de aprender / interesses", "What you like to learn / interests")} value={profile?.interests} />
              <Field label={t("Metas de estudo", "Study goals")} value={profile?.learningGoals} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
