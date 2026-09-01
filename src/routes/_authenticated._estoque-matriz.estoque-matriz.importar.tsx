import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

import {
  importarAnuncios,
  importarEstoque,
  importarVendas,
  registrarImportacao,
  recalcularTodos,
  uploadPlanilhaImportacao,
  getUrlPlanilhaImportacao,
  type RelatorioImportacao,
} from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/importar")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Importação — Análise de Estoque Matriz" },
      {
        name: "description",
        content: "Importe planilhas de estoque, vendas históricas e anúncios para alimentar a matriz.",
      },
      { property: "og:title", content: "Importação — Análise de Estoque Matriz" },
      { property: "og:description", content: "Importação de planilhas XLSX e CSV do estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstoqueImportar,
});

type Tipo = "estoque" | "vendas" | "anuncios";

const CARDS: { tipo: Tipo; titulo: string; descricao: string }[] = [
  {
    tipo: "estoque",
    titulo: "Estoque atual",
    descricao:
      "Unificado por Chassi + Origem + Chassi Resumido. Origens, Empresas NBS e Finalidades desconhecidas bloqueiam a linha.",
  },
  {
    tipo: "vendas",
    titulo: "Vendas históricas",
    descricao: "Base para o cálculo por média de vendas (30 e 60 dias) por código FIPE, ano e faixa de KM.",
  },
  {
    tipo: "anuncios",
    titulo: "Anúncios",
    descricao: "Canais Autoforce (Site Próprio), Olx e WebMotors por chassi.",
  },
];

async function lerPlanilha(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const nomeAba = wb.SheetNames[0];
  if (!nomeAba) throw new Error("Planilha vazia.");
  const sheet = wb.Sheets[nomeAba]!;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
}

interface ProgressoState {
  tipo: Tipo;
  arquivo: string;
  fase: "lendo" | "enviando" | "recalculando" | "concluido" | "erro";
  processadas: number;
  total: number;
  velocidade: number; // linhas/s
  mensagem?: string;
}

