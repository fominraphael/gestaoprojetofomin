import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface LinhaMapeamento { id: string; de: string; para: string; extra?: string }

export interface TabelaMapeamentoProps {
  rotuloDe: string;
  rotuloPara: string;
  linhas: LinhaMapeamento[];
  sugestoesDe?: string[];
  onAdicionar: (de: string, para: string) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
  /** Campo extra opcional exibido antes do "de" (ex.: tipo loja/regional). */
  extra?: React.ReactNode;
}

/** Tabela genérica N:1 (origem → destino) com inclusão e remoção. */
export function TabelaMapeamento({ rotuloDe, rotuloPara, linhas, sugestoesDe = [], onAdicionar, onRemover, extra }: TabelaMapeamentoProps) {
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
        <Input list={idLista} value={de} onChange={(e) => setDe(e.target.value)} placeholder={rotuloDe} className="w-full sm:w-64" aria-label={rotuloDe} />
        <datalist id={idLista}>{sugestoesDe.map((s) => <option key={s} value={s} />)}</datalist>
        <span className="text-muted-foreground">→</span>
        <Input value={para} onChange={(e) => setPara(e.target.value)} placeholder={rotuloPara} className="w-full sm:w-64" aria-label={rotuloPara} />
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
