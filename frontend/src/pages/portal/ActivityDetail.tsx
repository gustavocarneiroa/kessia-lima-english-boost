import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Maximize2, Minimize2, Trash2 } from "lucide-react";

interface ActivityDetail {
  id: string;
  title: string;
  kind: "embed";
  embedSrc: string;
  embedHeight: number;
  studentIds?: string[];
}

interface Student {
  id: string;
  email: string;
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === "teacher";
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<ActivityDetail>(`/api/activities/${id}`);
      setActivity(data);
      setSelected(new Set(data.studentIds ?? []));
      if (isTeacher) setStudents(await api.get<Student[]>("/api/students"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir a atividade.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function removeActivity() {
    if (!id) return;
    await api.delete(`/api/activities/${id}`);
    navigate("/portal/atividades");
  }

  async function saveStudents() {
    if (!id) return;
    await api.put(`/api/activities/${id}/students`, { studentIds: [...selected] });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return <p className="text-sm text-destructive">{error ?? "Atividade não encontrada."}</p>;
  }

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
          <p className="truncate font-medium">{activity.title}</p>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setExpanded(false)}>
            <Minimize2 className="h-4 w-4" />
            Sair da tela cheia
          </Button>
        </div>
        <iframe
          src={activity.embedSrc}
          className="flex-1"
          style={{ border: 0, width: "100%" }}
          title={activity.title}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/portal/atividades" className="text-sm text-muted-foreground hover:underline">
            ← Todas as atividades
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{activity.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setExpanded(true)}>
            <Maximize2 className="h-4 w-4" />
            Tela cheia
          </Button>
          {isTeacher && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => void removeActivity()}>
              <Trash2 className="h-4 w-4" />
              Apagar atividade
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <iframe
            src={activity.embedSrc}
            height={activity.embedHeight}
            width="100%"
            style={{ border: 0, display: "block" }}
            title={activity.title}
          />
        </CardContent>
      </Card>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviar para alunos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cadastre alunos em Alunos primeiro.</p>
            ) : (
              <ul className="space-y-2">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v === true) next.add(s.id);
                        else next.delete(s.id);
                        setSelected(next);
                      }}
                    />
                    <span className="text-sm">{s.email}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" onClick={() => void saveStudents()}>
              Salvar quem pode fazer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
