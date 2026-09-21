import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
}

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Profile>("/api/me/profile")
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="text-muted-foreground">Seus dados cadastrados pela professora.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo" value={profile?.fullName} />
                <Field label="Telefone / WhatsApp" value={profile?.phone} />
                <Field label="Profissão / emprego" value={profile?.occupation} />
                <Field label="Nível atual de inglês" value={profile?.englishLevel} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Dia da aula"
                  value={profile?.classWeekday ? WEEKDAY_LABELS[profile.classWeekday] ?? profile.classWeekday : null}
                />
                <Field label="Horário da aula" value={profile?.classTime} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor da parcela" value={profile?.installmentValue} />
                <Field label="Dia de vencimento" value={profile?.paymentDueDay} />
                <Field label="Início do contrato" value={formatDate(profile?.contractStart)} />
                <Field label="Fim do contrato" value={formatDate(profile?.contractEnd)} />
              </div>

              <Field label="O que gosta de aprender / interesses" value={profile?.interests} />
              <Field label="Metas de estudo" value={profile?.learningGoals} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
