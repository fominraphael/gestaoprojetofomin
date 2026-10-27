import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BASES, importarBase, type TipoBase } from "@/lib/preparacao-anuncios";

export const Route = createFileRoute("/_authenticated/_preparacao-anuncios/preparacao-anuncios/importar")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Importação — Pendências Preparação/Anúncios" },
      { name: "description", content: "Importe as seis bases diárias: Estoque BI, OS, Banco de Fotos, Gosystem, TCUV e Auditoria." },
      { property: "og:title", content: "Importação — Preparação/Anúncios" },
      { property: "og:description", content: "Upload das planilhas do módulo de preparação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Importar,
});

async function lerPlanilha(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const aba = wb.SheetNames[0];
  if (!aba) throw new Error("Planilha vazia.");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[aba]!, { defval: null });
}

const TITULO = Object.fromEntries(BASES.map((b) => [b.tipo, b.titulo])) as Record<TipoBase, string>;

function Importar() {
  const qc = useQueryClient();
  const [processando, setProcessando] = useState<TipoBase | null>(null);
  const { data: logs = [] } = useQuery({
    queryKey: ["prep", "importacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prep_importacoes").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const processar = async (tipo: TipoBase, file: File) => {
    setProcessando(tipo);
    try {
      const linhas = await lerPlanilha(file);
      const r = await importarBase(tipo, file.name, linhas);
      toast.success(`${TITULO[tipo]}: ${r.validas} linhas importadas${r.ignoradas ? `, ${r.ignoradas} sem placa ignoradas` : ""}${r.inativadas ? `, ${r.inativadas} veículos inativados` : ""}${r.naoLocalizadas?.length ? `, ${r.naoLocalizadas.length} placas não localizadas no Estoque (ver Últimas importações)` : ""}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na importação.");
    } finally {
      setProcessando(null);
      await qc.invalidateQueries({ queryKey: ["prep"] });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importação de bases</h1>
        <p className="text-sm text-muted-foreground">Cada nova importação substitui a versão anterior daquela base. Arquivos .xlsx, .xls ou .csv.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BASES.map((b) => (
          <Card key={b.tipo} className="p-4 flex flex-col gap-3">
            <div>
              <h2 className="font-semibold">{b.titulo}</h2>
              <p className="text-sm text-muted-foreground">{b.descricao}</p>
            </div>
            <label className="mt-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 aria-disabled:opacity-50" aria-disabled={processando !== null}>
              {processando === b.tipo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {processando === b.tipo ? "Importando…" : "Enviar planilha"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={processando !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void processar(b.tipo, f);
                }}
              />
            </label>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <div className="p-4 font-semibold">Últimas importações</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead><TableHead>Base</TableHead><TableHead>Arquivo</TableHead>
              <TableHead>Usuário</TableHead><TableHead className="text-right">Linhas</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{TITULO[l.tipo as TipoBase] ?? l.tipo}</TableCell>
                <TableCell className="max-w-48 truncate">{l.arquivo_nome}</TableCell>
                <TableCell>{l.usuario_nome ?? "—"}</TableCell>
                <TableCell className="text-right">{l.total_validas}/{l.total_linhas}</TableCell>
                <TableCell>
                  <Badge variant={l.status === "erro" ? "destructive" : "secondary"} title={l.mensagem ?? ""}>{l.status === "erro" ? "Erro" : "Sucesso"}</Badge>
                  {l.mensagem && <span className="ml-2 text-xs text-muted-foreground">{l.mensagem}</span>}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma importação ainda.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
