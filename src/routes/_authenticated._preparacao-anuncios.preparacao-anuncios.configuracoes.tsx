import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabelaMapeamento } from "@/components/preparacao/TabelaMapeamento";
import { supabase } from "@/integrations/supabase/client";
import { INDICADORES, carregarConfig, normTexto, type ConfigIndicador, type IndicadorId } from "@/lib/preparacao-anuncios";

export const Route = createFileRoute("/_authenticated/_preparacao-anuncios/preparacao-anuncios/configuracoes")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Configurações — Pendências Preparação/Anúncios" },
      { name: "description", content: "Regras dos indicadores, agrupamento e direcionamento de lojas e responsáveis." },
      { property: "og:title", content: "Configurações — Preparação/Anúncios" },
      { property: "og:description", content: "Parâmetros do módulo de preparação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Configuracoes,
});

const DESCRICAO: Record<IndicadorId, string> = {
  os: "Pendente quando a placa aparece na base Pendências OS.",
  foto: "Pendente quando as fotos do Estoque BI ficam abaixo do mínimo, sem registro recente no Gosystem nem no Banco de Fotos.",
  tcuv: "Pendente quando SOLICITADO está preenchido e RETORNO está vazio.",
  auditoria: "Pendente quando encontrado = NAO na conferência física.",
};