function EstoqueImportar() {
  const qc = useQueryClient();
  const [processando, setProcessando] = useState<Tipo | null>(null);
  const [progresso, setProgresso] = useState<ProgressoState | null>(null);
  const [relatorios, setRelatorios] = useState<Partial<Record<Tipo, RelatorioImportacao>>>({});

  const { data: historicoImport = [] } = useQuery({
    queryKey: ["estoque", "importacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque_importacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as Record<string, any>[];
    },
  });

  const baixarPlanilha = async (path: string) => {
    try {
      const url = await getUrlPlanilhaImportacao(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível baixar a planilha.");
    }
  };

  const processar = async (tipo: Tipo, file: File) => {
    setProcessando(tipo);
    const inicio = Date.now();
    setProgresso({
      tipo,
      arquivo: file.name,
      fase: "lendo",
      processadas: 0,
      total: 0,
      velocidade: 0,
    });
    try {
      const linhas = await lerPlanilha(file);
      setProgresso((p) =>
        p ? { ...p, fase: "enviando", total: linhas.length, processadas: 0 } : p,
      );
      const reportar = ({
        processadas,
        total,
        fase,
      }: {
        processadas: number;
        total: number;
        fase: "lendo" | "enviando";
      }) => {
        const seg = Math.max((Date.now() - inicio) / 1000, 0.001);
        setProgresso((p) =>
          p ? { ...p, fase, processadas, total, velocidade: Math.round(processadas / seg) } : p,
        );
      };
      const rel =
        tipo === "estoque"
          ? await importarEstoque(linhas, reportar)
          : tipo === "vendas"
            ? await importarVendas(linhas, reportar)
            : await importarAnuncios(linhas);
      const arquivoPath = await uploadPlanilhaImportacao(tipo, file);
      await registrarImportacao(tipo, file.name, rel, arquivoPath);
      await qc.invalidateQueries({ queryKey: ["estoque", "importacoes"] });
      setRelatorios((r) => ({ ...r, [tipo]: rel }));
      toast.success(
        `${rel.importados} novos, ${rel.atualizados} atualizados, ${rel.ignorados.length} ignorados.`,
      );
      if (tipo !== "anuncios") {
        setProgresso((p) =>
          p ? { ...p, fase: "recalculando", processadas: 0, total: 0, velocidade: 0 } : p,
        );
        // Importar vendas muda a base comparável: refaz a precificação do zero.
        const res = await recalcularTodos({
          forcar: tipo === "vendas",
          onProgress: ({ processados, total }) =>
            setProgresso((p) =>
              p ? { ...p, fase: "recalculando", processadas: processados, total } : p,
            ),
        });
        toast.success(`Recálculo automático: ${res.alterados} valores atualizados.`);
      }


      await qc.invalidateQueries({ queryKey: ["estoque"] });
      setProgresso((p) => (p ? { ...p, fase: "concluido" } : p));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha na importação";
      toast.error(msg);
      setProgresso((p) => (p ? { ...p, fase: "erro", mensagem: msg } : p));
    } finally {
      setProcessando(null);
    }
  };

  const pct =
    progresso && progresso.total > 0
      ? Math.min(100, Math.round((progresso.processadas / progresso.total) * 100))
      : progresso?.fase === "concluido"
        ? 100
        : 0;
  const encerrado = progresso?.fase === "concluido" || progresso?.fase === "erro";

  return (
    <div className="p-6 space-y-6 w-full">
      <Dialog
        open={progresso !== null}
        onOpenChange={(o) => {
          if (!o && encerrado) setProgresso(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {progresso?.fase === "erro"
                ? "Falha na importação"
                : progresso?.fase === "concluido"
                  ? "Importação concluída"
                  : "Importando planilha"}
            </DialogTitle>
            <DialogDescription className="truncate">{progresso?.arquivo}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-200",
                  progresso?.fase === "erro" ? "bg-destructive" : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {progresso?.fase === "lendo" && "Lendo arquivo…"}
                {progresso?.fase === "enviando" &&
                  `Enviando ${progresso.processadas.toLocaleString("pt-BR")} de ${progresso.total.toLocaleString("pt-BR")} linhas`}
                {progresso?.fase === "recalculando" && "Recalculando valores…"}
                {progresso?.fase === "concluido" && "Finalizado"}
                {progresso?.fase === "erro" && progresso.mensagem}
              </span>
              <span className="tabular-nums">
                {pct}%{progresso?.velocidade ? ` · ${progresso.velocidade} linhas/s` : ""}
              </span>
            </div>
            {encerrado && (
              <Button className="w-full" onClick={() => setProgresso(null)}>
                Fechar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" /> Importação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie planilhas XLSX ou CSV. Ao final é exibido o relatório de linhas ignoradas.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {CARDS.map((c) => {
          const rel = relatorios[c.tipo];
          return (
            <Card key={c.tipo} className="p-5 space-y-3">
              <div>
                <h2 className="font-semibold">{c.titulo}</h2>
                <p className="text-xs text-muted-foreground mt-1">{c.descricao}</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={processando !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void processar(c.tipo, f);
                }}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:text-xs"
              />
              {processando === c.tipo && (
                <p className="text-xs text-muted-foreground">Processando planilha…</p>
              )}

              {rel && (
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{rel.totalLinhas} linhas</Badge>
                    <Badge variant="secondary">{rel.importados} novos</Badge>
                    <Badge variant="secondary">{rel.atualizados} atualizados</Badge>
                    {!!rel.novasCompras && (
                      <Badge variant="outline">
                        {rel.novasCompras} nova(s) compra(s) do mesmo veículo
                      </Badge>
                    )}
                    {!!rel.movidosVendidos && (
                      <Badge variant="outline">{rel.movidosVendidos} movido(s) para Vendidos</Badge>
                    )}
                    {!!rel.vendasCanceladas && (
                      <Badge variant="outline">
                        {rel.vendasCanceladas} venda(s) cancelada(s) — retornaram ao estoque
                      </Badge>
                    )}
                    <Badge variant={rel.ignorados.length ? "destructive" : "secondary"}>
                      {rel.ignorados.length} ignorados
                    </Badge>
                  </div>
                  {rel.ignorados.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
                      {rel.ignorados.map((l, i) => (
                        <div key={i} className="text-muted-foreground">
                          Linha {l.linha}
                          {l.chassi ? ` · ${l.chassi}` : ""}: {l.motivo}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Últimas importações</h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {historicoImport.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma importação registrada.
            </p>
          )}
          {historicoImport.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <Badge variant="secondary">{h.tipo}</Badge>
              <span className="font-medium">{h.arquivo_nome}</span>
              <span className="text-muted-foreground">
                {h.total_linhas} linhas · {h.total_importados} novos · {h.total_atualizados}{" "}
                atualizados · {h.total_ignorados} ignorados
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(h.created_at).toLocaleString("pt-BR")}
              </span>
              {h.arquivo_path ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void baixarPlanilha(String(h.arquivo_path))}
                >
                  <Download className="w-4 h-4 mr-1" /> Baixar
                </Button>
              ) : (
                <Badge variant="outline">Arquivo indisponível</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
