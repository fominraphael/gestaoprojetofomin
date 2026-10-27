import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface LinhaMapeamento { id: string; de: string; para: string; extra?: string }

export interface TabelaMapeamentoProps {
  rotuloDe: string;
  rotuloPara: string;
  linhas: LinhaMapeamento[];
  sugestoesDe?: string[];
  /** Quando informado, o destino vira uma lista fechada (ex.: usuários com acesso ao módulo). */
  opcoesPara?: string[];
  /** Lista fechada com busca para os dois lados (ex.: cadastro mestre de lojas). */
  opcoesBusca?: string[];
  onAdicionar: (de: string, para: string) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
  /** Campo extra opcional exibido antes do "de" (ex.: tipo loja/regional). */
  extra?: React.ReactNode;
}

/** Select com busca por nome, restrito às opções informadas. */
function SeletorBusca({ valor, onChange, opcoes, rotulo }: { valor: string; onChange: (v: string) => void; opcoes: string[]; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={aberto} aria-label={rotulo} className="w-full sm:w-64 justify-between font-normal">
          <span className={cn("truncate", !valor && "text-muted-foreground")}>{valor || rotulo}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar loja…" />
          <CommandList>
            <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => (
                <CommandItem key={o} value={o} onSelect={() => { onChange(o); setAberto(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", valor === o ? "opacity-100" : "opacity-0")} />
                  {o}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Tabela genérica N:1 (origem → destino) com inclusão e remoção. */
export function TabelaMapeamento({ rotuloDe, rotuloPara, linhas, sugestoesDe = [], opcoesPara, opcoesBusca, onAdicionar, onRemover, extra }: TabelaMapeamentoProps) {
  const [de, setDe] = useState("");
  const [para, setPara] = useState("");
  const idLista = `sug-${rotuloDe.replace(/\W/g, "")}`;
  const adicionar = async () => {
    if (!de.trim() || !para.trim()) return;
    await onAdicionar(de.trim().toUpperCase(), para.trim().toUpperCase());
    setDe("");
    setPara("");
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {opcoesBusca ? (
          <SeletorBusca valor={de} onChange={setDe} opcoes={opcoesBusca} rotulo={rotuloDe} />
        ) : (
          <>
            <Input list={idLista} value={de} onChange={(e) => setDe(e.target.value)} placeholder={rotuloDe} className="w-full sm:w-64" aria-label={rotuloDe} />
            <datalist id={idLista}>{sugestoesDe.map((s) => <option key={s} value={s} />)}</datalist>
          </>
        )}
        <span className="text-muted-foreground">→</span>
        {opcoesBusca ? (
          <SeletorBusca valor={para} onChange={setPara} opcoes={opcoesBusca} rotulo={rotuloPara} />
        ) : opcoesPara ? (
          <Select value={para} onValueChange={setPara}>
            <SelectTrigger className="w-full sm:w-64" aria-label={rotuloPara}><SelectValue placeholder={opcoesPara.length ? rotuloPara : "Nenhum usuário com acesso ao módulo"} /></SelectTrigger>
            <SelectContent>{opcoesPara.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <Input value={para} onChange={(e) => setPara(e.target.value)} placeholder={rotuloPara} className="w-full sm:w-64" aria-label={rotuloPara} />
        )}
        <Button size="sm" onClick={adicionar}><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>
      <Table>
        <TableHeader><TableRow>{linhas.some((l) => l.extra) && <TableHead>Tipo</TableHead>}<TableHead>{rotuloDe}</TableHead><TableHead>{rotuloPara}</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.id}>
              {l.extra && <TableCell className="capitalize">{l.extra}</TableCell>}
              <TableCell>{l.de}</TableCell>
              <TableCell>{l.para}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onRemover(l.id)} aria-label="Remover"><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {linhas.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum cadastro.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
