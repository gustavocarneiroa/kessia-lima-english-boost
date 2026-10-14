import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { LEVEL_TEST_FOR_STUDENTS, type LevelTestAttempt } from "@/lib/levelTest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EyeOff, Loader2, Send } from "lucide-react";
import LevelTestEditor from "./LevelTestEditor";
import LevelTestAttemptDialog from "./LevelTestAttemptDialog";

interface StudentRow {
  id: string;
  email: string;
  fullName: string | null;
  englishLevel: string | null;
  assignedAt: string | null;
  lastAttempt: LevelTestAttempt | null;
}

function StudentsTab() {
  const { t, locale } = usePortalPrefs();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);

  function reload() {
    return api
      .get<StudentRow[]>("/api/level-test/students")
      .then(setRows)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void reload();
  }, []);

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function send() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.post<{ sent: number }>("/api/level-test/send", { studentIds: [...selected] });
      setSelected(new Set());
      await reload();
      setMessage({
        ok: true,
        text: t(
          `Teste liberado para ${res.sent} aluno(s). Eles veem um aviso na tela inicial do portal.`,
          `Test released to ${res.sent} student(s). They see a notice on the portal home screen.`,
        ),
      });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : t("Não foi possível enviar.", "Couldn't send.") });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    await api.delete(`/api/level-test/assignments/${id}`).catch(() => {});
    await reload();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Alunos", "Students")}</CardTitle>
        <CardDescription>
          {t(
            "Marque os alunos e clique em \"Liberar teste\". Ao terminar, o nível vai sozinho pro perfil do aluno. Pra refazer, é só liberar de novo.",
            "Select students and click \"Release test\". When they finish, the level goes straight to their profile. To retake, just release it again.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={send} disabled={busy || selected.size === 0} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("Liberar teste", "Release test")}
            {selected.size > 0 && ` (${selected.size})`}
          </Button>
          {message && <p className={message.ok ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-destructive"}>{message.text}</p>}
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("Nenhum aluno ativo.", "No active students.")}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            <li className="flex items-center gap-3 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r) => r.id)) : new Set())}
                aria-label={t("Selecionar todos", "Select all")}
              />
              <span>{t("Selecionar todos", "Select all")}</span>
            </li>
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 text-sm">
                <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => toggle(r.id, !!v)} aria-label={r.fullName || r.email} />
                <Link to={`/portal/alunos/${r.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {r.fullName || r.email}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  {r.assignedAt && (
                    <>
                      <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                        {t("Liberado · aguardando", "Released · waiting")}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => cancel(r.id)}>
                        {t("Cancelar", "Cancel")}
                      </Button>
                    </>
                  )}
                  {r.lastAttempt ? (
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => setOpenAttempt(r.lastAttempt!.id)}>
                      <span className="font-bold">{r.lastAttempt.level}</span>
                      <span className="text-muted-foreground">
                        {new Date(r.lastAttempt.submittedAt).toLocaleDateString(locale, { dateStyle: "short" })}
                      </span>
                    </Button>
                  ) : (
                    !r.assignedAt && <span className="text-xs text-muted-foreground">{t("Ainda não fez", "Not taken yet")}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <LevelTestAttemptDialog attemptId={openAttempt} onClose={() => setOpenAttempt(null)} />
    </Card>
  );
}

export default function LevelTestTeacher() {
  const { t } = usePortalPrefs();

  // Fase de revisão: os alunos ainda não veem o teste — só o editor de perguntas.
  if (!LEVEL_TEST_FOR_STUDENTS) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Teste de nível", "Level test")}</h1>
          <p className="text-muted-foreground">
            {t("Revise as perguntas do teste (escala A1 a C2).", "Review the test questions (A1 to C2 scale).")}
          </p>
        </div>
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              {t(
                "Por enquanto só você vê esta página — os alunos ainda não têm acesso ao teste. Quando as perguntas estiverem do seu jeito, é só pedir pra abrir pros alunos.",
                "For now only you can see this page — students don't have access to the test yet. Once the questions look right, just ask to open it to students.",
              )}
            </p>
          </CardContent>
        </Card>
        <LevelTestEditor />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Teste de nível", "Level test")}</h1>
        <p className="text-muted-foreground">
          {t("Libere o teste pros alunos e veja o nível de cada um (A1 a C2).", "Release the test to students and see each one's level (A1 to C2).")}
        </p>
      </div>
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">{t("Alunos e resultados", "Students & results")}</TabsTrigger>
          <TabsTrigger value="questions">{t("Perguntas", "Questions")}</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4">
          <StudentsTab />
        </TabsContent>
        <TabsContent value="questions" className="mt-4 data-[state=inactive]:hidden" forceMount>
          <LevelTestEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
