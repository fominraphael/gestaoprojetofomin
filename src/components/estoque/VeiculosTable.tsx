import { useMemo, useState } from "react";
import { Trash2, RotateCcw, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  onExcluir?: (v: Veiculo) => void;
  onRestaurar?: (v: Veiculo) => void;
  onExcluirDefinitivo?: (v: Veiculo) => void;
  onAtualizado?: () => void | Promise<void>;
}


const TODOS = "__todos__";

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
        <Button variant="outline" className="ml-auto" onClick={() => void exportar()}>
          <Download className="w-4 h-4" />
          Exportar ({filtrados.length})
        </Button>
      </div>


      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Modelo</th>
              <th className="px-3 py-2 font-medium">Chassi</th>
              <th className="px-3 py-2 font-medium">Empresa NBS</th>
              <th className="px-3 py-2 font-medium">Class.</th>
              <th className="px-3 py-2 font-medium text-right">Dias</th>
              <th className="px-3 py-2 font-medium">Faixa</th>
              <th className="px-3 py-2 font-medium text-right">Leads</th>
              <th className="px-3 py-2 font-medium text-right">FIPE</th>
              <th className="px-3 py-2 font-medium text-right">% FIPE</th>
              <th className="px-3 py-2 font-medium text-right">Valor anúncio importado</th>
              <th className="px-3 py-2 font-medium text-right">Valor anunciado sugerido</th>
              <th className="px-3 py-2 font-medium">Canais</th>
              <th className="px-3 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-10 text-center text-muted-foreground">

                  Nenhum veículo encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((v) => {
              const anuncio = anunciosPorChassi.get(v.chassi.toUpperCase());
              const hist = historico.get(v.id);
              return (
                <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{v.modelo ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.loja ?? "—"} · {v.placa ?? "sem placa"}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{v.chassi}</td>
                  <td className="px-3 py-2">{nomeEmpresa(v)}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{v.classificacao ?? "—"}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{v.dias_em_estoque}</td>
                  <td className="px-3 py-2">{nomeFaixa(v)}</td>
                  <td className="px-3 py-2 text-right">{v.leads_60_dias}</td>
                  <td className="px-3 py-2 text-right">{formatBRL(v.fipe)}</td>
                  <td className="px-3 py-2 text-right">{percFipe(v)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatBRL(v.valor_anunciado_planilha)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setDetalhe(v)}
                      title="Ver os veículos do histórico usados no cálculo"
                      className="font-semibold underline decoration-dotted underline-offset-4 hover:text-primary"
                    >
                      {formatBRL(v.valor_anuncio_calculado)}
                    </button>
                  </td>
                  <td className="px-3 py-2">
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
                  </td>

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
    </div>
  );
}
