import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Trash2, RotateCcw, XCircle, Download, Columns3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  formatBRL,
  valorVendaHistorico,
  type FaixaDias,
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
  modo: "ativo" | "repasse" | "vendidos" | "lixeira";
  /** Matriz de regras — define quais canais são obrigatórios por categoria. */
  regras?: RegraEstoque[];
  /** Vendas históricas — base da rastreabilidade do valor sugerido. */
  vendas?: VendaHistorica[];
  /** Recálculo forçado deste veículo (refaz a base do zero). */
  onRecalcular?: (v: Veiculo) => void | Promise<void>;
  onExcluir?: (v: Veiculo) => void;

  onRestaurar?: (v: Veiculo) => void;
  onExcluirDefinitivo?: (v: Veiculo) => void;
  onAtualizado?: () => void | Promise<void>;
}


const TODOS = "__todos__";

/** Colunas configuráveis da tabela (a coluna de ações é sempre exibida). */
const COLUNAS = [
  { key: "modelo", label: "Modelo", align: "left" },
  { key: "chassi", label: "Chassi", align: "left" },
  { key: "empresa", label: "Empresa NBS", align: "left" },
  { key: "classificacao", label: "Class.", align: "left" },
  { key: "dias", label: "Dias", align: "right" },
  { key: "faixa", label: "Faixa", align: "left" },
  { key: "leads", label: "Leads", align: "right" },
  { key: "fipe", label: "FIPE", align: "right" },
  { key: "perc_fipe", label: "% FIPE", align: "right" },
  { key: "valor_importado", label: "Valor anúncio importado", align: "right" },
  { key: "valor_sugerido", label: "Valor anunciado sugerido", align: "right" },
  { key: "canais", label: "Canais", align: "left" },
] as const;

type ColunaKey = (typeof COLUNAS)[number]["key"];
const TODAS_COLUNAS: ColunaKey[] = COLUNAS.map((c) => c.key);


/** Normaliza nome de canal para comparar com `canais_exigidos` da regra. */
const normCanal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

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
  onExcluir,
  onRestaurar,
  onExcluirDefinitivo,
  onAtualizado,

}: VeiculosTableProps) {
  const [busca, setBusca] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState(TODOS);
  const [classFiltro, setClassFiltro] = useState(TODOS);
  const [faixaFiltro, setFaixaFiltro] = useState(TODOS);
  const [finalidadeFiltro, setFinalidadeFiltro] = useState(TODOS);
  const [detalhe, setDetalhe] = useState<Veiculo | null>(null);
  const [colunas, setColunas] = useState<ColunaKey[]>(TODAS_COLUNAS);

  // Preferência de colunas por usuário — carregada uma vez ao montar.
  useEffect(() => {
    let ativo = true;
    void getPrefColunas()
      .then((pref) => {
        if (!ativo || !pref) return;
        const validas = pref.filter((c): c is ColunaKey =>
          (TODAS_COLUNAS as string[]).includes(c),
        );
        if (validas.length > 0) setColunas(validas);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  const alternarColuna = (key: ColunaKey) => {
    const proximas = colunas.includes(key)
      ? colunas.filter((c) => c !== key)
      : TODAS_COLUNAS.filter((c) => c === key || colunas.includes(c));
    if (proximas.length === 0) {
      toast.error("Mantenha ao menos uma coluna visível.");
      return;
    }
    setColunas(proximas);
    void salvarPrefColunas(proximas).catch(() => undefined);
  };

  const visiveis = COLUNAS.filter((c) => colunas.includes(c.key));


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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <Columns3 className="w-4 h-4" />
              Colunas ({visiveis.length})
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-2">
            <p className="text-xs text-muted-foreground">
              Escolha as colunas visíveis. A preferência fica salva no seu usuário.
            </p>
            {COLUNAS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={colunas.includes(c.key)}
                  onCheckedChange={() => alternarColuna(c.key)}
                />
                {c.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
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

  return (
    <div className="space-y-4 text-sm">
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
