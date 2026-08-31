import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAcoesMatriz,
  getFaixas,
  getRegras,
  getVeiculos,
  marcarAcaoMatriz,
} from "@/lib/estoque";
import { ACOES_MATRIZ, veiculoFotografado, type TipoAcaoMatriz } from "@/lib/estoque-motor";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/acoes-leads")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Ações da Matriz — Análise de Estoque Matriz" },
      {
        name: "description",
        content:
          "Veículos com ações operacionais ativas na matriz de regras: aceleradores, fotos da avaliação, repescagem de leads e auditoria de anúncio.",
      },
      { property: "og:title", content: "Ações da Matriz — Análise de Estoque Matriz" },
      {
        property: "og:description",
        content: "Acompanhamento operacional das ações configuradas na matriz de regras.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcoesMatriz,
});

const TODOS = "__todos__";

interface LinhaAcao {
  veiculoId: string;
  modelo: string;
  chassi: string;
  loja: string;
  classificacao: string;
  faixa: string;
  tipo: TipoAcaoMatriz;
  acao: string;
  concluido: boolean;
  observacao: string;
}

function AcoesMatriz() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<string>(TODOS);

  const { data: veiculos = [] } = useQuery({
    queryKey: ["estoque", "veiculos", "ativos"],
    queryFn: () => getVeiculos({ repasse: false }),
  });
  const { data: regras = [] } = useQuery({ queryKey: ["estoque", "regras"], queryFn: getRegras });
  const { data: faixas = [] } = useQuery({ queryKey: ["estoque", "faixas"], queryFn: getFaixas });
  const { data: acoes = [] } = useQuery({
    queryKey: ["estoque", "acoes-matriz"],
    queryFn: getAcoesMatriz,
  });

  const concluidoPor = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const a of acoes) m.set(`${a.veiculo_id}:${a.tipo_acao}`, a.concluido);
    return m;
  }, [acoes]);

  /** Um veículo entra na lista para cada ação ativa na célula da matriz dele. */
  const linhas = useMemo<LinhaAcao[]>(() => {
    const out: LinhaAcao[] = [];
    for (const v of veiculos) {
      const regra = regras.find(
        (r) => r.ativo && r.classificacao === v.classificacao && r.faixa_id === v.faixa_id_atual,
      );
      if (!regra) continue;
      const faixa = faixas.find((f) => f.id === v.faixa_id_atual)?.nome ?? "—";
      for (const a of ACOES_MATRIZ) {
        if (!regra[a.campo]) continue;
        if (a.tipo === "fotos_ia" && veiculoFotografado(v.fotos_qtd, regra)) continue;
        out.push({
          veiculoId: v.id,
          modelo: v.modelo ?? "—",
          chassi: v.chassi,
          loja: v.loja ?? "—",
          classificacao: v.classificacao ?? "—",
          faixa,
          tipo: a.tipo,
          acao: a.label,
          concluido: concluidoPor.get(`${v.id}:${a.tipo}`) ?? false,
          observacao:
            a.tipo === "fotos_ia"
              ? `${v.fotos_qtd ?? 0} foto(s) — mínimo ${regra.min_fotos ?? 2}`
              : "",
        });
      }
    }
    return out;
  }, [veiculos, regras, faixas, concluidoPor]);

  const filtradas = useMemo(
    () => (filtro === TODOS ? linhas : linhas.filter((l) => l.tipo === filtro)),
    [linhas, filtro],
  );

  const alternar = async (l: LinhaAcao, concluido: boolean) => {
    try {
      await marcarAcaoMatriz(l.veiculoId, l.tipo, concluido);
      await qc.invalidateQueries({ queryKey: ["estoque", "acoes-matriz"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar a ação");
    }
  };

  const exportar = async () => {
    if (filtradas.length === 0) return toast.error("Nenhuma ação para exportar.");
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        filtradas.map((l) => ({
          Ação: l.acao,
          Modelo: l.modelo,
          Chassi: l.chassi,
          Loja: l.loja,
          Classificação: l.classificacao,
          Faixa: l.faixa,
          Observação: l.observacao,
          Realizada: l.concluido ? "Sim" : "Não",
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ações da Matriz");
      XLSX.writeFile(wb, `acoes-matriz-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${filtradas.length} ações exportadas.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar.");
    }
  };

  return (
    <div className="p-6 space-y-4 w-full">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" /> Ações da Matriz
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Veículos listados automaticamente conforme as ações operacionais ativas na célula
          (classificação × faixa) da matriz de regras.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Tipo de ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as ações</SelectItem>
            {ACOES_MATRIZ.map((a) => (
              <SelectItem key={a.tipo} value={a.tipo}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto" onClick={() => void exportar()}>
          <Download className="w-4 h-4" />
          Exportar ({filtradas.length})
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium w-10">Feito</th>
              <th className="px-3 py-2 font-medium">Ação</th>
              <th className="px-3 py-2 font-medium">Veículo</th>
              <th className="px-3 py-2 font-medium">Chassi</th>
              <th className="px-3 py-2 font-medium">Class.</th>
              <th className="px-3 py-2 font-medium">Faixa</th>
              <th className="px-3 py-2 font-medium">Observação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhuma ação ativa para os veículos atuais.
                </td>
              </tr>
            )}
            {filtradas.map((l) => (
              <tr key={`${l.veiculoId}:${l.tipo}`} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2">
                  <Checkbox
                    checked={l.concluido}
                    onCheckedChange={(c) => void alternar(l, c === true)}
                  />
                </td>
                <td className="px-3 py-2">{l.acao}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{l.modelo}</div>
                  <div className="text-xs text-muted-foreground">{l.loja}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{l.chassi}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary">{l.classificacao}</Badge>
                </td>
                <td className="px-3 py-2">{l.faixa}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{l.observacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtradas.length} de {linhas.length} ações
      </p>
    </div>
  );
}
