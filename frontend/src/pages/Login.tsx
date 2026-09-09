import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export default function Login() {
  const { login, loginWithDevice } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { firstLogin } = await login(email, password);
      if (firstLogin) setInfo("Senha cadastrada com sucesso!");
      navigate("/portal");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeviceLogin() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Digite seu e-mail para entrar com este dispositivo.");
      return;
    }
    setDeviceLoading(true);
    try {
      await loginWithDevice(email);
      navigate("/portal");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar com este dispositivo.");
    } finally {
      setDeviceLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1c1230] font-Montserrat">
      {/* fundo com gradiente + brilhos, consistente com a identidade roxa do site */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,#6648bd_0%,transparent_45%),radial-gradient(circle_at_85%_80%,#b196de_0%,transparent_40%),linear-gradient(135deg,#1c1230_0%,#2b1c47_60%,#33234A_100%)]" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#b196de]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#6648bd]/30 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="rounded-2xl bg-white p-2.5 shadow-lg">
              <img src={logo} alt="Teacher Kessia Lima" className="h-10 w-auto" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Portal do Aluno</h1>
              <p className="mt-1 text-sm text-white/60">Teacher Kessia Lima</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <p className="mb-6 text-sm leading-relaxed text-white/70">
              Entre com seu e-mail e senha. Se for a primeira vez, a senha que você digitar agora
              vira a sua senha de acesso.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/80">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#b196de]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/80">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/15 bg-white/5 pr-10 text-white placeholder:text-white/30 focus-visible:ring-[#b196de]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-white/40 hover:text-white/70"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
              )}
              {info && (
                <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{info}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#b196de] to-[#6648bd] text-white hover:opacity-90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#241638] px-3 text-white/40">ou</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleDeviceLogin}
              disabled={deviceLoading}
              className={cn(
                "w-full gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white",
              )}
            >
              {deviceLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Fingerprint className="h-4 w-4" />
              )}
              Entrar com este dispositivo
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-white/30">
            Acesso restrito à professora e alunos cadastrados.
          </p>
        </div>
      </div>
    </div>
  );
}
