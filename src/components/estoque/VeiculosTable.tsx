import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Trash2,
  RotateCcw,
  XCircle,
  Download,
  Columns3,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  formatBRL,
  valorVendaHistorico,
  type FaixaDias,
  type PassoMemoria,
  type RegraEstoque,
  type VendaHistorica,
} from "@/lib/estoque-motor";

import { EditarVeiculoDialog } from "@/components/estoque/EditarVeiculoDialog";
import { getPrefColunas, salvarPrefColunas } from "@/lib/estoque";
import type { Anuncio, EmpresaNbs, HistoricoValor, Origem, Veiculo } from "@/lib/estoque";


export interface VeiculosTableProps {
  veiculos: Veiculo[];
  origens: Origem[];
  empresas: EmpresaNbs[];
  faixas: FaixaDias[];
  anuncios: Anuncio[];
  historico: Map<string, HistoricoValor>;
  modo: "ativo" | "repasse" | "vendidos" | "lixeira" | "inativos";
  /** Matriz de regras — define quais canais são obrigatórios por categoria. */
  regras?: RegraEstoque[];
  /** Vendas históricas — base da rastreabilidade do valor sugerido. */
  vendas?: VendaHistorica[];
  /** Recálculo forçado deste veículo (refaz a base do zero). */
  onRecalcular?: (v: Veiculo) => void | Promise<void>;
  onExcluir?: (v: Veiculo) => void;

  onRestaurar?: (v: Veiculo) => void;
  /** Devolve um veículo inativado para a listagem ativa. */
  onReativar?: (v: Veiculo) => void;
  onExcluirDefinitivo?: (v: Veiculo) => void;

  onAtualizado?: () => void | Promise<void>;
}


const TODOS = "__todos__";

/**
 * Todas as colunas disponíveis do veículo (importadas e calculadas/derivadas).
 * A coluna de ações é sempre exibida e não é configurável.
 */
const COLUNAS = [
  { key: "modelo", label: "Modelo", align: "left" },
  { key: "chassi", label: "Chassi", align: "left" },
  { key: "chassi_resumido", label: "Chassi resumido", align: "left" },
  { key: "origem", label: "Origem", align: "left" },
  { key: "empresa", label: "Empresa NBS", align: "left" },
  { key: "regional", label: "Regional", align: "left" },
  { key: "loja", label: "Loja", align: "left" },
  { key: "placa", label: "Placa", align: "left" },
  { key: "ano_mod", label: "Ano/Mod", align: "left" },
  { key: "cor", label: "Cor", align: "left" },
  { key: "km", label: "KM", align: "right" },
  { key: "custo_total", label: "Custo total", align: "right" },
  { key: "classificacao", label: "Class.", align: "left" },
  { key: "dias", label: "Dias", align: "right" },
  { key: "faixa", label: "Faixa", align: "left" },
  { key: "leads", label: "Leads", align: "right" },
  { key: "fotos", label: "Fotos", align: "right" },
  { key: "fipe", label: "FIPE", align: "right" },
  { key: "codigo_fipe", label: "Código FIPE", align: "left" },
  { key: "perc_fipe", label: "% FIPE", align: "right" },
  { key: "perc_fipe_planilha", label: "% FIPE (planilha)", align: "right" },
  { key: "valor_importado", label: "Valor anúncio importado", align: "right" },
  { key: "valor_sugerido", label: "Valor anunciado sugerido", align: "right" },
  { key: "margem", label: "Margem (%)", align: "right" },

  { key: "finalidade", label: "Finalidade", align: "left" },
  { key: "acao_planilha", label: "Ação (planilha)", align: "left" },
  { key: "canais", label: "Canais", align: "left" },
  { key: "situacao", label: "Situação", align: "left" },
  { key: "importado_em", label: "Importado em", align: "left" },
  { key: "ultimo_calculo_em", label: "Último cálculo", align: "left" },
  { key: "editado_em", label: "Editado em", align: "left" },
  { key: "inativado_em", label: "Inativado em", align: "left" },
  { key: "campos_manuais", label: "Campos editados", align: "left" },
] as const;

