import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import {
  ValidacaoRevisao,
  type RevisaoValidacao,
} from "@/components/toyota/ValidacaoRevisao";
import {
  ValidacaoHealthCheck,
  type HealthCheckValidacao,
} from "@/components/toyota/ValidacaoHealthCheck";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/validacao")({
  component: ValidacaoTecnicaPage,
  errorComponent: ModuleErrorBoundary,
});

function ValidacaoTecnicaPage() {
  const [revisao, setRevisao] = useState<RevisaoValidacao>({
    dentroCronograma: true,
  });
  const [healthCheck, setHealthCheck] = useState<HealthCheckValidacao>({
    status: "pendente",
  });

  // Chassi de exemplo — em uso real virá do veículo selecionado
  const chassiEsperado = "9BRBLWHE3K0123456";

  const podeSalvar =
    healthCheck.status === "aprovado" || healthCheck.status === "recusado";

  const salvar = () => {
    toast.success("Validação técnica registrada.");
    // TODO: persistir em toyota_estoque_veiculos / tabela de validações
    console.log({ revisao, healthCheck });
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2">
          <ClipboardCheck className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Validação Técnica</h1>
          <p className="text-sm text-muted-foreground">
            Revisão mecânica e Health Check do veículo —{" "}
            <span className="font-mono">{chassiEsperado}</span>
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <ValidacaoRevisao value={revisao} onChange={setRevisao} />
        <ValidacaoHealthCheck
          chassiEsperado={chassiEsperado}
          value={healthCheck}
          onChange={setHealthCheck}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={!podeSalvar}>
          Salvar Validação
        </Button>
      </div>
    </div>
  );
}
