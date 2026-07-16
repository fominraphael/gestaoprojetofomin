import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  requestPasswordReset,
  verifyResetCode,
  resetPasswordWithCode,
} from "@/lib/password-reset.functions";
import { KeyRound, Mail, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha" }] }),
  component: RecuperarSenhaPage,
});

type Step = "username" | "code" | "newPassword" | "done";

function RecuperarSenhaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doRequest = useServerFn(requestPasswordReset);
  const doVerify = useServerFn(verifyResetCode);
  const doReset = useServerFn(resetPasswordWithCode);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await doRequest({ data: { username } });
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar código.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await doVerify({ data: { username, code } });
      setStep("newPassword");
    } catch (err: any) {
      setError(err.message || "Código inválido.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await doReset({ data: { username, code, newPassword } });
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg mb-4">
            <KeyRound className="w-8 h-8 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Recuperar senha</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === "username" && "Informe seu usuário para receber o código"}
            {step === "code" && "Digite o código enviado para seu e-mail"}
            {step === "newPassword" && "Defina sua nova senha"}
            {step === "done" && "Senha redefinida com sucesso!"}
          </p>
        </div>

        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {(["username", "code", "newPassword"] as Step[]).map((s, i) => {
              const active = s === step;
              const done =
                (["username", "code", "newPassword"] as Step[]).indexOf(step) > i ||
                step === "done";
              return (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full ${
                    done ? "bg-primary" : active ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              );
            })}
          </div>

          {step === "username" && (
            <form onSubmit={handleRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Usuário</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu nome de usuário"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50"
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md disabled:opacity-60"
              >
                <Mail className="w-4 h-4" />
                {loading ? "Enviando..." : "Enviar código"}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Se o usuário existir e tiver e-mail de recuperação cadastrado, enviaremos um código
                de 6 dígitos.
              </p>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Código de verificação
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground text-center text-2xl tracking-[0.5em] font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50"
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md disabled:opacity-60"
              >
                {loading ? "Verificando..." : "Verificar código"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("username");
                  setCode("");
                  setError("");
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                ← Reenviar para outro usuário
              </button>
            </form>
          )}

          {step === "newPassword" && (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Confirme a nova senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50"
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-5 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-foreground">
                Sua senha foi redefinida com sucesso. Você já pode entrar com a nova senha.
              </p>
              <button
                onClick={() => navigate({ to: "/login" })}
                className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
              >
                Ir para o login
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
