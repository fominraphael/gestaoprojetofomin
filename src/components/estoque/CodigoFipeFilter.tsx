import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface CodigoFipeFilterProps {
  opcoes: string[];
  valor: string | null;
  onChange: (valor: string | null) => void;
}

export function CodigoFipeFilter({ opcoes, valor, onChange }: CodigoFipeFilterProps) {
  const [aberto, setAberto] = useState(false);
  const selecionar = (codigo: string | null) => {
    onChange(codigo);
    setAberto(false);
  };
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={aberto} aria-label="Filtrar por código FIPE" className="w-[200px] justify-between">
          <span className="truncate">{valor ?? "Código FIPE"}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar código FIPE…" />
          <CommandList>
            <CommandEmpty>Nenhum código FIPE encontrado.</CommandEmpty>
            <CommandGroup>
              {opcoes.map((codigo) => (
                <CommandItem key={codigo} value={codigo} onSelect={() => selecionar(codigo)}>
                  <Check className={cn("w-4 h-4", valor === codigo ? "opacity-100" : "opacity-0")} />
                  {codigo}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {valor !== null && (
          <div className="border-t border-border p-1">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => selecionar(null)}>Limpar seleção</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}