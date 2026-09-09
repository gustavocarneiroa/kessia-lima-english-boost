import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Student {
  id: string;
  email: string;
  createdAt: string;
  hasLoggedIn: boolean;
}

interface Device {
  id: string;
  deviceName: string | null;
  createdAt: string;
}

export default function Portal() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Portal</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" onClick={() => logout().then(() => navigate("/login"))}>
            Sair
          </Button>
        </div>

        <DeviceCard />

        {user.role === "teacher" ? <TeacherStudents /> : <StudentPlaceholder />}
      </div>
    </div>
  );
}

function StudentPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bem-vindo(a)!</CardTitle>
        <CardDescription>Em breve novas funcionalidades por aqui.</CardDescription>
      </CardHeader>
    </Card>
  );
}

function DeviceCard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function loadDevices() {
    try {
      const list = await api.get<Device[]>("/api/webauthn/devices");
      setDevices(list);
    } catch {
      // silencioso: card de dispositivos é secundário
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  async function addDevice() {
    setError(null);
    setAdding(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const options = await api.get<Parameters<typeof startRegistration>[0]["optionsJSON"]>(
        "/api/webauthn/register-options",
      );
      const response = await startRegistration({ optionsJSON: options });
      const deviceName =
        typeof window !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Celular" : "Computador";
      await api.post("/api/webauthn/register-verify", { response, deviceName });
      await loadDevices();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível adicionar este dispositivo.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispositivos</CardTitle>
        <CardDescription>
          Adicione este dispositivo para entrar depois só com biometria/PIN, sem digitar senha.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {devices.length > 0 && (
          <ul className="text-sm space-y-1">
            {devices.map((d) => (
              <li key={d.id} className="text-muted-foreground">
                {d.deviceName ?? "Dispositivo"} — adicionado em {new Date(d.createdAt).toLocaleDateString("pt-BR")}
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button variant="outline" onClick={addDevice} disabled={adding}>
          {adding ? "Adicionando..." : "Adicionar este dispositivo"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TeacherStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function loadStudents() {
    const list = await api.get<Student[]>("/api/students");
    setStudents(list);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await api.post("/api/students", { email });
      setEmail("");
      await loadStudents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível adicionar o aluno.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    await api.delete(`/api/students/${id}`);
    await loadStudents();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alunos</CardTitle>
        <CardDescription>
          Adicione o e-mail do aluno. No primeiro login dele, a senha que ele digitar vira a senha
          da conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            type="email"
            placeholder="email@aluno.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={adding}>
            {adding ? "Adicionando..." : "Adicionar"}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <ul className="divide-y">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p>{s.email}</p>
                <p className="text-xs text-muted-foreground">
                  {s.hasLoggedIn ? "Já fez login" : "Ainda não fez login"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(s.id)}>
                Remover
              </Button>
            </li>
          ))}
          {students.length === 0 && <li className="py-2 text-sm text-muted-foreground">Nenhum aluno ainda.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
