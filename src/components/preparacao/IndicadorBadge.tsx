import { CheckCircle2, AlertTriangle, Clock, MinusCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusIndicador } from "@/lib/preparacao-anuncios";

const MAPA: Record<StatusIndicador, { cls: string; Icon: typeof CheckCircle2; texto: string }> = {
  pendente: { cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertTriangle, texto: "Pendente" },
  ok: { cls: "bg-primary/10 text-primary border-primary/30", Icon: CheckCircle2, texto: "OK" },
  aguardando: { cls: "bg-accent text-accent-foreground border-border", Icon: Clock, texto: "Aguardando" },
  revisar: { cls: "bg-muted text-foreground border-border", Icon: HelpCircle, texto: "Revisar" },
  desabilitado: { cls: "bg-muted text-muted-foreground border-border", Icon: MinusCircle, texto: "Desabilitado" },
};

export interface IndicadorBadgeProps {
  label: string;
  status: StatusIndicador;
  motivo?: string;
  compacto?: boolean;
}

export function IndicadorBadge({ label, status, motivo, compacto }: IndicadorBadgeProps) {
  const { cls, Icon, texto } = MAPA[status];
  return (
    <span
      title={motivo ? `${label}: ${motivo}` : `${label}: ${texto}`}
      className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium", cls)}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {compacto ? label : `${label} · ${texto}`}
    </span>
  );
}