type ColunaKey = (typeof COLUNAS)[number]["key"];
const TODAS_COLUNAS: ColunaKey[] = COLUNAS.map((c) => c.key);

/** Colunas exibidas quando o usuário ainda não salvou uma preferência. */
const COLUNAS_PADRAO: ColunaKey[] = [
  "modelo",
  "chassi",
  "empresa",
  "classificacao",
  "dias",
  "faixa",
  "leads",
  "fipe",
  "perc_fipe",
  "valor_importado",
  "valor_sugerido",
  "canais",
];


/** Normaliza nome de canal para comparar com `canais_exigidos` da regra. */
const normCanal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const formatData = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export function VeiculosTable({
  veiculos,
  origens,
  empresas,
  faixas,
  anuncios,
  historico,
  modo,
  regras = [],
  vendas = [],
  onRecalcular,
  onExcluir,
  onRestaurar,
  onReativar,
  onExcluirDefinitivo,
  onAtualizado,
}: VeiculosTableProps) {
  const [busca, setBusca] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState(TODOS);
  const [classFiltro, setClassFiltro] = useState(TODOS);
  const [faixaFiltro, setFaixaFiltro] = useState(TODOS);
  const [finalidadeFiltro, setFinalidadeFiltro] = useState(TODOS);
  const [detalhe, setDetalhe] = useState<Veiculo | null>(null);
  const [colunas, setColunas] = useState<ColunaKey[]>(COLUNAS_PADRAO);

  // Rascunho do painel de configuração — só vira preferência ao clicar em "Salvar".
  const [configAberta, setConfigAberta] = useState(false);
  const [rascunho, setRascunho] = useState<ColunaKey[]>(COLUNAS_PADRAO);
  const [salvando, setSalvando] = useState(false);

  // Preferência de colunas por usuário — carregada uma vez ao montar.
  useEffect(() => {
    let ativo = true;
    void getPrefColunas()
      .then((pref) => {
        if (!ativo || !pref) return;
        const validas = pref.filter((c): c is ColunaKey =>
          (TODAS_COLUNAS as string[]).includes(c),
        );
        if (validas.length > 0) {
          setColunas(validas);
          setRascunho(validas);
        }
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  const abrirConfig = (aberta: boolean) => {
    if (aberta) setRascunho(colunas);
    setConfigAberta(aberta);
  };

  /** Marca/desmarca mantendo a ordem: novos entram no fim da lista. */
  const alternarRascunho = (key: ColunaKey) =>
    setRascunho((atual) =>
      atual.includes(key) ? atual.filter((c) => c !== key) : [...atual, key],
    );

  const moverRascunho = (key: ColunaKey, delta: -1 | 1) =>
    setRascunho((atual) => {
      const i = atual.indexOf(key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= atual.length) return atual;
      const copia = [...atual];
      const [item] = copia.splice(i, 1);
      copia.splice(j, 0, item!);
      return copia;
    });

  const salvarConfig = async () => {
    if (rascunho.length === 0) {
      toast.error("Mantenha ao menos uma coluna visível.");
      return;
    }
    setSalvando(true);
    try {
      await salvarPrefColunas(rascunho);
      setColunas(rascunho);
      setConfigAberta(false);
      toast.success("Configuração de colunas salva.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar as colunas.");
    } finally {
      setSalvando(false);
    }
  };

  const visiveis = colunas.map((k) => COLUNAS.find((c) => c.key === k)!).filter(Boolean);





  const anunciosPorChassi = useMemo(() => {
    const m = new Map<string, Anuncio>();
    for (const a of anuncios) m.set(a.chassi.toUpperCase(), a);
    return m;
  }, [anuncios]);

  const finalidades = useMemo(
    () => Array.from(new Set(veiculos.map((v) => v.finalidade_atual ?? v.finalidade).filter(Boolean))) as string[],
    [veiculos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return veiculos.filter((v) => {
      if (origemFiltro !== TODOS && v.origem_id !== origemFiltro) return false;
      if (classFiltro !== TODOS && (v.classificacao ?? "") !== classFiltro) return false;
      if (faixaFiltro !== TODOS && (v.faixa_id_atual ?? "") !== faixaFiltro) return false;
      if (
        finalidadeFiltro !== TODOS &&
        (v.finalidade_atual ?? v.finalidade ?? "") !== finalidadeFiltro
      )
        return false;
      if (!termo) return true;
      return [v.chassi, v.placa, v.modelo, v.loja].some((c) =>
        (c ?? "").toLowerCase().includes(termo),
      );
    });
  }, [veiculos, busca, origemFiltro, classFiltro, faixaFiltro, finalidadeFiltro]);

  const nomeEmpresa = (v: Veiculo) =>
    empresas.find((e) => e.id === v.empresa_nbs_id)?.nome_exibicao ?? v.chassi_resumido;
  const nomeFaixa = (v: Veiculo) => faixas.find((f) => f.id === v.faixa_id_atual)?.nome ?? "—";
  const percFipe = (v: Veiculo) =>
    v.fipe && v.valor_anuncio_calculado ? `${((v.valor_anuncio_calculado / v.fipe) * 100).toFixed(1)}%` : "—";

  /**
   * Estado do canal para o veículo:
   * - "cumpriu"  (verde)    → canal obrigatório para a categoria e publicado ("Sim").
   * - "pendente" (vermelho) → canal obrigatório e NÃO publicado.
   * - "opcional" (cinza)    → canal não obrigatório para a categoria.
   */
  const canaisDoVeiculo = (
    v: Veiculo,
    anuncio: Anuncio | undefined,
  ): { label: string; estado: "cumpriu" | "pendente" | "opcional"; titulo: string }[] => {
    const regra = regras.find(
      (r) => r.ativo && r.classificacao === v.classificacao && r.faixa_id === v.faixa_id_atual,
    );
    const exigidos = new Set((regra?.canais_exigidos ?? []).map(normCanal));
    const itens: [string, string, boolean | undefined][] = [
      ["Site", "Site Próprio", anuncio?.canal_site_proprio],
      ["OLX", "OLX", anuncio?.canal_olx],
      ["WM", "WebMotors", anuncio?.canal_webmotors],
    ];
    return itens.map(([label, nomeCanal, publicado]) => {
      const obrigatorio = exigidos.has(normCanal(nomeCanal));
      if (!obrigatorio) {
        return {
          label,
          estado: "opcional" as const,
          titulo: `${nomeCanal}: não obrigatório para esta categoria`,
        };
      }
      return publicado
        ? { label, estado: "cumpriu" as const, titulo: `${nomeCanal}: obrigatório e publicado` }
        : {
            label,
            estado: "pendente" as const,
            titulo: `${nomeCanal}: obrigatório e ainda não publicado`,
          };
    });
  };

  /** Exporta em XLSX exatamente as linhas visíveis (respeita os filtros da tela). */
  const exportar = async () => {
    try {
      if (filtrados.length === 0) {
        toast.error("Nenhum veículo para exportar.");
        return;
      }
      const XLSX = await import("xlsx");
      const linhas = filtrados.map((v) => {
        const a = anunciosPorChassi.get(v.chassi.toUpperCase());
        return {
          Chassi: v.chassi,
          "Chassi resumido": v.chassi_resumido,
          Origem: origens.find((o) => o.id === v.origem_id)?.nome ?? "",
          "Empresa NBS": nomeEmpresa(v),
          Regional: v.regional ?? "",
          Loja: v.loja ?? "",
          Modelo: v.modelo ?? "",
          Placa: v.placa ?? "",
          "Ano/Mod": v.ano_mod ?? "",
          Cor: v.cor ?? "",
          KM: v.km ?? "",
          "Custo total": v.custo_total ?? "",
          FIPE: v.fipe ?? "",
          "Código FIPE": v.codigo_fipe ?? "",
          "% FIPE": percFipe(v),
          "Valor anúncio importado": v.valor_anunciado_planilha ?? "",
          "Valor anunciado sugerido": v.valor_anuncio_calculado ?? "",
          Classificação: v.classificacao ?? "",
          "Dias em estoque": v.dias_em_estoque,
          Faixa: nomeFaixa(v),
          "Leads 60 dias": v.leads_60_dias,
          Fotos: v.fotos_qtd ?? "",
          Finalidade: v.finalidade_atual ?? v.finalidade ?? "",
          "Canal Site próprio": a?.canal_site_proprio ? "Publicado" : "Pendente",
          "Canal OLX": a?.canal_olx ? "Publicado" : "Pendente",
          "Canal WebMotors": a?.canal_webmotors ? "Publicado" : "Pendente",
          "Campos editados manualmente": (v.campos_manuais ?? []).join(", "),
        };
      });
      const ws = XLSX.utils.json_to_sheet(linhas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estoque");
      XLSX.writeFile(wb, `estoque-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${linhas.length} veículos exportados.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar.");
    }
  };



  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por chassi, placa, modelo ou loja"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as origens</SelectItem>
            {origens.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFiltro} onValueChange={setClassFiltro}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Classificação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Classificação</SelectItem>
            {["A+", "A", "B", "C", "D"].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={faixaFiltro} onValueChange={setFaixaFiltro}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Faixa de dias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as faixas</SelectItem>
            {faixas.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={finalidadeFiltro} onValueChange={setFinalidadeFiltro}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Finalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as finalidades</SelectItem>
            {finalidades.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto" onClick={() => abrirConfig(true)}>
          <Columns3 className="w-4 h-4" />
          Colunas ({visiveis.length})
        </Button>
        <Dialog open={configAberta} onOpenChange={abrirConfig}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar colunas</DialogTitle>
              <DialogDescription>
                Marque os campos que deseja exibir e ajuste a ordem. A configuração é salva no
                seu usuário e permanece após sair e entrar de novo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Campos disponíveis ({COLUNAS.length})</h3>
                <div className="rounded-xl border border-border p-3 space-y-2 max-h-72 overflow-y-auto">
                  {COLUNAS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={rascunho.includes(c.key)}
                        onCheckedChange={() => alternarRascunho(c.key)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Ordem das colunas ({rascunho.length})</h3>
                <div className="rounded-xl border border-border p-2 space-y-1 max-h-72 overflow-y-auto">
                  {rascunho.length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground">
                      Nenhuma coluna selecionada.
                    </p>
                  )}
                  {rascunho.map((key, i) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 text-sm"
                    >
                      <span className="flex-1 truncate">
                        {COLUNAS.find((c) => c.key === key)?.label ?? key}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Mover para cima"
                        disabled={i === 0}
                        onClick={() => moverRascunho(key, -1)}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Mover para baixo"
                        disabled={i === rascunho.length - 1}
                        onClick={() => moverRascunho(key, 1)}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => abrirConfig(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void salvarConfig()} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={() => void exportar()}>
          <Download className="w-4 h-4" />
          Exportar ({filtrados.length})
        </Button>
      </div>


      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              {visiveis.map((c) => (
                <th
                  key={c.key}
                  className={cn("px-3 py-2 font-medium", c.align === "right" && "text-right")}
                >
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={visiveis.length + 1}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  Nenhum veículo encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((v) => {
              const anuncio = anunciosPorChassi.get(v.chassi.toUpperCase());

              const celula: Record<ColunaKey, ReactNode> = {
                modelo: (
                  <>
                    <div className="font-medium text-foreground">{v.modelo ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.loja ?? "—"} · {v.placa ?? "sem placa"}
                    </div>
                  </>
                ),
                chassi: <span className="font-mono text-xs">{v.chassi}</span>,
                empresa: nomeEmpresa(v),
                classificacao: <Badge variant="secondary">{v.classificacao ?? "—"}</Badge>,
                dias: v.dias_em_estoque,
                faixa: nomeFaixa(v),
                leads: v.leads_60_dias,
                fipe: formatBRL(v.fipe),
                perc_fipe: percFipe(v),
                valor_importado: (
                  <span className="tabular-nums">{formatBRL(v.valor_anunciado_planilha)}</span>
                ),
                valor_sugerido: (
                  <button
                    type="button"
                    onClick={() => setDetalhe(v)}
                    title="Ver os veículos do histórico usados no cálculo"
                    className="font-semibold underline decoration-dotted underline-offset-4 hover:text-primary"
                  >
                    {formatBRL(v.valor_anuncio_calculado)}
                  </button>
                ),
                margem: (() => {
                  const custo = v.custo_total ?? 0;
                  const sugerido = v.valor_anuncio_calculado;
                  if (!custo || sugerido == null) return "—";
                  const lucro = sugerido - custo;
                  const pct = (lucro / custo) * 100;
                  return (
                    <span
                      className={cn("tabular-nums", lucro < 0 && "text-destructive")}
                      title={`Lucro projetado: ${formatBRL(lucro)}`}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  );
                })(),

                chassi_resumido: <span className="font-mono text-xs">{v.chassi_resumido}</span>,
                origem: origens.find((o) => o.id === v.origem_id)?.nome ?? "—",
                regional: v.regional ?? "—",
                loja: v.loja ?? "—",
                placa: v.placa ?? "—",
                ano_mod: v.ano_mod ?? "—",
                cor: v.cor ?? "—",
                km: v.km != null ? v.km.toLocaleString("pt-BR") : "—",
                custo_total: formatBRL(v.custo_total),
                fotos: v.fotos_qtd ?? "—",
                codigo_fipe: v.codigo_fipe ?? "—",
                perc_fipe_planilha:
                  v.percentual_fipe_planilha != null
                    ? `${v.percentual_fipe_planilha.toFixed(1)}%`
                    : "—",
                finalidade: v.finalidade_atual ?? v.finalidade ?? "—",
                acao_planilha: v.acao_planilha ?? "—",
                situacao: v.deleted_at
                  ? "Lixeira"
                  : v.inativo
                    ? "Inativo"
                    : v.em_vendido
                      ? "Vendido"
                      : v.em_repasse
                        ? "Repasse"
                        : "Ativo",
                importado_em: formatData(v.importado_em),
                ultimo_calculo_em: formatData(v.ultimo_calculo_em),
                editado_em: formatData(v.editado_em),
                inativado_em: formatData(v.inativado_em),
                campos_manuais: (v.campos_manuais ?? []).join(", ") || "—",
                canais: (
                  <div className="flex gap-1">
                    {canaisDoVeiculo(v, anuncio).map(({ label, estado, titulo }) => (
                      <span
                        key={label}
                        title={titulo}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium border",
                          estado === "cumpriu" &&
                            "bg-status-done-bg text-status-done border-status-done/40",
                          estado === "pendente" &&
                            "bg-destructive/10 text-destructive border-destructive/40",
                          estado === "opcional" && "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ),
              };

              return (
                <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                  {visiveis.map((c) => (
                    <td
                      key={c.key}
                      className={cn("px-3 py-2", c.align === "right" && "text-right")}
                    >
                      {celula[c.key]}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {modo !== "lixeira" && onAtualizado && (
                        <EditarVeiculoDialog veiculo={v} onSalvo={onAtualizado} />
                      )}
                      {modo !== "lixeira" && onRecalcular && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Recalcular preço (forçado)"
                          aria-label="Recalcular preço (forçado)"
                          onClick={() => void onRecalcular(v)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}

                      {modo === "inativos" && onReativar && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reativar veículo"
                          aria-label="Reativar veículo"
                          onClick={() => onReativar(v)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}

                      {modo !== "lixeira" && onExcluir && (
                        <Button size="icon" variant="ghost" onClick={() => onExcluir(v)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}



                      {modo === "lixeira" && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => onRestaurar?.(v)}>
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => onExcluirDefinitivo?.(v)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {veiculos.length} veículos
      </p>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Composição do valor sugerido</DialogTitle>
            <DialogDescription>
              {detalhe?.modelo ?? "—"} · {detalhe?.chassi}
            </DialogDescription>
          </DialogHeader>
          {detalhe && <DetalheCalculo veiculo={detalhe} vendas={vendas} hist={historico.get(detalhe.id)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DetalheCalculoProps {
  veiculo: Veiculo;
  vendas: VendaHistorica[];
  hist: HistoricoValor | undefined;
}

/**
 * Rastreabilidade do valor sugerido: mostra as vendas do histórico que serviram
 * de base (mesmo código FIPE + ano modelo + faixa de KM) e se o valor final foi
 * ajustado por piso/teto de FIPE.
 */
function DetalheCalculo({ veiculo, vendas, hist }: DetalheCalculoProps) {
  const base = useMemo(() => valorVendaHistorico(veiculo, vendas), [veiculo, vendas]);
  const memoria = (hist?.memoria_calculo ?? {}) as Record<string, unknown>;
  const piso = memoria["piso_aplicado"] as { percentual: number; valor: number } | undefined;
  const teto = memoria["teto_aplicado"] as { percentual: number; valor: number } | undefined;
  const passos = Array.isArray(memoria["passos"]) ? (memoria["passos"] as PassoMemoria[]) : [];

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-medium mb-2">Memória de cálculo ({passos.length} faixa(s))</h3>
        {passos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Ainda não há memória detalhada por faixa para este veículo. Ela é gravada no próximo
            recálculo.
          </p>
        ) : (
          <ol className="space-y-2">
            {passos.map((p, i) => (
              <li key={`${p.faixa}-${i}`} className="rounded-xl border border-border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {i + 1}. {p.faixa} · Classificação {p.classificacao}
                  </span>
                  <span className="tabular-nums font-semibold">{formatBRL(p.valor_depois)}</span>
                </div>
                {p.nivel && (
                  <p className="text-xs text-muted-foreground">
                    Nível de fallback: <strong>{p.nivel}</strong>
                    {p.motivo ? ` — ${p.motivo}` : ""}
                  </p>
                )}
                {!p.nivel && p.motivo && (
                  <p className="text-xs text-muted-foreground">{p.motivo}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Ajuste aplicado: {p.percentual > 0 ? "+" : ""}
                  {p.percentual}% ({p.origem})
                  {p.valor_antes != null ? ` · de ${formatBRL(p.valor_antes)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Gatilho de leads:{" "}
                  {p.leads_min != null
                    ? `mínimo configurado ${p.leads_min} · leads reais ${p.leads_reais}`
                    : `sem mínimo configurado · leads reais ${p.leads_reais}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ações operacionais: {p.acoes.length > 0 ? p.acoes.join(", ") : "nenhuma ativa"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Balizadores: piso{" "}
                  {p.piso?.ativo ? `${p.piso.percentual}% da FIPE` : "desligado"} · teto{" "}
                  {p.teto?.ativo ? `${p.teto.percentual}% da FIPE` : "desligado"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>


      <div className="rounded-xl border border-border p-3 space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor bruto (histórico de vendas)</span>
          <span className="font-medium">{formatBRL(base.valor)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">FIPE do veículo</span>
          <span className="font-medium">{formatBRL(veiculo.fipe)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor sugerido final</span>
          <span className="font-semibold">{formatBRL(veiculo.valor_anuncio_calculado)}</span>
        </div>
        <p className="text-xs text-muted-foreground pt-1">{base.motivo}</p>
        {piso && (
          <p className="text-xs text-status-done">
            Balizador de piso aplicado: {piso.percentual}% da FIPE ({formatBRL(piso.valor)}).
          </p>
        )}
        {teto && (
          <p className="text-xs text-destructive">
            Balizador de teto aplicado: {teto.percentual}% da FIPE ({formatBRL(teto.valor)}).
          </p>
        )}
        {!piso && !teto && (
          <p className="text-xs text-muted-foreground">
            Nenhum balizador de mínimo/máximo da FIPE foi aplicado.
          </p>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">
          Veículos do histórico usados como referência ({base.vendasUsadas.length})
        </h3>
        {base.vendasUsadas.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma venda comparável encontrada — o cálculo usou 100% da FIPE como base.
          </p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-2 py-1 font-medium">Chassi</th>
                  <th className="px-2 py-1 font-medium">Data da venda</th>
                  <th className="px-2 py-1 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {base.vendasUsadas.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-2 py-1 font-mono">{v.chassi ?? "—"}</td>
                    <td className="px-2 py-1">
                      {v.data_venda ? new Date(v.data_venda).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatBRL(v.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
