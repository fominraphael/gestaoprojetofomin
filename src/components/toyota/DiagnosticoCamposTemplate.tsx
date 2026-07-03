import { useState } from "react";
import { Search, CheckCircle2, XCircle, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CAMPOS_ESPERADOS_TEMPLATE,
  templateSettingKey,
  type TemplateGrupo,
  type TemplateTipo,
} from "@/lib/checklist-template";
import { listarCamposPdf, type CampoDetectado } from "@/lib/pdf-diagnostico";

interface Props {
  tipo: TemplateTipo;
  grupo: TemplateGrupo;
  disabled?: boolean;
}

export function DiagnosticoCamposTemplate({ tipo, grupo, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campos, setCampos] = useState<CampoDetectado[] | null>(null);

  async function analisar() {
    setLoading(true);
    setCampos(null);
    try {
      const key = templateSettingKey(tipo, grupo);
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Nenhum template salvo para essa combinação.");
        return;
      }
      const v = data.value as { base64?: string } | string | null;
      const b64 = typeof v === "string" ? v : (v?.base64 ?? null);
      if (!b64) {
        toast.error("Base64 vazio em system_settings.");
        return;
      }
      const lista = await listarCamposPdf(b64);
      setCampos(lista);
      setOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao analisar o PDF.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const nomesDetectados = new Set((campos ?? []).map((c) => c.nome));
  const encontrados = CAMPOS_ESPERADOS_TEMPLATE.filter((n) => nomesDetectados.has(n));
  const faltando = CAMPOS_ESPERADOS_TEMPLATE.filter((n) => !nomesDetectados.has(n));
  const extras = (campos ?? []).filter(
    (c) => !CAMPOS_ESPERADOS_TEMPLATE.includes(c.nome as (typeof CAMPOS_ESPERADOS_TEMPLATE)[number]),
  );

  const copiarEsperados = async () => {
    await navigator.clipboard.writeText(CAMPOS_ESPERADOS_TEMPLATE.join("\n"));
    toast.success("Nomes esperados copiados.");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={analisar}
        disabled={disabled || loading}
      >
        <Search className="w-4 h-4" />
        {loading ? "Analisando..." : "Diagnosticar campos"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Diagnóstico — {tipo.toUpperCase()} / {grupo.toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          {campos && campos.length === 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-400">
                  Este PDF não contém campos de AcroForm.
                </p>
                <p className="text-muted-foreground mt-1">
                  Abra o arquivo no Adobe Acrobat ou LibreOffice Draw, adicione um
                  campo de texto sobre cada linha do cabeçalho usando os nomes da
                  lista abaixo e gere o Base64 novamente.
                </p>
              </div>
            </div>
          )}

          {campos && campos.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{campos.length} campos no PDF</Badge>
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                  {encontrados.length} / {CAMPOS_ESPERADOS_TEMPLATE.length} esperados
                </Badge>
                {faltando.length > 0 && (
                  <Badge variant="destructive">{faltando.length} faltando</Badge>
                )}
                {extras.length > 0 && (
                  <Badge variant="outline">{extras.length} extras</Badge>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Campos esperados pelo sistema
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CAMPOS_ESPERADOS_TEMPLATE.map((nome) => {
                      const ok = nomesDetectados.has(nome);
                      return (
                        <TableRow key={nome}>
                          <TableCell className="font-mono text-xs">{nome}</TableCell>
                          <TableCell className="text-right">
                            {ok ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                                <CheckCircle2 className="w-4 h-4" /> Encontrado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                                <XCircle className="w-4 h-4" /> Ausente
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {extras.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    Campos extras no PDF (não usados pelo sistema)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {extras.map((c) => (
                      <code
                        key={c.nome}
                        className="text-xs px-2 py-0.5 rounded bg-muted border"
                        title={c.tipo}
                      >
                        {c.nome}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copiarEsperados}>
              <Copy className="w-4 h-4" />
              Copiar nomes esperados
            </Button>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
