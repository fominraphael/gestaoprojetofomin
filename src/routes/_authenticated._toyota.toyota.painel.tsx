import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Loader2,
  CheckCircle2,
  Wrench,
  Building2,
  ShieldCheck,
  Send,
  Award,
  XCircle,
  Archive,
} from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/painel")({
  errorComponent: ModuleErrorBoundary,
  component: Dashboard,
});

interface VeiculoRow {
  status_aprovacao: string | null;
  aprovado_em: string | null;
  enviado_toyota_em: string | null;
  retorno_toyota_em: string | null;
}

/** Gera opções de mês/ano dos últimos 12 meses + próximos 2. */
function gerarOpcoesMes(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const hoje = new Date();
  for (let i = -12; i <= 0; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const label = d
      .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      .replace(/^./, (c) => c.toUpperCase());
    opts.push({ value: `${y}-${m}`, label });
  }
  return opts.reverse();
}

function mesAtualKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function faixaDoMes(key: string): { inicio: Date; fim: Date } {
  const [y, m] = key.split("-").map(Number);
  return {
    inicio: new Date(y, m - 1, 1, 0, 0, 0, 0),
    fim: new Date(y, m, 1, 0, 0, 0, 0),
  };
}

function Dashboard() {
  const [rows, setRows] = useState<VeiculoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState<string>(mesAtualKey());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("toyota_estoque_veiculos")
        .select(
          "status_aprovacao,aprovado_em,enviado_toyota_em,retorno_toyota_em",
        );
      if (error) toast.error(`Falha ao carregar dashboard: ${error.message}`);
      setRows((data ?? []) as VeiculoRow[]);
      setLoading(false);
    })();
  }, []);

  const opcoesMes = useMemo(() => gerarOpcoesMes(), []);

  const contagens = useMemo(() => {
    const { inicio, fim } = faixaDoMes(mes);
    const dentroMes = (iso: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d >= inicio && d < fim;
    };

    const finalizados = new Set(["certificado_toyota", "arquivado", "reprovado_admin"]);

    const solicitados = rows.filter((r) => dentroMes(r.aprovado_em)).length;

    const preparador = rows.filter((r) =>
      ["pendente_preparacao", "devolvido_preparador"].includes(r.status_aprovacao ?? ""),
    ).length;

    const posVendas = rows.filter((r) => r.status_aprovacao === "em_posvendas").length;

    const analiseCentral = rows.filter((r) =>
      ["analise", "aguardando_analise_central"].includes(r.status_aprovacao ?? ""),
    ).length;

    // Enviados: dossiê enviado, ainda aguardando retorno / não finalizado
    const enviadosToyota = rows.filter(
      (r) =>
        !!r.enviado_toyota_em &&
        !finalizados.has(r.status_aprovacao ?? "") &&
        r.status_aprovacao !== "analise", // retornos recusados já viram Análise Central
    ).length;

    return { solicitados, preparador, posVendas, analiseCentral, enviadosToyota };
  }, [rows, mes]);

  return (
    <div className="container mx-auto px-6 py-8 max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2">
            <LayoutDashboard className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Visão consolidada do funil de certificação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mês:</span>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcoesMes.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            titulo="Solicitados"
            valor={contagens.solicitados}
            icone={CheckCircle2}
            cor="text-emerald-600"
            legenda="Aprovados na Análise de Elegibilidade neste mês"
          />
          <StatCard
            titulo="Preparador"
            valor={contagens.preparador}
            icone={Wrench}
            cor="text-amber-600"
            legenda="Parados no Preparador agora"
          />
          <StatCard
            titulo="Pós-Vendas"
            valor={contagens.posVendas}
            icone={Building2}
            cor="text-blue-600"
            legenda="Na fila do Pós-Vendas agora"
          />
          <StatCard
            titulo="Análise Central"
            valor={contagens.analiseCentral}
            icone={ShieldCheck}
            cor="text-indigo-600"
            legenda="Aguardando análise / retornos Toyota"
          />
          <StatCard
            titulo="Enviados Toyota"
            valor={contagens.enviadosToyota}
            icone={Send}
            cor="text-slate-700"
            legenda="Dossiê enviado, aguardando retorno"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  titulo,
  valor,
  icone: Icone,
  cor,
  legenda,
}: {
  titulo: string;
  valor: number;
  icone: typeof LayoutDashboard;
  cor: string;
  legenda: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{titulo}</span>
          <Icone className={`w-5 h-5 ${cor}`} />
        </div>
        <div className="text-3xl font-semibold tabular-nums">{valor}</div>
        <p className="text-xs text-muted-foreground leading-snug">{legenda}</p>
      </CardContent>
    </Card>
  );
}
