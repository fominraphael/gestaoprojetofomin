import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { VeiculosTable } from "@/components/estoque/VeiculosTable";
import {
  getAnuncios,
  getEmpresasNbs,
  getFaixas,
  getOrigens,
  getUltimoHistorico,
  getVeiculos,
  moverParaLixeira,
} from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/repasse")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Repasse — Análise de Estoque Matriz" },
      {
        name: "description",
        content: "Veículos que atingiram a faixa de dias configurada para mudança de finalidade.",
      },
      { property: "og:title", content: "Repasse — Análise de Estoque Matriz" },
      { property: "og:description", content: "Veículos movidos automaticamente para repasse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstoqueRepasse,
});

function EstoqueRepasse() {
  const qc = useQueryClient();
  const { data: veiculos = [] } = useQuery({
    queryKey: ["estoque", "veiculos", "repasse"],
    queryFn: () => getVeiculos({ repasse: true }),
  });
  const { data: origens = [] } = useQuery({ queryKey: ["estoque", "origens"], queryFn: getOrigens });
  const { data: empresas = [] } = useQuery({ queryKey: ["estoque", "nbs"], queryFn: getEmpresasNbs });
  const { data: faixas = [] } = useQuery({ queryKey: ["estoque", "faixas"], queryFn: getFaixas });
  const { data: anuncios = [] } = useQuery({ queryKey: ["estoque", "anuncios"], queryFn: getAnuncios });
  const { data: historico = new Map() } = useQuery({
    queryKey: ["estoque", "historico", "repasse", veiculos.map((v) => v.id).join(",")],
    queryFn: () => getUltimoHistorico(veiculos.map((v) => v.id)),
    enabled: veiculos.length > 0,
  });

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
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" /> Repasse
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Veículos cuja finalidade foi alterada automaticamente pela matriz de regras.
        </p>
      </div>
      <VeiculosTable
        veiculos={veiculos}
        origens={origens}
        empresas={empresas}
        faixas={faixas}
        anuncios={anuncios}
        historico={historico}
        modo="repasse"
        onExcluir={(v) => excluir(v.id)}
      />
    </div>
  );
}
