import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { carregarCadastroDashboard } from "@/lib/prep-dashboard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function GestoresConfig() {
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({ queryKey: ["prep", "gestores-cadastro"], queryFn: carregarCadastroDashboard });
  const [loja, setLoja] = useState(""); const [gestor, setGestor] = useState("");
  const salvar = useMutation({ mutationFn: async () => {
    const { error } = await supabase.from("prep_gestor_regional").upsert({ loja, gestor: gestor.trim(), updated_at: new Date().toISOString() }, { onConflict: "loja" });
    if (error) throw error;
  }, onSuccess: () => { toast.success("Gestor salvo."); setLoja(""); setGestor(""); qc.invalidateQueries({ queryKey: ["prep"] }); }, onError: () => toast.error("Não foi possível salvar o gestor.") });
  const remover = useMutation({ mutationFn: async (id: string) => {
    const { error } = await supabase.from("prep_gestor_regional").delete().eq("id", id); if (error) throw error;
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ["prep"] }), onError: () => toast.error("Não foi possível remover o vínculo.") });
  if (isPending) return <p role="status">Carregando gestores…</p>;
  if (error) return <p role="alert">Não foi possível carregar os gestores.</p>;
  const lojas = [...new Set([...(data?.lojas.map(l => l.loja) ?? []), ...(data?.gestores.map(g => g.loja) ?? [])])].sort();
  return <section className="space-y-4">
    <h2 className="font-semibold">Gestor Regional</h2>
    <div className="flex flex-wrap gap-2">
      <Select value={loja} onValueChange={v => { setLoja(v); setGestor(data?.gestores.find(g => g.loja === v)?.gestor ?? ""); }}>
        <SelectTrigger className="w-full sm:w-80" aria-label="Loja do gestor"><SelectValue placeholder="Loja" /></SelectTrigger>
        <SelectContent>{lojas.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
      </Select>
      <Input className="w-full sm:w-64" aria-label="Nome do gestor regional" placeholder="Gestor Regional" value={gestor} onChange={e => setGestor(e.target.value)} />
      <Button disabled={!loja || !gestor.trim() || salvar.isPending} onClick={() => salvar.mutate()}><Save className="h-4 w-4" />Salvar</Button>
    </div>
    <Table><TableHeader><TableRow><TableHead>Loja</TableHead><TableHead>Gestor Regional</TableHead><TableHead /></TableRow></TableHeader>
      <TableBody>{data?.gestores.map(g => <TableRow key={g.id}><TableCell>{g.loja}</TableCell><TableCell>{g.gestor}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" aria-label={`Remover gestor de ${g.loja}`} disabled={remover.isPending} onClick={() => remover.mutate(g.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
    </Table>
  </section>;
}