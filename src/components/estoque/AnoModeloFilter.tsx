import { useSyncExternalStore } from "react";
import { CalendarRange, Check, ChevronsUpDown, X } from "lucide-react";
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

/** Seleção de anos modelo compartilhada entre os menus do módulo (sessionStorage). */
const CHAVE = "estoque-matriz:anos-modelo";
export const SEM_ANO = "Sem ano informado";
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
    /* mantém só em memória */
  }
  ouvintes.forEach((f) => f());
}

export function useAnosModeloSelecionados(): [string[], (v: string[]) => void] {
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

/**
 * Extrai o ano modelo: em "2022/2023" usa a segunda parte; em "2023" usa o próprio valor.
 * Retorna null quando não há ano válido.
 */
export function extrairAnoModelo(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const partes = String(valor).match(/\d{2,4}/g);
  if (!partes || partes.length === 0) return null;
  let n = Number(partes[partes.length - 1]);
  if (n < 100) n += 2000;
  return Number.isFinite(n) && n >= 1900 && n <= 2100 ? n : null;
}

const chaveAno = (valor: string | number | null | undefined) => {
  const a = extrairAnoModelo(valor);
  return a === null ? SEM_ANO : String(a);
};

/** Vazio = sem restrição. Vários anos = lógica OU. */
export function passaAnoModelo(valor: string | number | null | undefined, sel: string[]): boolean {
  if (sel.length === 0) return true;
  return sel.includes(chaveAno(valor));
}

/** Anos presentes nos dados, decrescentes; "Sem ano informado" no fim se houver. */
export function listarAnosModelo(valores: (string | number | null | undefined)[]): string[] {
  const set = new Set(valores.map(chaveAno));
  const anos = [...set].filter((a) => a !== SEM_ANO).sort((a, b) => Number(b) - Number(a));
  return set.has(SEM_ANO) ? [...anos, SEM_ANO] : anos;
}

export interface AnoModeloFilterProps {
  opcoes: string[];
  className?: string;
}

export function AnoModeloFilter({ opcoes, className }: AnoModeloFilterProps) {
  const [sel, setSel] = useAnosModeloSelecionados();
  const alternar = (a: string) => setSel(sel.includes(a) ? sel.filter((x) => x !== a) : [...sel, a]);
  const rotulo =
    sel.length === 0 ? "Todos os anos" : sel.length <= 2 ? sel.join(", ") : `${sel.length} anos selecionados`;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between" aria-label="Filtrar por ano modelo">
            <span className="flex items-center gap-2 truncate">
              <CalendarRange className="w-4 h-4 opacity-60" />
              {rotulo}
            </span>
            <ChevronsUpDown className="w-4 h-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Pesquisar ano…" />
            <CommandList>
              <CommandEmpty>Nenhum ano encontrado.</CommandEmpty>
              <CommandGroup>
                {opcoes.map((a) => (
                  <CommandItem key={a} value={a} onSelect={() => alternar(a)}>
                    <Check className={cn("w-4 h-4", sel.includes(a) ? "opacity-100" : "opacity-0")} />
                    {a}
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
      {sel.map((a) => (
        <Badge key={a} variant="secondary" className="gap-1">
          {a}
          <button
            type="button"
            aria-label={`Remover ${a}`}
            onClick={() => alternar(a)}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
