import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  placa: string;
  loja: string;
  classificacao: string;
  faixa: string;
  faixaId: string | null;
  tipo: TipoAcaoMatriz;
  acao: string;
  concluido: boolean;
  observacao: string;
}

function AcoesMatriz() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<string>(TODOS);
  const [filtroLoja, setFiltroLoja] = useState<string>(TODOS);
  const [buscaPlaca, setBuscaPlaca] = useState("");
  const [buscaChassi, setBuscaChassi] = useState("");
  const [aba, setAba] = useState<"pendentes" | "realizadas">("pendentes");

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

  /**
   * Uma ação só continua "realizada" enquanto o veículo permanecer na mesma
   * faixa de dias em que foi concluída. Mudou de faixa → volta para "A Fazer".
   */
  const registroPor = useMemo(() => {
    const m = new Map<string, { concluido: boolean; faixaId: string | null }>();
    for (const a of acoes)
      m.set(`${a.veiculo_id}:${a.tipo_acao}`, {
        concluido: a.concluido,
        faixaId: a.faixa_id ?? null,
      });
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
        // Repescagem de leads só faz sentido quando o veículo tem leads.
        if (a.tipo === "repescagem" && (v.leads_60_dias ?? 0) <= 0) continue;

        const reg = registroPor.get(`${v.id}:${a.tipo}`);
        const concluido =
          !!reg?.concluido && (reg.faixaId ?? null) === (v.faixa_id_atual ?? null);

        out.push({
          veiculoId: v.id,
          modelo: v.modelo ?? "—",
          chassi: v.chassi,
          placa: v.placa ?? "—",
          loja: v.loja ?? "—",
          classificacao: v.classificacao ?? "—",
          faixa,
          faixaId: v.faixa_id_atual ?? null,
          tipo: a.tipo,
          acao: a.label,
          concluido,
          observacao:
            a.tipo === "fotos_ia"
              ? `${v.fotos_qtd ?? 0} foto(s) — mínimo ${regra.min_fotos ?? 2}`
              : a.tipo === "repescagem"
                ? `${v.leads_60_dias ?? 0} lead(s) em 60 dias`
                : "",
        });
      }
    }
    return out;
  }, [veiculos, regras, faixas, registroPor]);

  const lojas = useMemo(
    () => Array.from(new Set(linhas.map((l) => l.loja).filter((l) => l && l !== "—"))).sort(),
    [linhas],
  );

  const filtradasBase = useMemo(() => {
    const placa = buscaPlaca.trim().toLowerCase();
    const chassi = buscaChassi.trim().toLowerCase();
    return linhas.filter((l) => {
      if (filtro !== TODOS && l.tipo !== filtro) return false;
      if (filtroLoja !== TODOS && l.loja !== filtroLoja) return false;
      if (placa && !l.placa.toLowerCase().includes(placa)) return false;
      if (chassi && !l.chassi.toLowerCase().includes(chassi)) return false;
      return true;
    });
  }, [linhas, filtro, filtroLoja, buscaPlaca, buscaChassi]);

  const pendentes = useMemo(() => filtradasBase.filter((l) => !l.concluido), [filtradasBase]);
  const realizadas = useMemo(() => filtradasBase.filter((l) => l.concluido), [filtradasBase]);
  const visiveis = aba === "pendentes" ? pendentes : realizadas;

  const alternar = async (l: LinhaAcao, concluido: boolean) => {
    try {
      await marcarAcaoMatriz(l.veiculoId, l.tipo, concluido, l.faixaId);
      await qc.invalidateQueries({ queryKey: ["estoque", "acoes-matriz"] });
      toast.success(concluido ? "Ação movida para Realizadas." : "Ação restaurada para A Fazer.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar a ação");
    }
  };

  const exportar = async () => {
    if (visiveis.length === 0) return toast.error("Nenhuma ação para exportar.");
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        visiveis.map((l) => ({
          Ação: l.acao,
          Modelo: l.modelo,
          Placa: l.placa,
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
      toast.success(`${visiveis.length} ações exportadas.`);
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

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-[220px]">
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

        <Select value={filtroLoja} onValueChange={setFiltroLoja}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as lojas</SelectItem>
            {lojas.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={buscaPlaca}
          onChange={(e) => setBuscaPlaca(e.target.value)}
          placeholder="Placa"
          className="w-[140px]"
        />
        <Input
          value={buscaChassi}
          onChange={(e) => setBuscaChassi(e.target.value)}
          placeholder="Chassi"
          className="w-[200px]"
        />

        <Button variant="outline" className="ml-auto" onClick={() => void exportar()}>
          <Download className="w-4 h-4" />
          Exportar ({visiveis.length})
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={aba === "pendentes" ? "default" : "outline"}
          size="sm"
          onClick={() => setAba("pendentes")}
        >
          A Fazer ({pendentes.length})
        </Button>
        <Button
          variant={aba === "realizadas" ? "default" : "outline"}
          size="sm"
          onClick={() => setAba("realizadas")}
        >
          Realizadas ({realizadas.length})
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium w-10">Feito</th>
              <th className="px-3 py-2 font-medium">Ação</th>
              <th className="px-3 py-2 font-medium">Veículo</th>
              <th className="px-3 py-2 font-medium">Placa</th>
              <th className="px-3 py-2 font-medium">Chassi</th>
              <th className="px-3 py-2 font-medium">Class.</th>
              <th className="px-3 py-2 font-medium">Faixa</th>
              <th className="px-3 py-2 font-medium">Observação</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  {aba === "pendentes"
                    ? "Nenhuma ação pendente para os filtros atuais."
                    : "Nenhuma ação realizada para os filtros atuais."}
                </td>
              </tr>
            )}
            {visiveis.map((l) => (
              <tr
                key={`${l.veiculoId}:${l.tipo}`}
                className="border-t border-border hover:bg-muted/30"
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={l.concluido}
                    onCheckedChange={(c) => void alternar(l, c === true)}
                    title={l.concluido ? "Restaurar para A Fazer" : "Marcar como realizada"}
                  />
                </td>
                <td className="px-3 py-2">{l.acao}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{l.modelo}</div>
                  <div className="text-xs text-muted-foreground">{l.loja}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{l.placa}</td>
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
        {visiveis.length} de {linhas.length} ações
      </p>
    </div>
  );
}

