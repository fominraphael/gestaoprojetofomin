import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { VeiculosTable } from "@/components/estoque/VeiculosTable";
import {
  getAnuncios,
  getEmpresasNbs,
  getFaixas,
  getOrigens,
  getRegras,
  getUltimoHistorico,
  getVendas,
  getVeiculos,
  moverParaLixeira,
  reativarVeiculo,
} from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/inativos")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Inativos — Análise de Estoque Matriz" },
      {
        name: "description",
        content:
          "Veículos inativados automaticamente por não constarem na última planilha de estoque importada.",
      },
      { property: "og:title", content: "Inativos — Análise de Estoque Matriz" },
      {
        property: "og:description",
        content: "Veículos ausentes da última importação de estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstoqueInativos,
});

function EstoqueInativos() {
  const qc = useQueryClient();
  const { data: veiculos = [] } = useQuery({
    queryKey: ["estoque", "veiculos", "inativos"],
    queryFn: () => getVeiculos({ inativos: true }),
  });
  const { data: origens = [] } = useQuery({ queryKey: ["estoque", "origens"], queryFn: getOrigens });
  const { data: empresas = [] } = useQuery({ queryKey: ["estoque", "nbs"], queryFn: getEmpresasNbs });
  const { data: faixas = [] } = useQuery({ queryKey: ["estoque", "faixas"], queryFn: getFaixas });
  const { data: anuncios = [] } = useQuery({ queryKey: ["estoque", "anuncios"], queryFn: getAnuncios });
  const { data: regras = [] } = useQuery({ queryKey: ["estoque", "regras"], queryFn: getRegras });
  const { data: vendas = [] } = useQuery({ queryKey: ["estoque", "vendas"], queryFn: getVendas });
  const { data: historico = new Map() } = useQuery({
    queryKey: ["estoque", "historico", "inativos", veiculos.map((v) => v.id).join(",")],
    queryFn: () => getUltimoHistorico(veiculos.map((v) => v.id)),
    enabled: veiculos.length > 0,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["estoque", "veiculos"] });

  const reativar = async (id: string) => {
    try {
      await reativarVeiculo(id);
      toast.success("Veículo reativado.");
      await invalidar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao reativar");
    }
  };

  const excluir = async (id: string) => {
    try {
      await moverParaLixeira(id);
      toast.success("Veículo movido para a lixeira.");
      await invalidar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  return (
    <div className="p-6 space-y-4 w-full">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <EyeOff className="w-5 h-5 text-primary" /> Inativos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Veículos que deixaram de constar na última planilha de estoque importada. Eles voltam
          automaticamente ao estoque se reaparecerem em uma nova importação, ou podem ser reativados
          manualmente.
        </p>
      </div>
      <VeiculosTable
        veiculos={veiculos}
        origens={origens}
        empresas={empresas}
        faixas={faixas}
        anuncios={anuncios}
        historico={historico}
        regras={regras}
        vendas={vendas}
        modo="inativos"
        onReativar={(v) => void reativar(v.id)}
        onExcluir={(v) => void excluir(v.id)}
        onAtualizado={invalidar}
      />
    </div>
  );
}
