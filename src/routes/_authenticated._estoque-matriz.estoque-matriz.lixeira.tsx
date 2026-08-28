import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { VeiculosTable } from "@/components/estoque/VeiculosTable";
import {
  excluirDefinitivo,
  getAnuncios,
  getEmpresasNbs,
  getFaixas,
  getOrigens,
  getUltimoHistorico,
  getVeiculos,
  restaurarVeiculo,
} from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/lixeira")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Lixeira — Análise de Estoque Matriz" },
      {
        name: "description",
        content: "Veículos excluídos do estoque, com opção de restaurar ou excluir definitivamente.",
      },
      { property: "og:title", content: "Lixeira — Análise de Estoque Matriz" },
      { property: "og:description", content: "Restaure ou exclua definitivamente veículos removidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstoqueLixeira,
});

function EstoqueLixeira() {
  const qc = useQueryClient();
  const { data: veiculos = [] } = useQuery({
    queryKey: ["estoque", "veiculos", "lixeira"],
    queryFn: () => getVeiculos({ lixeira: true }),
  });
  const { data: origens = [] } = useQuery({ queryKey: ["estoque", "origens"], queryFn: getOrigens });
  const { data: empresas = [] } = useQuery({ queryKey: ["estoque", "nbs"], queryFn: getEmpresasNbs });
  const { data: faixas = [] } = useQuery({ queryKey: ["estoque", "faixas"], queryFn: getFaixas });
  const { data: anuncios = [] } = useQuery({ queryKey: ["estoque", "anuncios"], queryFn: getAnuncios });
  const { data: historico = new Map() } = useQuery({
    queryKey: ["estoque", "historico", "lixeira", veiculos.map((v) => v.id).join(",")],
    queryFn: () => getUltimoHistorico(veiculos.map((v) => v.id)),
    enabled: veiculos.length > 0,
  });

  const acao = async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      await qc.invalidateQueries({ queryKey: ["estoque", "veiculos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na operação");
    }
  };

  return (
    <div className="p-6 space-y-4 w-full">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-primary" /> Lixeira
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Veículos excluídos. A exclusão definitiva é manual e não tem volta.
        </p>
      </div>
      <VeiculosTable
        veiculos={veiculos}
        origens={origens}
        empresas={empresas}
        faixas={faixas}
        anuncios={anuncios}
        historico={historico}
        modo="lixeira"
        onRestaurar={(v) => acao(() => restaurarVeiculo(v.id), "Veículo restaurado.")}
        onExcluirDefinitivo={(v) =>
          acao(() => excluirDefinitivo(v.id), "Veículo excluído definitivamente.")
        }
      />
    </div>
  );
}
