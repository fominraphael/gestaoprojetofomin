import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { VeiculosTable } from "@/components/estoque/VeiculosTable";
import {
  getAnuncios,
  getEmpresasNbs,
  getFaixas,
  getOrigens,
  getUltimoHistorico,
  getVeiculos,
  moverParaLixeira,
  recalcularTodos,
} from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Veículos — Análise de Estoque Matriz" },
      {
        name: "description",
        content:
          "Listagem de veículos em estoque com classificação, faixa de dias, leads e valor de anúncio calculado.",
      },
      { property: "og:title", content: "Veículos — Análise de Estoque Matriz" },
      {
        property: "og:description",
        content: "Precificação automática de veículos em estoque por classificação e tempo em pátio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstoqueVeiculos,
});

function EstoqueVeiculos() {
  const qc = useQueryClient();
  const [recalculando, setRecalculando] = useState(false);

  const { data: veiculos = [] } = useQuery({
    queryKey: ["estoque", "veiculos", "ativos"],
    queryFn: () => getVeiculos({ repasse: false }),
  });
  const { data: origens = [] } = useQuery({ queryKey: ["estoque", "origens"], queryFn: getOrigens });
  const { data: empresas = [] } = useQuery({ queryKey: ["estoque", "nbs"], queryFn: getEmpresasNbs });
  const { data: faixas = [] } = useQuery({ queryKey: ["estoque", "faixas"], queryFn: getFaixas });
  const { data: anuncios = [] } = useQuery({ queryKey: ["estoque", "anuncios"], queryFn: getAnuncios });
  const { data: historico = new Map() } = useQuery({
    queryKey: ["estoque", "historico", veiculos.map((v) => v.id).join(",")],
    queryFn: () => getUltimoHistorico(veiculos.map((v) => v.id)),
    enabled: veiculos.length > 0,
  });

  const recalcular = async () => {
    setRecalculando(true);
    try {
      const r = await recalcularTodos();
      toast.success(
        `Recálculo concluído: ${r.alterados} valores atualizados, ${r.repasse} para repasse, ${r.tarefas} tarefas criadas.`,
      );
      await qc.invalidateQueries({ queryKey: ["estoque"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao recalcular");
    } finally {
      setRecalculando(false);
    }
  };

  const excluir = async (id: string) => {
    try {
      await moverParaLixeira(id);
      toast.success("Veículo movido para a lixeira.");
      await qc.invalidateQueries({ queryKey: ["estoque", "veiculos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  return (
    <div className="p-6 space-y-4 w-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Veículos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estoque unificado com precificação automática pela matriz de regras.
          </p>
        </div>
        <Button onClick={recalcular} disabled={recalculando}>
          <RefreshCw className={recalculando ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Recalcular preços
        </Button>
      </div>

      <VeiculosTable
        veiculos={veiculos}
        origens={origens}
        empresas={empresas}
        faixas={faixas}
        anuncios={anuncios}
        historico={historico}
        modo="ativo"
        onExcluir={(v) => excluir(v.id)}
      />
    </div>
  );
}
