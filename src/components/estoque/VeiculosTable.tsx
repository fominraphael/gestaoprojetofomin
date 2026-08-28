import { useMemo, useState } from "react";
import { Trash2, RotateCcw, XCircle } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatBRL, type FaixaDias } from "@/lib/estoque-motor";
import type { Anuncio, EmpresaNbs, HistoricoValor, Origem, Veiculo } from "@/lib/estoque";

export interface VeiculosTableProps {
  veiculos: Veiculo[];
  origens: Origem[];
  empresas: EmpresaNbs[];
  faixas: FaixaDias[];
  anuncios: Anuncio[];
  historico: Map<string, HistoricoValor>;
  modo: "ativo" | "repasse" | "lixeira";
  onExcluir?: (v: Veiculo) => void;
  onRestaurar?: (v: Veiculo) => void;
  onExcluirDefinitivo?: (v: Veiculo) => void;
}

const TODOS = "__todos__";

export function VeiculosTable({
  veiculos,
  origens,
  empresas,
  faixas,
  anuncios,
  historico,
  modo,
  onExcluir,
  onRestaurar,
  onExcluirDefinitivo,
}: VeiculosTableProps) {
  const [busca, setBusca] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState(TODOS);
  const [classFiltro, setClassFiltro] = useState(TODOS);
  const [faixaFiltro, setFaixaFiltro] = useState(TODOS);
  const [finalidadeFiltro, setFinalidadeFiltro] = useState(TODOS);

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
              <th className="px-3 py-2 font-medium text-right">Valor anunciado</th>
              <th className="px-3 py-2 font-medium">Canais</th>
              <th className="px-3 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-muted-foreground">
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
                  <td className="px-3 py-2 text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-semibold cursor-help underline decoration-dotted underline-offset-4">
                            {formatBRL(v.valor_anuncio_calculado)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm text-left">
                          {hist ? (
                            <div className="space-y-1 text-xs">
                              <div>
                                {formatBRL(hist.valor_anterior)} → {formatBRL(hist.valor_novo)}
                              </div>
                              <div>
                                Regra: {hist.classificacao} / {hist.faixa_nome} ({hist.regra_tipo})
                              </div>
                              <div>Percentual: {hist.percentual ?? 0}%</div>
                              <pre className="whitespace-pre-wrap break-all opacity-80">
                                {JSON.stringify(hist.memoria_calculo, null, 1)}
                              </pre>
                            </div>
                          ) : (
                            <span className="text-xs">Sem histórico de alteração.</span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {[
                        ["Site", anuncio?.canal_site_proprio],
                        ["OLX", anuncio?.canal_olx],
                        ["WM", anuncio?.canal_webmotors],
                      ].map(([label, ativo]) => (
                        <span
                          key={String(label)}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium border",
                            ativo
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
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
