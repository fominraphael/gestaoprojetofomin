import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CabecalhoOrdenavel, ResumoOrdenacao, useOrdenacao } from "@/components/OrdenacaoTabela";
import { ordenarLista, type CriterioOrdem, type ValorOrdenavel } from "@/lib/ordenacao";
import { IndicadorBadge } from "./IndicadorBadge";
import { INDICADORES, carregarVeiculosCalculados, normPlaca, type IndicadorId, type StatusIndicador, type VeiculoCalculado } from "@/lib/preparacao-anuncios";

const TODOS = "__todos__";
const POR_PAGINA = 100;
/** Ordenação inicial: veículo mais antigo em estoque primeiro. */
const ORDEM_PADRAO: CriterioOrdem[] = [{ key: "dias", sentido: "desc" }];
const ROTULOS: Record<string, string> = {
  placa: "Placa", modelo: "Modelo", regional: "Regional", loja: "Loja Pendência", responsavel: "Responsável",
  classificacao: "Classificação", dias: "Dias", ...Object.fromEntries(INDICADORES.map((i) => [i.id, i.label])),
};
const PESO_STATUS: Record<StatusIndicador, number> = { pendente: 0, aguardando: 1, revisar: 2, ok: 3, desabilitado: 4 };

function acessor(v: VeiculoCalculado, key: string): ValorOrdenavel {
  switch (key) {
    case "placa": return v.placa;
    case "modelo": return v.modelo;
    case "regional": return v.regional;
    case "loja": return v.loja.final;
    case "responsavel": return v.responsavel;
    case "classificacao": return v.classificacao;
    case "dias": return v.dias_em_estoque;
    default: return v.indicadores[key as IndicadorId] ? PESO_STATUS[v.indicadores[key as IndicadorId].status] : null;
  }
}

