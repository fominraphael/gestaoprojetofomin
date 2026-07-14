import { Shield, Layers, FileText, Landmark, Package } from "lucide-react";

const MODULE_CONFIGS: Record<string, { label: string; icon: any; color: string }> = {
  documentos: {
    label: "Documentos",
    icon: FileText,
    color: "bg-primary/10 border-primary/30 text-foreground",
  },
  gestao: {
    label: "Gestão",
    icon: Layers,
    color: "bg-primary/10 border-border/30 text-muted-foreground",
  },
  financeiro: {
    label: "Financeiro",
    icon: Landmark,
    color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  },
  estoque: {
    label: "Estoque",
    icon: Package,
    color: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  },
};

export function ModuleBadge({ moduleKey }: { moduleKey: string }) {
  const config = MODULE_CONFIGS[moduleKey.toLowerCase()] || {
    label: moduleKey,
    icon: Shield,
    color: "bg-slate-500/10 border-slate-500/30 text-slate-400",
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border backdrop-blur-sm ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
