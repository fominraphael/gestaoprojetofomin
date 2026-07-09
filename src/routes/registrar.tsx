import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { obterTiposUsuarioConfig, type TipoUsuarioConfig } from "@/lib/usuarios";
import { Eye, EyeOff, UserPlus, Layers, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/registrar")({
  component: RegistrarPage,
});

function RegistrarPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailRecuperacao, setEmailRecuperacao] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [tipos, setTipos] = useState<TipoUsuarioConfig[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("Lojista");
  const [campos, setCampos] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      try {
        const all = await obterTiposUsuarioConfig();
        // Filtra estritamente: sem administradores e sem tipos inativos.
        const filtrados = all.filter(
          (t) => t.role !== "admin" && t.ativo !== false && t.nome !== "Administrador",
        );
        setTipos(filtrados);
        if (filtrados.length > 0 && !filtrados.some((t) => t.nome === tipoSelecionado)) {
          setTipoSelecionado(filtrados[0].nome);
        }
      } catch {
        setTipos([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tipoAtual = tipos.find((t) => t.nome === tipoSelecionado);

  const handleTipoChange = (nome: string) => {
    setTipoSelecionado(nome);
    setCampos({});
  };

  const handleCampoChange = (nome: string, valor: any) => {
    setCampos((prev) => ({ ...prev, [nome]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 4) {
      setError("A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    const emailRec = emailRecuperacao.trim();
    if (!emailRec || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRec)) {
      setError("Informe um e-mail de recuperação válido.");
      return;
    }

    // Validação de campos dinâmicos obrigatórios
    if (tipoAtual) {
      for (const f of tipoAtual.campos_schema) {
        if (f.obrigatorio) {
          const v = campos[f.nome];
          if (v === undefined || v === null || v === "") {
            setError(`O campo "${f.label}" é obrigatório.`);
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      await register(username, password, {
        tipo_usuario: tipoSelecionado,
        campos_customizados: campos,
        cnpj: campos.cnpj ? String(campos.cnpj).trim() : null,
        email_recuperacao: emailRec,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg mb-4">
            <Layers className="w-8 h-8 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Solicitar Acesso</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sua conta será revisada pelo administrador
          </p>
        </div>

        <div className="bg-accent backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Solicitação enviada!</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Sua solicitação foi recebida. Aguarde a aprovação do administrador para acessar o sistema.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 py-2.5 px-6 rounded-lg bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800 text-foreground font-semibold transition-all"
              >
                Voltar ao Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reg-username" className="block text-sm font-medium text-foreground mb-1.5">
                  Nome de usuário
                </label>
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Escolha um nome de usuário"
                  required
                  autoComplete="username"
                  className="w-full px-4 py-2.5 rounded-lg bg-card border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-foreground mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-11 rounded-lg bg-card border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-foreground mb-1.5">
                  Confirmar senha
                </label>
                <input
                  id="reg-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-lg bg-card border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
                />
              </div>

              {tipos.length > 0 && (
                <div>
                  <label htmlFor="reg-tipo" className="block text-sm font-medium text-foreground mb-1.5">
                    Tipo de Usuário
                  </label>
                  <select
                    id="reg-tipo"
                    value={tipoSelecionado}
                    onChange={(e) => handleTipoChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-card border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
                  >
                    {tipos.map((t) => (
                      <option key={t.id} value={t.nome}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campos dinâmicos do tipo selecionado */}
              {tipoAtual?.campos_schema.map((field) => (
                <div key={field.nome}>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {field.label} {field.obrigatorio && <span className="text-red-400">*</span>}
                  </label>
                  {field.tipo === "boolean" ? (
                    <select
                      value={campos[field.nome] ? "true" : "false"}
                      onChange={(e) => handleCampoChange(field.nome, e.target.value === "true")}
                      className="w-full px-4 py-2.5 rounded-lg bg-card border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
                    >
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                    </select>
                  ) : (
                    <input
                      type={field.tipo === "number" ? "number" : "text"}
                      required={field.obrigatorio}
                      value={campos[field.nome] ?? ""}
                      onChange={(e) =>
                        handleCampoChange(
                          field.nome,
                          field.tipo === "number" ? Number(e.target.value) : e.target.value,
                        )
                      }
                      placeholder={`Preencha o campo ${field.label}`}
                      className="w-full px-4 py-2.5 rounded-lg bg-card border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-all"
                    />
                  )}
                </div>
              ))}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                id="btn-registrar"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {loading ? "Enviando..." : "Solicitar Acesso"}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-muted-foreground text-sm">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-foreground hover:text-foreground font-medium transition-colors">
                  Fazer login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