export function ListagemVeiculos({ ativos }: { ativos: boolean }) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["prep", "veiculos", ativos],
    queryFn: () => carregarVeiculosCalculados(ativos),
    staleTime: 5 * 60_000,
  });
  const ord = useOrdenacao(`prep-veiculos-${ativos ? "ativos" : "inativos"}`);
  const criterios = ord.criterios.length ? ord.criterios : ORDEM_PADRAO;
  const [somentePendentes, setSomentePendentes] = useState(ativos);
  const [regional, setRegional] = useState(TODOS);
  const [loja, setLoja] = useState(TODOS);
  const [responsavel, setResponsavel] = useState(TODOS);
  const [classificacao, setClassificacao] = useState(TODOS);
  const [indicador, setIndicador] = useState(TODOS);
  const [placa, setPlaca] = useState("");
  const [pagina, setPagina] = useState(0);

  const opcoes = useMemo(() => {
    const u = (xs: (string | null)[]) => Array.from(new Set(xs.filter(Boolean) as string[])).sort();
    return {
      regionais: u(data.map((v) => v.regional)),
      lojas: u(data.map((v) => v.loja.final)),
      responsaveis: u(data.map((v) => v.responsavel)),
      classificacoes: u(data.map((v) => v.classificacao)),
    };
  }, [data]);

  const filtrados = useMemo(() => {
    const p = normPlaca(placa);
    const lista = data.filter(
      (v) =>
        (!somentePendentes || v.pendente) &&
        (regional === TODOS || v.regional === regional) &&
        (loja === TODOS || v.loja.final === loja) &&
        (responsavel === TODOS || v.responsavel === responsavel) &&
        (classificacao === TODOS || v.classificacao === classificacao) &&
        (indicador === TODOS || v.indicadores[indicador as IndicadorId]?.status === "pendente") &&
        (!p || v.placa.includes(p)),
    );
    return ordenarLista(lista, criterios, acessor);
  }, [data, somentePendentes, regional, loja, responsavel, classificacao, indicador, placa, criterios]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = filtrados.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA);
  const comFiltro = (set: (v: string) => void) => (v: string) => { set(v); setPagina(0); };

  const filtroSelect = (rotulo: string, valor: string, set: (v: string) => void, itens: { v: string; l: string }[]) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      <Select value={valor} onValueChange={comFiltro(set)}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {itens.map((i) => <SelectItem key={i.v} value={i.v}>{i.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
  const lista = (xs: string[]) => xs.map((x) => ({ v: x, l: x }));
  const cab = (key: string, alinhar?: "right") => (
    <CabecalhoOrdenavel colKey={key} criterios={criterios} onAlternar={ord.alternar} alinhar={alinhar}>{ROTULOS[key]}</CabecalhoOrdenavel>
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="busca-placa" className="text-xs text-muted-foreground">Placa</Label>
          <Input id="busca-placa" value={placa} onChange={(e) => { setPlaca(e.target.value); setPagina(0); }} placeholder="Buscar placa" className="w-full sm:w-40" />
        </div>
        {filtroSelect("Regional", regional, setRegional, lista(opcoes.regionais))}
        {filtroSelect("Loja Pendência", loja, setLoja, lista(opcoes.lojas))}
        {filtroSelect("Responsável", responsavel, setResponsavel, lista(opcoes.responsaveis))}
        {filtroSelect("Classificação", classificacao, setClassificacao, lista(opcoes.classificacoes))}
        {filtroSelect("Pendente em", indicador, setIndicador, INDICADORES.map((i) => ({ v: i.id, l: i.label })))}
        <div className="flex items-center gap-2 pb-2">
          <Switch id="so-pendentes" checked={somentePendentes} onCheckedChange={(v) => { setSomentePendentes(v); setPagina(0); }} />
          <Label htmlFor="so-pendentes">Somente pendentes</Label>
        </div>
        <div className="ml-auto pb-2 text-sm text-muted-foreground">
          {filtrados.length} de {data.length} veículos · {data.filter((v) => v.pendente).length} com pendência
        </div>
      </Card>

      <ResumoOrdenacao criterios={criterios} rotulo={(k) => ROTULOS[k] ?? k} onInverter={ord.inverter} onRemover={ord.remover} onLimpar={ord.limpar} />

      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : error ? (
          <div className="p-6 text-destructive">Erro ao carregar: {(error as Error).message}</div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nenhum veículo encontrado. Importe o Estoque BI na tela de Importação.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{cab("placa")}</TableHead>
                <TableHead>{cab("modelo")}</TableHead>
                <TableHead>{cab("regional")}</TableHead>
                <TableHead>{cab("loja")}</TableHead>
                <TableHead>{cab("responsavel")}</TableHead>
                <TableHead>{cab("classificacao")}</TableHead>
                <TableHead className="text-right">{cab("dias", "right")}</TableHead>
                {INDICADORES.map((i) => <TableHead key={i.id}>{cab(i.id)}</TableHead>)}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.placa}</TableCell>
                  <TableCell className="max-w-48 truncate">{v.modelo}</TableCell>
                  <TableCell>{v.regional}</TableCell>
                  <TableCell>
                    <HoverCard openDelay={150}>
                      <HoverCardTrigger asChild>
                        <span tabIndex={0} className="cursor-help font-semibold underline decoration-dotted underline-offset-2">{v.loja.final || "—"}</span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-72 text-xs space-y-1">
                        <p className="font-semibold text-sm">Resolução da loja</p>
                        <p><span className="text-muted-foreground">Loja Estoque:</span> {v.loja.bruta || "—"}</p>
                        <p><span className="text-muted-foreground">Loja Direcionamento:</span> {v.loja.direcionada || "—"}</p>
                        <p><span className="text-muted-foreground">Loja Agrupamento:</span> {v.loja.final || "—"}</p>
                        <p><span className="text-muted-foreground">Loja Pendência:</span> <strong>{v.loja.final || "—"}</strong></p>
                      </HoverCardContent>
                    </HoverCard>
                  </TableCell>
                  <TableCell>{v.responsavel ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{v.classificacao ?? "—"}</TableCell>
                  <TableCell className="text-right">{v.dias_em_estoque ?? "—"}</TableCell>
                  {INDICADORES.map((i) => (
                    <TableCell key={i.id}>
                      <IndicadorBadge label={i.label} status={v.indicadores[i.id].status} motivo={v.indicadores[i.id].motivo} compacto />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Link to="/preparacao-anuncios/$placa" params={{ placa: v.placa }} className="inline-flex items-center gap-1 text-sm text-primary hover:underline" aria-label={`Abrir ${v.placa}`}>
                      Abrir <ArrowRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3 p-3 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button>
            Página {paginaAtual + 1} de {totalPaginas}
            <Button variant="outline" size="sm" disabled={paginaAtual >= totalPaginas - 1} onClick={() => setPagina(paginaAtual + 1)} aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </Card>
    </div>
  );
}
