import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível trocar a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1c1230] font-Montserrat">
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
              <h1 className="text-xl font-semibold text-white">Redefinir senha</h1>
              <p className="mt-1 text-sm text-white/60">Teacher Kessia Lima</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {!token ? (
              <p className="text-sm text-white/70">
                Esse link está incompleto. Peça um novo link de redefinição para a professora.
              </p>
            ) : done ? (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                Senha trocada com sucesso! Levando você para o login...
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm leading-relaxed text-white/70">Escolha sua nova senha de acesso.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-white/80">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-white/80">
                    Confirmar nova senha
                  </Label>
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#b196de]"
                  />
                </div>

                {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#b196de] to-[#6648bd] text-white hover:opacity-90"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Trocar senha"}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-white/30">
            <Link to="/login" className="hover:underline">
              Voltar para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
