import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wrench,
  Loader2,
  AlertTriangle,
  Search,
  Send,
  FileUp,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute(
  "/_authenticated/_toyota/toyota/fila-posvendas",
)({
  component: FilaPosVendas,
  errorComponent: ModuleErrorBoundary,
});

interface Veiculo {
  id: string;
  chassi: string;
  placa: string | null;
  modelo: string | null;
  marca: string | null;
  ano_modelo: number | null;
  elegibilidade: string | null;
  status_aprovacao: string;
  motivo_reprovacao: string | null;
  hsv_revisoes_pendentes: string[] | null;
  hsv_os_ajustes: string[] | null;
  hsv_observacoes_preparador: string | null;
  checklist_data: { observacoes?: string; preenchido_em?: string } | null;
  checklist_itens: Record<string, "" | "✓" | "N/A"> | null;
  checklist_pdf_path: string | null;
  health_check_pdf_path: string | null;
  health_check_uploaded_at: string | null;
  posvendas_km: number | null;
  filial_destino_id: string | null;
}

interface FilialInfo {
  dealer_number: string | null;
  nome_bi_toyota: string | null;
}

function FilaPosVendas() {
  const { user } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Veiculo | null>(null);
  const [obs, setObs] = useState("");
  const [km, setKm] = useState("");
  // Marcações removidas: o Template PDF já vem previamente preenchido.
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("toyota_estoque_veiculos")
      .select(
        "id,chassi,placa,modelo,marca,ano_modelo,elegibilidade,status_aprovacao,motivo_reprovacao,hsv_revisoes_pendentes,hsv_os_ajustes,hsv_observacoes_preparador,checklist_data,checklist_itens,checklist_pdf_path,health_check_pdf_path,health_check_uploaded_at,posvendas_km,filial_destino_id",
      )
      .eq("status_aprovacao", "em_posvendas")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar fila");
      setVeiculos([]);
    } else {
      setVeiculos((data ?? []) as Veiculo[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return veiculos;
    return veiculos.filter((v) =>
      [v.chassi, v.placa, v.modelo]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(t)),
    );
  }, [veiculos, busca]);

  const abrir = (v: Veiculo) => {
    setAberto(v);
    setObs(v.checklist_data?.observacoes ?? "");
    setKm(v.posvendas_km != null ? String(v.posvendas_km) : "");
  };

  const tipoChecklist = useMemo(() => {
    if (!aberto?.elegibilidade) return null;
    const e = aberto.elegibilidade.toUpperCase();
    if (e.includes("TCUV")) return "TCUV" as const;
    if (e.includes("TSIM")) return "TSIM" as const;
    return null;
  }, [aberto]);


  const salvarChecklist = async () => {
    if (!aberto) return;
    if (!tipoChecklist) {
      toast.error("Elegibilidade do veículo não corresponde a TCUV ou TSIM.");
      return;
    }
    // Não há mais marcação de itens em tela: o Template PDF já vem pré-preenchido.

    const kmNum = Number(km.replace(/\D/g, ""));
    if (!kmNum || kmNum <= 0) {
      toast.error("Informe a quilometragem atual antes de salvar o check-list.");
      return;
    }

    setSalvando(true);
    try {
      // Busca dados da filial para o cabeçalho
      let filial: FilialInfo = { dealer_number: null, nome_bi_toyota: null };
      if (aberto.filial_destino_id) {
        const { data } = await supabase
          .from("toyota_filiais")
          .select("dealer_number,nome_bi_toyota")
          .eq("id", aberto.filial_destino_id)
          .maybeSingle();
        if (data) filial = data as FilialInfo;
      }

      const { gerarChecklistPreenchido, formatarDataHora } = await import(
        "@/lib/checklist-template"
      );
      const agora = new Date().toISOString();
      const { data: dataStr, hora } = formatarDataHora(agora);
      const responsavel = user?.username ?? "";

      const pdfBytes = await gerarChecklistPreenchido(
        tipoChecklist.toLowerCase() as "tcuv" | "tsim",
        {
          veiculoAnoModelo: [aberto.modelo, aberto.ano_modelo].filter(Boolean).join(" "),
          chassi: aberto.chassi,
          katashiki: "",
          km: kmNum.toLocaleString("pt-BR"),
          dn: filial.dealer_number ?? "",
          nomeDistribuidor: filial.nome_bi_toyota ?? "",
          avaliadorResponsavel: responsavel,
          tecnicoResponsavel: responsavel,
          data: dataStr,
          hora,
        },
        undefined,
        { skipMarcacoesPages: true },
      );

      const path = `toyota/checklists/${aberto.id}/${Date.now()}-checklist.pdf`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(
          path,
          new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }),
          { upsert: true, contentType: "application/pdf" },
        );
      if (upErr) {
        toast.error(`Falha ao salvar PDF do check-list: ${upErr.message}`);
        return;
      }

      const { error } = await supabase
        .from("toyota_estoque_veiculos")
        .update({
          checklist_data: { observacoes: obs, preenchido_em: agora },
          checklist_itens: null,
          checklist_pdf_path: path,
          posvendas_km: kmNum,
        })
        .eq("id", aberto.id);
      if (error) {
        toast.error("Erro ao salvar check-list");
        return;
      }
      toast.success("Check-list preenchido e PDF gerado.");
      await carregar();
      setAberto((cur) =>
        cur
          ? {
              ...cur,
              checklist_data: { observacoes: obs, preenchido_em: agora },
              checklist_itens: null,
              checklist_pdf_path: path,
              posvendas_km: kmNum,
            }
          : cur,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar PDF.";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  const uploadPdf = async (file: File) => {
    if (!aberto) return;
    if (file.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Arquivo excede o limite de 100MB.");
      return;
    }
    setUploadando(true);
    try {
      // 1. Ler bytes e validar chassi no PDF antes de subir
      const bytes = await file.arrayBuffer();
      const { extractPdfText, pdfContemChassi } = await import("@/lib/pdf-utils");
      let texto = "";
      try {
        texto = await extractPdfText(bytes);
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível ler o PDF para validar o chassi.");
        return;
      }
      if (!pdfContemChassi(texto, aberto.chassi)) {
        toast.error(
          `O chassi ${aberto.chassi} não foi encontrado no PDF. Verifique se o Health Check é do veículo correto.`,
        );
        return;
      }

      const path = `toyota/health-check/${aberto.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) {
        toast.error("Erro ao subir PDF");
        return;
      }
      const { error } = await supabase
        .from("toyota_estoque_veiculos")
        .update({
          health_check_pdf_path: path,
          health_check_uploaded_at: new Date().toISOString(),
        })
        .eq("id", aberto.id);
      if (error) {
        toast.error("Erro ao registrar PDF");
        return;
      }
      toast.success("Health Check anexado (chassi validado).");
      await carregar();
      setAberto((cur) =>
        cur
          ? {
              ...cur,
              health_check_pdf_path: path,
              health_check_uploaded_at: new Date().toISOString(),
            }
          : cur,
      );
    } finally {
      setUploadando(false);
    }
  };

  const enviarCentral = async () => {
    if (!aberto) return;
    if (!aberto.health_check_pdf_path) {
      toast.error("Anexe o PDF do Health Check antes de enviar.");
      return;
    }
    if (!aberto.checklist_data?.preenchido_em) {
      toast.error("Preencha o checklist antes de enviar.");
      return;
    }
    const kmNum = Number(km.replace(/\D/g, ""));
    if (!kmNum || kmNum <= 0) {
      toast.error("Informe a quilometragem atual do veículo.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({
        status_aprovacao: "aguardando_analise_central",
        motivo_reprovacao: null,
        posvendas_km: kmNum,
        posvendas_finalizado_em: new Date().toISOString(),
        posvendas_finalizado_por: user?.username ?? null,
      })
      .eq("id", aberto.id);
    setEnviando(false);
    if (error) {
      toast.error("Erro ao enviar para Central");
      return;
    }
    toast.success("Enviado para Análise Central");
    setAberto(null);
    carregar();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6" /> Fila do Pós-Vendas (Oficina)
        </h1>
        <p className="text-sm text-muted-foreground">
          Execute as revisões, corrija as OS apontadas pelo ADM, preencha o
          checklist e anexe o PDF do Health Check.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por chassi, placa ou modelo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum veículo na fila do Pós-Vendas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((v) => (
            <Card
              key={v.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => abrir(v)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-mono">
                    {v.chassi}
                  </CardTitle>
                  <Badge variant="secondary">
                    {v.elegibilidade ?? "—"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {v.modelo ?? "—"} · {v.placa ?? "—"} · {v.ano_modelo ?? "—"}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {v.motivo_reprovacao && (
                  <div className="flex items-start gap-1.5 text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">
                      Retorno: {v.motivo_reprovacao}
                    </span>
                  </div>
                )}
                {v.hsv_revisoes_pendentes?.length ? (
                  <div>
                    <strong>Revisões:</strong>{" "}
                    {v.hsv_revisoes_pendentes.join(", ")}
                  </div>
                ) : null}
                {v.hsv_os_ajustes?.length ? (
                  <div>
                    <strong>OS:</strong> {v.hsv_os_ajustes.join(", ")}
                  </div>
                ) : null}
                <div className="flex items-center gap-3 pt-2 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {v.checklist_data?.preenchido_em ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    Checklist
                  </span>
                  <span className="flex items-center gap-1">
                    {v.health_check_pdf_path ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    Health Check
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!aberto}
        onOpenChange={(o) => {
          if (!o) setAberto(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {aberto && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">
                  {aberto.chassi}
                </DialogTitle>
                <DialogDescription>
                  {aberto.modelo ?? "—"} · {aberto.placa ?? "—"} ·{" "}
                  {aberto.ano_modelo ?? "—"} · {aberto.elegibilidade ?? "—"}
                </DialogDescription>
              </DialogHeader>

              {aberto.motivo_reprovacao && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> Retorno da
                    Análise Central
                  </div>
                  <p className="mt-1 text-foreground">
                    {aberto.motivo_reprovacao}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Você pode substituir os arquivos e ajustar o checklist
                    antes de reenviar.
                  </p>
                </div>
              )}

              <div className="space-y-3 text-xs">
                {aberto.hsv_revisoes_pendentes?.length ? (
                  <div>
                    <strong>Revisões pendentes:</strong>{" "}
                    {aberto.hsv_revisoes_pendentes.join(", ")}
                  </div>
                ) : null}
                {aberto.hsv_os_ajustes?.length ? (
                  <div>
                    <strong>OS a corrigir:</strong>{" "}
                    {aberto.hsv_os_ajustes.join(", ")}
                  </div>
                ) : null}
                {aberto.hsv_observacoes_preparador ? (
                  <div className="rounded-md bg-muted p-2">
                    <strong>Observações do ADM:</strong>{" "}
                    {aberto.hsv_observacoes_preparador}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Quilometragem atual *</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  placeholder="Ex: 45230"
                />
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div>
                  <Label className="text-sm font-semibold">
                    Check-list {tipoChecklist ? `— ${tipoChecklist}` : ""}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    O Template PDF configurado já vem previamente preenchido/marcado.
                    Ao salvar, o sistema apenas escreve os dados do cabeçalho
                    (Veículo, Chassi, KM, DN, Distribuidor, Avaliador, Técnico,
                    Data e Hora) sobre o arquivo original.
                  </p>
                </div>

                {!tipoChecklist && (
                  <div className="text-xs text-destructive">
                    Elegibilidade do veículo não corresponde a TCUV nem TSIM.
                  </div>
                )}

                <Textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Observações finais (opcional)..."
                  rows={2}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {aberto.checklist_pdf_path
                      ? `PDF salvo em ${aberto.checklist_data?.preenchido_em ? new Date(aberto.checklist_data.preenchido_em).toLocaleString("pt-BR") : "—"}`
                      : "Ainda não salvo"}
                  </span>
                  <Button
                    size="sm"
                    onClick={salvarChecklist}
                    disabled={salvando || !tipoChecklist || !Number(km.replace(/\D/g, ""))}
                  >
                    {salvando && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    )}
                    Salvar e Concluir Check-list
                  </Button>
                </div>
              </div>


              <div className="space-y-2">
                <Label className="text-sm">Health Check (PDF)</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadPdf(f);
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground truncate">
                    {aberto.health_check_pdf_path
                      ? `Anexado em ${aberto.health_check_uploaded_at ? new Date(aberto.health_check_uploaded_at).toLocaleString("pt-BR") : "—"}`
                      : "Nenhum PDF anexado"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadando}
                  >
                    {uploadando ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <FileUp className="h-3.5 w-3.5 mr-1" />
                    )}
                    {aberto.health_check_pdf_path
                      ? "Substituir PDF"
                      : "Anexar PDF"}
                  </Button>
                </div>
              </div>




              <DialogFooter>
                <div className="mr-auto text-xs text-muted-foreground">
                  {!aberto.checklist_data?.preenchido_em && "• Preencha o check-list  "}
                  {!aberto.health_check_pdf_path && "• Anexe o Health Check"}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setAberto(null)}
                  disabled={enviando}
                >
                  Fechar
                </Button>
                <Button
                  onClick={enviarCentral}
                  disabled={
                    enviando ||
                    !aberto.checklist_data?.preenchido_em ||
                    !aberto.health_check_pdf_path ||
                    !Number(km.replace(/\D/g, ""))
                  }
                >
                  {enviando ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1" />
                  )}
                  Enviar para Análise Central
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
