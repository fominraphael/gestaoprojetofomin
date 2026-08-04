import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Kpi, KpiHistorico } from "@/lib/rotina";

interface KpiCardProps {
  kpi: Kpi;
  historico: KpiHistorico[];
}

export function KpiCard({ kpi, historico }: KpiCardProps) {
  const sorted = [...historico].sort((a, b) => a.mes.localeCompare(b.mes));
  const lastTwo = sorted.slice(-2);

  let trend: "up" | "down" | "flat" = "flat";
  if (lastTwo.length === 2) {
    if (lastTwo[1].valor > lastTwo[0].valor) trend = "up";
    else if (lastTwo[1].valor < lastTwo[0].valor) trend = "down";
  }

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-red-500"
        : "text-muted-foreground";

  const formatValor = (v: number) => {
    if (kpi.unidade === "%") return `${v.toFixed(1)}%`;
    if (kpi.unidade === "R$") return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
    return `${v.toLocaleString("pt-BR")}${kpi.unidade ? ` ${kpi.unidade}` : ""}`;
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{kpi.nome}</p>
          <p className="text-2xl font-bold">{formatValor(kpi.valor_atual)}</p>
        </div>
        <div className={`p-2 rounded-md bg-muted ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="flex gap-1 items-end h-10">
          {sorted.map((h) => {
            const max = Math.max(...sorted.map((x) => Math.abs(x.valor)), 1);
            const pct = Math.max((Math.abs(h.valor) / max) * 100, 4);
            return (
              <div
                key={h.mes}
                className="flex-1 rounded-sm bg-primary/20 min-h-[2px]"
                style={{ height: `${pct}%` }}
                title={`${h.mes}: ${formatValor(h.valor)}`}
              />
            );
          })}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{sorted[0].mes}</span>
          <span>{sorted[sorted.length - 1].mes}</span>
        </div>
      )}
    </Card>
  );
}
