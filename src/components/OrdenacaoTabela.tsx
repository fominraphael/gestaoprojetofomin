import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { alternarCriterio, type CriterioOrdem } from "@/lib/ordenacao";

/** Estado de ordenação persistido durante a sessão do navegador, por tabela. */
export function useOrdenacao(idTabela: string) {
  const chave = `ordenacao:${idTabela}`;
  const [criterios, setCriterios] = useState<CriterioOrdem[]>([]);

  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(chave);
      if (salvo) setCriterios(JSON.parse(salvo) as CriterioOrdem[]);
    } catch {
      /* preferência inválida: ignora */
    }
  }, [chave]);

  const atualizar = useCallback(
    (novo: CriterioOrdem[]) => {
      setCriterios(novo);
      try {
        sessionStorage.setItem(chave, JSON.stringify(novo));
      } catch {
        /* armazenamento indisponível */
      }
    },
    [chave],
  );

  const alternar = useCallback(
    (key: string, multiplo: boolean) => atualizar(alternarCriterio(criterios, key, multiplo)),
    [criterios, atualizar],
  );
  const remover = useCallback(
    (key: string) => atualizar(criterios.filter((c) => c.key !== key)),
    [criterios, atualizar],
  );
  const limpar = useCallback(() => atualizar([]), [atualizar]);

  return { criterios, alternar, remover, limpar };
}

export interface CabecalhoOrdenavelProps {
  colKey: string;
  criterios: CriterioOrdem[];
  onAlternar: (key: string, multiplo: boolean) => void;
  alinhar?: "left" | "right";
  children: ReactNode;
}

/** Botão de cabeçalho: clique ordena; SHIFT + clique soma à ordenação múltipla. */
export function CabecalhoOrdenavel({
  colKey,
  criterios,
  onAlternar,
  alinhar = "left",
  children,
}: CabecalhoOrdenavelProps) {
  const idx = criterios.findIndex((c) => c.key === colKey);
  const crit = idx >= 0 ? criterios[idx] : undefined;
  return (
    <button
      type="button"
      onClick={(e) => onAlternar(colKey, e.shiftKey)}
      title="Clique para ordenar · SHIFT + clique para ordenar por várias colunas"
      aria-label={`Ordenar por ${typeof children === "string" ? children : colKey}`}
      className={cn(
        "inline-flex items-center gap-1 select-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
        alinhar === "right" && "flex-row-reverse",
        crit && "text-foreground",
      )}
    >
      <span>{children}</span>
      {crit ? (
        <span className="inline-flex items-center gap-0.5 text-primary">
          {crit.sentido === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {criterios.length > 1 && <span className="text-[10px] font-semibold">{idx + 1}º</span>}
        </span>
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

export interface ResumoOrdenacaoProps {
  criterios: CriterioOrdem[];
  rotulo: (key: string) => string;
  onAlternar: (key: string, multiplo: boolean) => void;
  onRemover: (key: string) => void;
  onLimpar: () => void;
}

/** Lista as colunas ordenadas com prioridade, permitindo inverter, remover e limpar. */
export function ResumoOrdenacao({ criterios, rotulo, onAlternar, onRemover, onLimpar }: ResumoOrdenacaoProps) {
  if (criterios.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>Ordenado por:</span>
      {criterios.map((c, i) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5">
          <span className="font-semibold text-foreground">{i + 1}º</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-foreground"
            title="Inverter sentido"
            onClick={() => onAlternar(c.key, true)}
          >
            {rotulo(c.key)}
            {c.sentido === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          </button>
          <button type="button" aria-label={`Remover ${rotulo(c.key)} da ordenação`} onClick={() => onRemover(c.key)}>
            <X className="w-3 h-3 hover:text-destructive" />
          </button>
        </span>
      ))}
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onLimpar}>
        Limpar ordenação
      </Button>
    </div>
  );
}
