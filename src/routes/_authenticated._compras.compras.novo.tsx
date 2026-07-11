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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TIPO_COMPRA_LABEL, type EstadoUF, type TipoCompra, type TipoPessoa } from "@/lib/compras";
import { ArrowLeft } from "lucide-react";

interface Cadastro { valor: string; label: string; uf?: string | null; tipo_campo?: string | null; obrigatorio?: boolean; ordem?: number }

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
        .select("categoria,valor,label,uf,tipo_campo,obrigatorio,ordem")
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
  useEffect(() => { setForm((s) => ({ ...s, loja_estoque: "" })); }, [estadoUf]);

  const lojas = lojasAll.filter((l) => !l.uf || l.uf.toUpperCase() === estadoUf.toUpperCase());
  const camposDoEstado = camposExtrasCad.filter((c) => !c.uf || c.uf.toUpperCase() === estadoUf.toUpperCase());


  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const salvar = async () => {
    if (!user) return;
    const obrig: [string, string][] = [
      ["nome", form.nome], ["cpf_cnpj", form.cpf_cnpj], ["placa", form.placa],
      ["chassi", form.chassi], ["renavam", form.renavam], ["cor_externa", form.cor_externa],
      ["modelo", form.modelo], ["ano_modelo", form.ano_modelo], ["loja_estoque", form.loja_estoque],
      ["codigo_avaliacao_nbs", form.codigo_avaliacao_nbs], ["valor_avaliado", form.valor_avaliado],
    ];
    const faltando = obrig.filter(([, v]) => !v.trim()).map(([k]) => k);
    if (faltando.length) {
      toast.error(`Preencha todos os campos obrigatórios (${faltando.length} pendente(s)). Apenas observações é opcional.`);
      return;
    }
    const camposObrigFalt = camposDoEstado
      .filter((c) => c.obrigatorio && !(camposExtras[c.valor] ?? "").trim())
      .map((c) => c.label);
    if (camposObrigFalt.length) {
      toast.error(`Preencha os campos obrigatórios do estado: ${camposObrigFalt.join(", ")}`);
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
          estado_uf: estadoUf,
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
          valor_avaliado: form.valor_avaliado ? Number(form.valor_avaliado.replace(",", ".")) : null,
          observacao_compra: form.observacao.trim() || null,
          nf_status: tipoPessoa === "PJ" ? "aguardando_analise" : "nao_aplicavel",
        })
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
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/compras" })}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">Novo chamado de compra</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados iniciais. Após salvar, você poderá anexar documentos e enviar para análise.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Pessoa</Label>
            <Select value={tipoPessoa} onValueChange={(v) => setTipoPessoa(v as TipoPessoa)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">Pessoa Física</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado (UF)</Label>
            <Select value={estadoUf} onValueChange={(v) => setEstadoUf(v as EstadoUF)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GO">Goiás</SelectItem>
                <SelectItem value="ES">Espírito Santo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nome / Razão social *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
          </div>
          <div>
            <Label>{tipoPessoa === "PF" ? "CPF *" : "CNPJ *"}</Label>
            <Input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Veículo</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Placa *</Label>
            <Input value={form.placa} onChange={(e) => set("placa", e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label>Chassi *</Label>
            <Input value={form.chassi} onChange={(e) => set("chassi", e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label>Renavam *</Label>
            <Input value={form.renavam} onChange={(e) => set("renavam", e.target.value)} />
          </div>
          <div>
            <Label>Modelo *</Label>
            <Input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
          </div>
          <div>
            <Label>Ano/Modelo *</Label>
            <Input value={form.ano_modelo} onChange={(e) => set("ano_modelo", e.target.value)} />
          </div>
          <div>
            <Label>Cor externa *</Label>
            <Input value={form.cor_externa} onChange={(e) => set("cor_externa", e.target.value)} />
          </div>
          <div>
            <Label>Loja de estoque *</Label>
            {lojas.length === 0 ? (
              <div className="text-xs text-amber-500 border border-amber-500/40 rounded-md p-2">
                Nenhuma loja cadastrada.{" "}
                {isAdmin && (
                  <Link to="/compras/configuracoes" className="underline">
                    Cadastrar agora
                  </Link>
                )}
              </div>
            ) : (
              <Select value={form.loja_estoque} onValueChange={(v) => set("loja_estoque", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {lojas.map((l) => (
                    <SelectItem key={l.valor} value={l.valor}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label>Código avaliação NBS *</Label>
            <Input value={form.codigo_avaliacao_nbs} onChange={(e) => set("codigo_avaliacao_nbs", e.target.value)} />
          </div>
          <div>
            <Label>Valor avaliado (R$) *</Label>
            <Input value={form.valor_avaliado} onChange={(e) => set("valor_avaliado", e.target.value)} placeholder="0,00" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tipo de compra</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={tipoCompra} onValueChange={(v) => setTipoCompra(v as TipoCompra)}>
            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(tiposCompra.length > 0
                ? tiposCompra.map((t) => ({ valor: t.valor, label: t.label }))
                : (Object.keys(TIPO_COMPRA_LABEL) as TipoCompra[]).map((k) => ({ valor: k, label: TIPO_COMPRA_LABEL[k] }))
              ).map((t) => (
                <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={form.observacao} onChange={(e) => set("observacao", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/compras" })}>Cancelar</Button>
        <Button onClick={salvar} disabled={saving}>
          {saving ? "Salvando..." : "Criar chamado"}
        </Button>
      </div>
    </div>
  );
}
