import { useSyncExternalStore } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Seleção de regionais compartilhada entre os menus do módulo, mantida na
 * sessão do navegador (sessionStorage) para persistir durante a navegação.
 */
const CHAVE = "estoque-matriz:regionais";
const ouvintes = new Set<() => void>();
let cache: string[] | null = null;
const VAZIO: string[] = [];

function ler(): string[] {
  if (typeof window === "undefined") return VAZIO;
  if (cache) return cache;
  try {
    const bruto = JSON.parse(window.sessionStorage.getItem(CHAVE) ?? "[]") as unknown;
    cache = Array.isArray(bruto) ? bruto.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function gravar(valor: string[]) {
  cache = valor;
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify(valor));
  } catch {
    /* armazenamento indisponível: mantém só em memória */
  }
  ouvintes.forEach((f) => f());
}

export function useRegionaisSelecionadas(): [string[], (v: string[]) => void] {
  const valor = useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    ler,
    () => VAZIO,
  );
  return [valor, gravar];
}

/** Normaliza o texto da regional para comparação. */
export const normRegional = (r: string | null | undefined) => (r ?? "").trim().toUpperCase();

/** Vazio = todas as regionais (sem restrição). */
export function passaRegional(regional: string | null | undefined, selecionadas: string[]): boolean {
  if (selecionadas.length === 0) return true;
  return selecionadas.includes(normRegional(regional) || "SEM REGIONAL");
}

/** Lista única e ordenada das regionais presentes nos dados. */
export function listarRegionais(valores: (string | null | undefined)[]): string[] {
  return Array.from(new Set(valores.map((r) => normRegional(r) || "SEM REGIONAL"))).sort();
}

export interface RegionalFilterProps {
  opcoes: string[];
  className?: string;
}

export function RegionalFilter({ opcoes, className }: RegionalFilterProps) {
  const [sel, setSel] = useRegionaisSelecionadas();
  const alternar = (r: string) => setSel(sel.includes(r) ? sel.filter((x) => x !== r) : [...sel, r]);

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between" aria-label="Filtrar por regional">
            <span className="truncate">
              {sel.length === 0 ? "Todas as regionais" : `${sel.length} regional(is)`}
            </span>
            <ChevronsUpDown className="w-4 h-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Pesquisar regional…" />
            <CommandList>
              <CommandEmpty>Nenhuma regional encontrada.</CommandEmpty>
              <CommandGroup>
                {opcoes.map((r) => (
                  <CommandItem key={r} value={r} onSelect={() => alternar(r)}>
                    <Check className={cn("w-4 h-4", sel.includes(r) ? "opacity-100" : "opacity-0")} />
                    {r}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          {sel.length > 0 && (
            <div className="border-t border-border p-1">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setSel([])}>
                Limpar seleção
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {sel.map((r) => (
        <Badge key={r} variant="secondary" className="gap-1">
          {r}
          <button
            type="button"
            aria-label={`Remover ${r}`}
            onClick={() => alternar(r)}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
