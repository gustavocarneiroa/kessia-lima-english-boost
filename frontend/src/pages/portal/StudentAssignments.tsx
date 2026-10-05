import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Página do aluno (visão da professora): o que foi enviado pra ele — atividades,
// listas de vocabulário — e as cobranças dele. Só leitura; editar continua nas
// abas próprias de cada coisa.

const PREVIEW_SIZE = 100;

interface Activity {
  id: string;
  title: string;
  kind: "embed" | "listening" | "quiz";
  studentAnswer: { score: number; total: number; submittedAt: string } | null;
}

interface VocabList {
  id: string;
  title: string;
  description: string | null;
}

type PaymentStatus = "paid" | "pending" | "overdue";

interface Payment {
  id: string;
  description: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  status: PaymentStatus;
}

interface PaymentsResponse {
  items: Payment[];
  total: number;
  summary: { paidCents: number; pendingCents: number; overdueCents: number };
}

function formatMoney(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100);
}

// "YYYY-MM-DD" (ou ISO completo) → data curta no idioma escolhido
function formatDate(key: string, locale: string) {
  const [y, m, d] = key.slice(0, 10).split("-");
  if (!y || !m || !d) return key;
  return locale === "en-US" ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

function Loading() {
  return (
    <div className="flex justify-center py-6 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function ShowingNote({ shown, total }: { shown: number; total: number }) {
  const { t } = usePortalPrefs();
  if (total <= shown) return null;
  return (
    <p className="pt-3 text-xs text-muted-foreground">
      {t(`Mostrando ${shown} de ${total}.`, `Showing ${shown} of ${total}.`)}
    </p>
  );
}

export default function StudentAssignments({ studentId }: { studentId: string }) {
  const { t, locale } = usePortalPrefs();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const [lists, setLists] = useState<VocabList[]>([]);
  const [listsTotal, setListsTotal] = useState(0);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [vocabLoading, setVocabLoading] = useState(true);

  const [payments, setPayments] = useState<PaymentsResponse | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    const q = `studentId=${encodeURIComponent(studentId)}&pageSize=${PREVIEW_SIZE}`;

    setActivitiesLoading(true);
    api
      .get<{ items: Activity[]; total: number }>(`/api/activities?${q}`)
      .then((res) => {
        setActivities(res.items);
        setActivitiesTotal(res.total);
      })
      .finally(() => setActivitiesLoading(false));

    setVocabLoading(true);
    Promise.all([
      api.get<{ items: VocabList[]; total: number }>(`/api/vocab/lists?${q}`),
      api.get<unknown[]>(`/api/flashcards?studentId=${encodeURIComponent(studentId)}`),
    ])
      .then(([res, flashcards]) => {
        setLists(res.items);
        setListsTotal(res.total);
        setFlashcardCount(flashcards.length);
      })
      .finally(() => setVocabLoading(false));

    setPaymentsLoading(true);
    api
      .get<PaymentsResponse>(`/api/payments?${q}`)
      .then(setPayments)
      .finally(() => setPaymentsLoading(false));
  }, [studentId]);

  function activityStatus(a: Activity) {
    // atividade de site externo (embed): o portal não sabe se o aluno fez
    if (a.kind === "embed") return <Badge variant="outline">{t("Site externo", "External site")}</Badge>;
    if (!a.studentAnswer) return <Badge variant="secondary">{t("Ainda não fez", "Not done yet")}</Badge>;
    const when = formatDate(a.studentAnswer.submittedAt, locale);
    // quiz pode ter perguntas escritas que a professora corrige à mão — a nota automática
    // não conta essas, então só mostra a nota no listening
    return (
      <Badge>
        {a.kind === "listening"
          ? t(
              `Feita em ${when} · ${a.studentAnswer.score}/${a.studentAnswer.total} acertos`,
              `Done on ${when} · ${a.studentAnswer.score}/${a.studentAnswer.total} correct`,
            )
          : t(`Feita em ${when}`, `Done on ${when}`)}
      </Badge>
    );
  }

  function paymentStatus(status: PaymentStatus) {
    if (status === "paid")
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t("Paga", "Paid")}</Badge>;
    if (status === "overdue") return <Badge variant="destructive">{t("Atrasada", "Overdue")}</Badge>;
    return <Badge variant="secondary">{t("Pendente", "Pending")}</Badge>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Atividades enviadas", "Assigned activities")}</CardTitle>
          <CardDescription>
            {activitiesTotal} {t("atividade(s)", "activity(ies)")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <Loading />
          ) : activities.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {t("Nenhuma atividade enviada para este aluno ainda.", "No activities sent to this student yet.")}
            </p>
          ) : (
            <ul className="divide-y">
              {activities.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <Link to={`/portal/atividades/${a.id}`} className="text-sm font-medium hover:underline">
                    {a.title}
                  </Link>
                  {activityStatus(a)}
                </li>
              ))}
            </ul>
          )}
          <ShowingNote shown={activities.length} total={activitiesTotal} />
          <p className="pt-2 text-xs text-muted-foreground">
            {t(
              'Para enviar atividades ou corrigir respostas, abra a atividade ou use a aba "Atividades".',
              'To send activities or grade answers, open the activity or use the "Activities" tab.',
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Vocabulário", "Vocabulary")}</CardTitle>
          <CardDescription>
            {listsTotal} {t("lista(s) enviada(s)", "list(s) sent")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vocabLoading ? (
            <Loading />
          ) : (
            <>
              {lists.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  {t("Nenhuma lista enviada para este aluno ainda.", "No lists sent to this student yet.")}
                </p>
              ) : (
                <ul className="divide-y">
                  {lists.map((l) => (
                    <li key={l.id} className="py-3">
                      <Link to={`/portal/vocabulario/${l.id}`} className="text-sm font-medium hover:underline">
                        {l.title}
                      </Link>
                      {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <ShowingNote shown={lists.length} total={listsTotal} />
              <p className="pt-3 text-sm">
                {flashcardCount === 0
                  ? t("O aluno ainda não criou flashcards próprios.", "The student hasn't created their own flashcards yet.")
                  : t(
                      `O aluno criou ${flashcardCount} flashcard(s) próprio(s) — veja na aba "Vocabulário", em "Flashcards dos alunos".`,
                      `The student created ${flashcardCount} flashcard(s) — see them in the "Vocabulary" tab, under "Students' flashcards".`,
                    )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Financeiro", "Payments")}</CardTitle>
          <CardDescription>
            {payments?.total ?? 0} {t("cobrança(s)", "charge(s)")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading || !payments ? (
            <Loading />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 pb-3 text-center">
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">{t("Recebido", "Received")}</p>
                  <p className="text-sm font-semibold">{formatMoney(payments.summary.paidCents, locale)}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">{t("A receber", "Upcoming")}</p>
                  <p className="text-sm font-semibold">{formatMoney(payments.summary.pendingCents, locale)}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">{t("Atrasado", "Overdue")}</p>
                  <p className="text-sm font-semibold text-destructive">
                    {formatMoney(payments.summary.overdueCents, locale)}
                  </p>
                </div>
              </div>
              {payments.items.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  {t("Nenhuma cobrança para este aluno ainda.", "No charges for this student yet.")}
                </p>
              ) : (
                <ul className="divide-y">
                  {payments.items.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-medium">{p.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(p.amountCents, locale)} · {t("vence", "due")} {formatDate(p.dueDate, locale)}
                          {p.paidAt && ` · ${t("paga em", "paid on")} ${formatDate(p.paidAt, locale)}`}
                        </p>
                      </div>
                      {paymentStatus(p.status)}
                    </li>
                  ))}
                </ul>
              )}
              <ShowingNote shown={payments.items.length} total={payments.total} />
              <p className="pt-2 text-xs text-muted-foreground">
                {t(
                  'Para lançar cobranças, anexar boleto ou marcar como paga, use a aba "Financeiro".',
                  'To add charges, attach a boleto or mark as paid, use the "Payments" tab.',
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
