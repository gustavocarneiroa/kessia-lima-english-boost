import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/api/auth/forgot-password", { email });
      setSent(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar agora. Tente novamente.");
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
              <h1 className="text-xl font-semibold text-white">Esqueci minha senha</h1>
              <p className="mt-1 text-sm text-white/60">Teacher Kessia Lima</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {sent ? (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{sent}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm leading-relaxed text-white/70">
                  Digite o e-mail que você usa no portal. Vamos te mandar um link para escolher uma nova senha.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/80">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#b196de]"
                  />
                </div>

                {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#b196de] to-[#6648bd] text-white hover:opacity-90"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
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