function Configuracoes() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["prep", "config"], queryFn: carregarConfig });
  const { data: lojas = [] } = useQuery({
    queryKey: ["prep", "lojas-brutas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prep_veiculos").select("loja_bruta").limit(5000);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((d) => normTexto(d.loja_bruta)).filter(Boolean))).sort();
    },
  });
  const { data: cadastro = [] } = useQuery({
    queryKey: ["prep", "lojas-cadastro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prep_lojas").select("id, loja, regional").order("regional").order("loja");
      if (error) throw error;
      return data ?? [];
    },
  });
  const sugestoes = Array.from(new Set([...lojas, ...cadastro.map((c) => normTexto(c.loja))])).sort();
  const regionais = Array.from(new Set(cadastro.map((c) => c.regional))).sort();
  const [cfg, setCfg] = useState<Record<IndicadorId, ConfigIndicador> | null>(null);
  const [tipoResp, setTipoResp] = useState<"loja" | "regional">("loja");
  useEffect(() => { if (data) setCfg(data.config); }, [data]);

  const recarregar = () => qc.invalidateQueries({ queryKey: ["prep"] });
  const exec = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p;
    if (error) { toast.error(error.message.includes("duplicate") ? "Já existe cadastro para essa origem." : error.message); return; }
    await recarregar();
  };

  const salvarIndicadores = async () => {
    if (!cfg) return;
    for (const c of Object.values(cfg)) {
      const { error } = await supabase.from("prep_config_indicadores").update({ habilitado: c.habilitado, config: c.config, updated_at: new Date().toISOString() }).eq("indicador", c.indicador);
      if (error) return toast.error(error.message);
    }
    toast.success("Indicadores salvos.");
    await recarregar();
  };

  const setNum = (campo: "min_fotos" | "dias_gosystem", v: string) =>
    setCfg((c) => c && { ...c, foto: { ...c.foto, config: { ...c.foto.config, [campo]: Math.max(0, Number(v) || 0) } } });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <Tabs defaultValue="indicadores">
        <TabsList>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="lojas">Lojas</TabsTrigger>
          <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores" className="space-y-3">
          {cfg && INDICADORES.map((i) => (
            <Card key={i.id} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Switch id={`ind-${i.id}`} checked={cfg[i.id]?.habilitado ?? false} onCheckedChange={(v) => setCfg({ ...cfg, [i.id]: { ...cfg[i.id], habilitado: v } })} />
                <Label htmlFor={`ind-${i.id}`} className="font-semibold">{i.label}</Label>
              </div>
              <p className="text-sm text-muted-foreground">{DESCRICAO[i.id]}</p>
              {i.id === "foto" && (
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1"><Label htmlFor="min-fotos">Mínimo de fotos</Label><Input id="min-fotos" type="number" min={0} className="w-32" value={cfg.foto.config.min_fotos ?? 0} onChange={(e) => setNum("min_fotos", e.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="dias-gos">Dias-limite do registro Gosystem</Label><Input id="dias-gos" type="number" min={0} className="w-32" value={cfg.foto.config.dias_gosystem ?? 0} onChange={(e) => setNum("dias_gosystem", e.target.value)} /></div>
                </div>
              )}
            </Card>
          ))}
          <Button onClick={salvarIndicadores}>Salvar indicadores</Button>
        </TabsContent>

        <TabsContent value="lojas" className="space-y-4">
          <Card className="p-4 space-y-2">
            <h2 className="font-semibold">Cadastro de lojas</h2>
            <p className="text-sm text-muted-foreground">{cadastro.length} lojas em {regionais.length} regionais. Base usada nas sugestões de direcionamento, agrupamento e responsáveis.</p>
            <TabelaMapeamento
              rotuloDe="Loja" rotuloPara="Regional" sugestoesDe={sugestoes}
              linhas={cadastro.map((c) => ({ id: c.id, de: c.loja, para: c.regional }))}
              onAdicionar={(de, para) => exec(supabase.from("prep_lojas").insert({ loja: de, regional: para }))}
              onRemover={(id) => exec(supabase.from("prep_lojas").delete().eq("id", id))}
            />
          </Card>
          <Card className="p-4 space-y-2">
            <h2 className="font-semibold">1. Direcionamento</h2>
            <p className="text-sm text-muted-foreground">Loja sem operação de seminovos → loja responsável. Aplicado primeiro.</p>
            <TabelaMapeamento
              rotuloDe="Loja sem operação" rotuloPara="Loja responsável" sugestoesDe={sugestoes}
              linhas={(data?.direc ?? []).map((d) => ({ id: d.id, de: d.loja_sem_operacao, para: d.loja_responsavel }))}
              onAdicionar={(de, para) => exec(supabase.from("prep_lojas_direcionamento").insert({ loja_sem_operacao: de, loja_responsavel: para }))}
              onRemover={(id) => exec(supabase.from("prep_lojas_direcionamento").delete().eq("id", id))}
            />
          </Card>
          <Card className="p-4 space-y-2">
            <h2 className="font-semibold">2. Agrupamento</h2>
            <p className="text-sm text-muted-foreground">Variações de nome da mesma loja → nome canônico. Aplicado depois do direcionamento.</p>
            <TabelaMapeamento
              rotuloDe="Loja origem" rotuloPara="Loja canônica" sugestoesDe={sugestoes}
              linhas={(data?.agrup ?? []).map((d) => ({ id: d.id, de: d.loja_origem, para: d.loja_canonica }))}
              onAdicionar={(de, para) => exec(supabase.from("prep_lojas_agrupamento").insert({ loja_origem: de, loja_canonica: para }))}
              onRemover={(id) => exec(supabase.from("prep_lojas_agrupamento").delete().eq("id", id))}
            />
          </Card>
        </TabsContent>

        <TabsContent value="responsaveis">
          <Card className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground">O responsável é buscado primeiro pela loja final e, se não houver, pela regional.</p>
            <TabelaMapeamento
              rotuloDe={tipoResp === "loja" ? "Loja final" : "Regional"} rotuloPara="Responsável"
              sugestoesDe={tipoResp === "loja" ? sugestoes : regionais}
              extra={
                <Select value={tipoResp} onValueChange={(v) => setTipoResp(v as "loja" | "regional")}>
                  <SelectTrigger className="w-36" aria-label="Tipo"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="loja">Por loja</SelectItem><SelectItem value="regional">Por regional</SelectItem></SelectContent>
                </Select>
              }
              linhas={(data?.resp ?? []).map((d) => ({ id: d.id, de: d.chave, para: d.responsavel, extra: d.chave_tipo }))}
              onAdicionar={(de, para) => exec(supabase.from("prep_regional_responsavel").insert({ chave_tipo: tipoResp, chave: de, responsavel: para }))}
              onRemover={(id) => exec(supabase.from("prep_regional_responsavel").delete().eq("id", id))}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
