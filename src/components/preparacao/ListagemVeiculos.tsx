import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndicadorBadge } from "./IndicadorBadge";
import { INDICADORES, carregarVeiculosCalculados, normPlaca } from "@/lib/preparacao-anuncios";

const TODOS = "__todos__";

export function ListagemVeiculos({ ativos }: { ativos: boolean }) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["prep", "veiculos", ativos],
    queryFn: () => carregarVeiculosCalculados(ativos),
    staleTime: 60_000,
  });
  const [somentePendentes, setSomentePendentes] = useState(ativos);
  const [regional, setRegional] = useState(TODOS);
  const [loja, setLoja] = useState(TODOS);
  const [responsavel, setResponsavel] = useState(TODOS);
  const [placa, setPlaca] = useState("");

  const opcoes = useMemo(() => {
    const u = (xs: (string | null)[]) => Array.from(new Set(xs.filter(Boolean) as string[])).sort();
    return {
      regionais: u(data.map((v) => v.regional)),
      lojas: u(data.map((v) => v.loja.final)),
      responsaveis: u(data.map((v) => v.responsavel)),
    };
  }, [data]);

  const filtrados = useMemo(() => {
    const p = normPlaca(placa);
    return data.filter(
      (v) =>
        (!somentePendentes || v.pendente) &&
        (regional === TODOS || v.regional === regional) &&
        (loja === TODOS || v.loja.final === loja) &&
        (responsavel === TODOS || v.responsavel === responsavel) &&
        (!p || v.placa.includes(p)),
    );
  }, [data, somentePendentes, regional, loja, responsavel, placa]);

  const filtroSelect = (rotulo: string, valor: string, set: (v: string) => void, itens: string[]) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      <Select value={valor} onValueChange={set}>
        <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {itens.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="busca-placa" className="text-xs text-muted-foreground">Placa</Label>
          <Input id="busca-placa" value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="Buscar placa" className="w-full sm:w-40" />
        </div>
        {filtroSelect("Regional", regional, setRegional, opcoes.regionais)}
        {filtroSelect("Loja final", loja, setLoja, opcoes.lojas)}
        {filtroSelect("Responsável", responsavel, setResponsavel, opcoes.responsaveis)}
        <div className="flex items-center gap-2 pb-2">
          <Switch id="so-pendentes" checked={somentePendentes} onCheckedChange={setSomentePendentes} />
          <Label htmlFor="so-pendentes">Somente pendentes</Label>
        </div>
        <div className="ml-auto pb-2 text-sm text-muted-foreground">
          {filtrados.length} de {data.length} veículos · {data.filter((v) => v.pendente).length} com pendência
        </div>
      </Card>

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
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Regional</TableHead>
                <TableHead>Loja (bruta → direcionada → final)</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Dias</TableHead>
                <TableHead>Indicadores</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.slice(0, 500).map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.placa}</TableCell>
                  <TableCell className="max-w-48 truncate">{v.modelo}</TableCell>
                  <TableCell>{v.regional}</TableCell>
                  <TableCell className="text-xs">
                    <span className="text-muted-foreground">{v.loja.bruta || "—"}</span>
                    {" → "}<span className="text-muted-foreground">{v.loja.direcionada || "—"}</span>
                    {" → "}<span className="font-medium">{v.loja.final || "—"}</span>
                  </TableCell>
                  <TableCell>{v.responsavel ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">{v.dias_em_estoque ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {INDICADORES.map((i) => (
                        <IndicadorBadge key={i.id} label={i.label} status={v.indicadores[i.id].status} motivo={v.indicadores[i.id].motivo} compacto />
                      ))}
                    </div>
                  </TableCell>
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
        {filtrados.length > 500 && <div className="p-3 text-center text-xs text-muted-foreground">Mostrando os 500 primeiros. Use os filtros para refinar.</div>}
      </Card>
    </div>
  );
}
