import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TIPO_COMPRA_LABEL, type EstadoUF, type TipoCompra, type TipoPessoa } from "@/lib/compras";
import { ArrowLeft, User, Car, MapPin, ShoppingBag, Store, ChevronRight } from "lucide-react";

interface Cadastro {
  valor: string;
  label: string;
  uf?: string | null;
  tipo_campo?: string | null;
  obrigatorio?: boolean;
  ordem?: number;
  grupo?: string | null;
}

export const Route = createFileRoute("/_authenticated/_compras/compras/novo")({
  errorComponent: ModuleErrorBoundary,
  component: NovoChamado,
});

function NovoChamado() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [lojasAll, setLojasAll] = useState<Cadastro[]>([]);
  const [tiposCompra, setTiposCompra] = useState<Cadastro[]>([]);
  const [estados, setEstados] = useState<Cadastro[]>([]);
  const [camposExtrasCad, setCamposExtrasCad] = useState<Cadastro[]>([]);
  const [camposExtras, setCamposExtras] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("compras_cadastros")
        .select("categoria,valor,label,uf,tipo_campo,obrigatorio,ordem,grupo")
        .in("categoria", ["loja_estoque", "tipo_compra", "estado_uf", "campo_formulario"])
        .eq("ativo", true)
        .order("ordem");
      const all = (data as any[]) ?? [];
      setLojasAll(all.filter((x) => x.categoria === "loja_estoque"));
      setTiposCompra(all.filter((x) => x.categoria === "tipo_compra"));
      setEstados(all.filter((x) => x.categoria === "estado_uf"));
      setCamposExtrasCad(all.filter((x) => x.categoria === "campo_formulario"));
    })();
  }, []);

  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("PF");
  const [estadoUf, setEstadoUf] = useState<string>("GO");
  const [tipoCompra, setTipoCompra] = useState<TipoCompra>("somente_compra");
  const [temInscricaoEstadual, setTemInscricaoEstadual] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    nome: "",
    cpf_cnpj: "",
    placa: "",
    chassi: "",
    renavam: "",
    cor_externa: "",
    modelo: "",
    ano_modelo: "",
    loja_estoque: "",
    codigo_avaliacao_nbs: "",
    valor_avaliado: "",
    observacao: "",
  });

  // Reset loja quando muda o estado (loja é vinculada ao estado)
  useEffect(() => {
    setForm((s) => ({ ...s, loja_estoque: "" }));
  }, [estadoUf]);

  const lojas = lojasAll.filter((l) => !l.uf || l.uf.toUpperCase() === estadoUf.toUpperCase());
  const camposDoEstado = camposExtrasCad.filter(
    (c) => !c.uf || c.uf.toUpperCase() === estadoUf.toUpperCase(),
  );

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const salvar = async () => {
    if (!user) return;
    const obrig: [string, string][] = [
      ["nome", form.nome],
      ["cpf_cnpj", form.cpf_cnpj],
      ["placa", form.placa],
      ["chassi", form.chassi],
      ["renavam", form.renavam],
      ["cor_externa", form.cor_externa],
      ["modelo", form.modelo],
      ["ano_modelo", form.ano_modelo],
      ["loja_estoque", form.loja_estoque],
      ["codigo_avaliacao_nbs", form.codigo_avaliacao_nbs],
      ["valor_avaliado", form.valor_avaliado],
    ];
    const faltando = obrig.filter(([, v]) => !v.trim()).map(([k]) => k);
    if (faltando.length) {
      toast.error(
        `Preencha todos os campos obrigatórios (${faltando.length} pendente(s)). Apenas observações é opcional.`,
      );
      return;
    }
    const camposObrigFalt = camposDoEstado
      .filter((c) => c.obrigatorio && !(camposExtras[c.valor] ?? "").trim())
      .map((c) => c.label);
    if (camposObrigFalt.length) {
      toast.error(`Preencha os campos obrigatórios do estado: ${camposObrigFalt.join(", ")}`);
      return;
    }
    if (tipoPessoa === "PJ" && temInscricaoEstadual === null) {
      toast.error("Selecione se a pessoa jurídica possui inscrição estadual.");
      return;
    }
    setSaving(true);
    try {
      // Bloqueio: já existe chamado ativo para essa placa?
      const placa = form.placa.trim().toUpperCase();

      const { data: existente } = await supabase
        .from("compras_chamados")
        .select("id, status")
        .ilike("placa", placa)
        .not("status", "in", "(comprado,cancelado)")
        .maybeSingle();
      if (existente) {
        toast.error("Já existe um chamado em andamento para essa placa.");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from("compras_chamados")
        .insert({
          criado_por: user.id,
          tipo_pessoa: tipoPessoa,
          estado_uf: estadoUf as EstadoUF,
          tipo_compra: tipoCompra,
          nome: form.nome.trim(),
          cpf_cnpj: form.cpf_cnpj.trim(),
          placa,
          chassi: form.chassi.trim() || null,
          renavam: form.renavam.trim() || null,
          cor_externa: form.cor_externa.trim() || null,
          modelo: form.modelo.trim() || null,
          ano_modelo: form.ano_modelo.trim() || null,
          loja_estoque: form.loja_estoque.trim() || null,
          codigo_avaliacao_nbs: form.codigo_avaliacao_nbs.trim() || null,
          valor_avaliado: form.valor_avaliado
            ? Number(form.valor_avaliado.replace(/[R$\s.]/g, "").replace(",", "."))
            : null,
          observacao_compra: form.observacao.trim() || null,
          nf_status: tipoPessoa === "PJ" ? "aguardando_analise" : "nao_aplicavel",
          tem_inscricao_estadual: tipoPessoa === "PJ" ? temInscricaoEstadual : null,
          campos_extras: camposExtras,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("compras_historico").insert({
        chamado_id: data.id,
        acao: "criado",
        autor_id: user.id,
      });

      toast.success("Chamado criado. Anexe a documentação e envie para análise.");
      navigate({ to: "/compras/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao criar chamado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-6xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/compras" })}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <header className="mb-8 flex items-end justify-between border-b border-border pb-6">
          <div>
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
              <span>Chamados</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-medium text-foreground">Novo chamado</span>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" /> Novo chamado de compra
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha os dados iniciais. Após salvar, você poderá anexar documentos e enviar para
              análise.
            </p>
          </div>
          <div className="hidden md:block">
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full border border-primary/20">
              Compras Seminovos
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna esquerda: Cliente e Localização */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" /> Localização e Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pessoa</Label>
                    <Select
                      value={tipoPessoa}
                      onValueChange={(v) => setTipoPessoa(v as TipoPessoa)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PF">Pessoa Física</SelectItem>
                        <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estado (UF) *</Label>
                    <Select value={estadoUf} onValueChange={(v) => setEstadoUf(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.length > 0 ? (
                          estados.map((e) => (
                            <SelectItem key={e.valor} value={e.valor.toUpperCase()}>
                              {e.label}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="GO">Goiás</SelectItem>
                            <SelectItem value="ES">Espírito Santo</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" /> Loja / Filial *{" "}
                    <span className="text-xs text-muted-foreground">({estadoUf})</span>
                  </Label>
                  {lojas.length === 0 ? (
                    <div className="text-xs text-amber-600 border border-amber-500/40 rounded-md p-2">
                      Nenhuma loja cadastrada para {estadoUf}.{" "}
                      {isAdmin && (
                        <Link to="/compras/configuracoes" className="underline">
                          Cadastrar agora
                        </Link>
                      )}
                    </div>
                  ) : (
                    <Select value={form.loja_estoque} onValueChange={(v) => set("loja_estoque", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a filial…" />
                      </SelectTrigger>
                      <SelectContent>
                        {lojas.map((l) => (
                          <SelectItem key={l.valor} value={l.valor}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Nome / Razão social *
                  </Label>
                  <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> {tipoPessoa === "PF" ? "CPF *" : "CNPJ *"}
                  </Label>
                  <Input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} />
                </div>

                {tipoPessoa === "PJ" && (
                  <div>
                    <Label>Tem inscrição estadual? *</Label>
                    <div className="flex gap-4 mt-1.5">
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="tem_ie"
                          checked={temInscricaoEstadual === true}
                          onChange={() => setTemInscricaoEstadual(true)}
                          className="text-primary focus:ring-0"
                        />
                        Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="tem_ie"
                          checked={temInscricaoEstadual === false}
                          onChange={() => setTemInscricaoEstadual(false)}
                          className="text-primary focus:ring-0"
                        />
                        Não
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Se "Não", o documento NF (emissor de nota) não será obrigatório.
                    </p>
                  </div>
                )}

                {camposDoEstado
                  .filter((c) => (c.grupo ?? "cliente") === "cliente")
                  .map((c) => (
                    <div key={c.valor}>
                      <Label>
                        {c.label}
                        {c.obrigatorio ? " *" : ""}
                      </Label>
                      <CampoExtraInput
                        tipo={c.tipo_campo}
                        value={camposExtras[c.valor] ?? ""}
                        onChange={(v) => setCamposExtras((s) => ({ ...s, [c.valor]: v }))}
                      />
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita: Veículo + Tipo de compra */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Car className="w-4 h-4 text-muted-foreground" /> Informações do Veículo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <Label>Placa *</Label>
                    <Input
                      value={form.placa}
                      onChange={(e) => set("placa", e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Chassi *</Label>
                    <Input
                      value={form.chassi}
                      onChange={(e) => set("chassi", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Renavam *</Label>
                    <Input value={form.renavam} onChange={(e) => set("renavam", e.target.value)} />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Modelo *</Label>
                    <Input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Ano/Modelo *</Label>
                    <Input
                      value={form.ano_modelo}
                      onChange={(e) => set("ano_modelo", e.target.value)}
                      placeholder="2024/2025"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Cor externa *</Label>
                    <Select value={form.cor_externa} onValueChange={(v) => set("cor_externa", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {CORES_EXTERNAS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Código avaliação NBS *</Label>
                    <Input
                      value={form.codigo_avaliacao_nbs}
                      onChange={(e) => set("codigo_avaliacao_nbs", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Valor avaliado (R$) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                        R$
                      </span>
                      <Input
                        value={form.valor_avaliado}
                        onChange={(e) => set("valor_avaliado", e.target.value)}
                        placeholder="0,00"
                        className="pl-10 bg-muted/40 font-semibold"
                      />
                    </div>
                  </div>

                  {camposDoEstado
                    .filter((c) => c.grupo === "veiculo")
                    .map((c) => (
                      <div key={c.valor} className="md:col-span-2">
                        <Label>
                          {c.label}
                          {c.obrigatorio ? " *" : ""}
                        </Label>
                        <CampoExtraInput
                          tipo={c.tipo_campo}
                          value={camposExtras[c.valor] ?? ""}
                          onChange={(v) => setCamposExtras((s) => ({ ...s, [c.valor]: v }))}
                        />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" /> Tipo de Compra e
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Modalidade de compra</Label>
                  <Select value={tipoCompra} onValueChange={(v) => setTipoCompra(v as TipoCompra)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(tiposCompra.length > 0
                        ? tiposCompra.map((t) => ({ valor: t.valor, label: t.label }))
                        : (Object.keys(TIPO_COMPRA_LABEL) as TipoCompra[]).map((k) => ({
                            valor: k,
                            label: TIPO_COMPRA_LABEL[k],
                          }))
                      ).map((t) => (
                        <SelectItem key={t.valor} value={t.valor}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações adicionais</Label>
                  <Textarea
                    rows={3}
                    value={form.observacao}
                    onChange={(e) => set("observacao", e.target.value)}
                    placeholder="Detalhes sobre o estado do veículo ou condições da negociação…"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate({ to: "/compras" })}>
                Cancelar
              </Button>
              <Button onClick={salvar} disabled={saving} className="px-8">
                {saving ? "Salvando..." : "Criar chamado"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CORES_EXTERNAS = [
  "Amarelo",
  "Azul",
  "Bege",
  "Branca",
  "Cinza",
  "Dourada",
  "Grená",
  "Laranja",
  "Marrom",
  "Prata",
  "Preta",
  "Rosa",
  "Roxa",
  "Verde",
  "Vermelha",
  "Fantasia",
];

function formatMoeda(v: string) {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  const inteiro = Math.floor(n / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cent = (n % 100).toString().padStart(2, "0");
  return `R$ ${inteiro},${cent}`;
}

function formatPlaca(v: string) {
  const raw = v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function isPlacaValida(v: string) {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Antiga: AAA9999 | Mercosul: AAA9A99
  return /^[A-Z]{3}[0-9]{4}$/.test(raw) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(raw);
}

function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatCNPJ(v: string) {
  // CNPJ alfanumérico: 12 primeiros alfanuméricos + 2 dígitos verificadores
  const raw = v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 14);
  const p1 = raw.slice(0, 2);
  const p2 = raw.slice(2, 5);
  const p3 = raw.slice(5, 8);
  const p4 = raw.slice(8, 12);
  const p5 = raw.slice(12, 14).replace(/[^0-9]/g, "");
  let out = p1;
  if (raw.length > 2) out += "." + p2;
  if (raw.length > 5) out += "." + p3;
  if (raw.length > 8) out += "/" + p4;
  if (raw.length > 12) out += "-" + p5;
  return out;
}

function CampoExtraInput({
  tipo,
  value,
  onChange,
}: {
  tipo?: string | null;
  value: string;
  onChange: (v: string) => void;
}) {
  if (tipo === "ano") {
    return (
      <Input
        inputMode="numeric"
        maxLength={4}
        placeholder="2026"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
    );
  }
  if (tipo === "ano_mod") {
    return (
      <Input
        inputMode="numeric"
        maxLength={9}
        placeholder="2026/2027"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          const out = digits.length > 4 ? `${digits.slice(0, 4)}/${digits.slice(4)}` : digits;
          onChange(out);
        }}
      />
    );
  }
  if (tipo === "moeda") {
    return (
      <Input
        inputMode="numeric"
        placeholder="R$ 0,00"
        value={value}
        onChange={(e) => onChange(formatMoeda(e.target.value))}
      />
    );
  }
  if (tipo === "placa") {
    const invalida = value.length > 0 && !isPlacaValida(value);
    return (
      <Input
        placeholder="ABC-1D23"
        maxLength={8}
        value={value}
        onChange={(e) => onChange(formatPlaca(e.target.value))}
        aria-invalid={invalida}
        className={invalida ? "border-destructive" : undefined}
      />
    );
  }
  if (tipo === "cpf") {
    return (
      <Input
        inputMode="numeric"
        placeholder="000.000.000-00"
        maxLength={14}
        value={value}
        onChange={(e) => onChange(formatCPF(e.target.value))}
      />
    );
  }
  if (tipo === "cnpj") {
    return (
      <Input
        placeholder="00.000.000/0000-00"
        maxLength={18}
        value={value}
        onChange={(e) => onChange(formatCNPJ(e.target.value))}
      />
    );
  }
  if (tipo === "renavam") {
    return (
      <Input
        inputMode="numeric"
        placeholder="00000000000"
        maxLength={11}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
      />
    );
  }
  if (tipo === "cor") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a cor" />
        </SelectTrigger>
        <SelectContent>
          {CORES_EXTERNAS.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={
        tipo === "numero"
          ? "number"
          : tipo === "data"
            ? "date"
            : tipo === "email"
              ? "email"
              : "text"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
