import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/estoque-motor";
import {
  ROTULO_MOTIVO,
  confirmarImportacaoWebmotors,
  getHistoricoWebmotors,
  validarPlanilhaWebmotors,
  type MotivoWm,
  type PreviaWm,
} from "@/lib/webmotors";

async function lerPlanilha(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const aba = wb.SheetNames[0];
  if (!aba) throw new Error("Planilha vazia.");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[aba]!, { defval: null });
}

export function ImportarWebmotorsCard() {
  const qc = useQueryClient();
  const [carregando, setCarregando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [arquivo, setArquivo] = useState("");
  const [previa, setPrevia] = useState<PreviaWm | null>(null);
  const [resultado, setResultado] = useState<{ previa: PreviaWm; gravados: number } | null>(null);

  const { data: historico = [] } = useQuery({
    queryKey: ["estoque", "webmotors-historico"],
    queryFn: () => getHistoricoWebmotors(30),
  });

  const selecionar = async (file: File) => {
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      toast.error("Envie um arquivo .xlsx ou .csv.");
      return;
    }
    setCarregando(true);
    setResultado(null);
    try {
      const p = await validarPlanilhaWebmotors(await lerPlanilha(file));
      setArquivo(file.name);
      setPrevia(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ler a planilha.");
    } finally {
      setCarregando(false);
    }
  };

  const confirmar = async () => {
    if (!previa) return;
    setGravando(true);
    try {
      const n = previa.validas.length ? await confirmarImportacaoWebmotors(previa.validas, arquivo) : 0;
      setResultado({ previa, gravados: n });
      setPrevia(null);
      toast.success(`${n} valor(es) Webmotors atualizado(s).`);
      await qc.invalidateQueries({ queryKey: ["estoque"] });
    } catch (e) {
      toast.error(e instanceof Error ? `Nada foi gravado: ${e.message}` : "Falha na importação; nada foi gravado.");
    } finally {
      setGravando(false);
    }
  };

  const baixarInconsistencias = async (p: PreviaWm) => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      p.inconsistencias.map((i) => ({ Linha: i.linha, Placa: i.placa, Motivo: ROTULO_MOTIVO[i.motivo] })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inconsistências");
    XLSX.writeFile(wb, `inconsistencias-webmotors-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const contar = (p: PreviaWm, m: MotivoWm) => p.inconsistencias.filter((i) => i.motivo === m).length;

  const Resumo = ({ p, gravados }: { p: PreviaWm; gravados?: number }) => (
    <div className="flex flex-wrap gap-2 text-xs">
      <Badge variant="secondary">{p.total} linhas processadas</Badge>
      <Badge variant="secondary">
        {gravados ?? p.validas.length} {gravados == null ? "prontas para atualizar" : "atualizadas"}
      </Badge>
      {(Object.keys(ROTULO_MOTIVO) as MotivoWm[]).map((m) =>
        contar(p, m) ? (
          <Badge key={m} variant="destructive">
            {contar(p, m)} · {ROTULO_MOTIVO[m]}
          </Badge>
        ) : null,
      )}
    </div>
  );

  return (
    <Card className="p-5 space-y-3">
      <div>
        <h2 className="font-semibold">Valores Webmotors</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Colunas: placa e valor_webmotors (obrigatórias); data_referencia, url_anuncio e observacao
          (opcionais). Atualiza só veículos já em estoque, localizados pela placa.
        </p>
      </div>
      <input
        type="file"
        accept=".xlsx,.csv"
        disabled={carregando || gravando}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void selecionar(f);
        }}
        className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:text-xs"
      />
      {carregando && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Validando planilha…
        </p>
      )}
      {resultado && (
        <div className="space-y-2">
          <Resumo p={resultado.previa} gravados={resultado.gravados} />
          {resultado.previa.inconsistencias.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => void baixarInconsistencias(resultado.previa)}>
              <Download className="w-4 h-4 mr-1" /> Baixar inconsistências
            </Button>
          )}
        </div>
      )}

      {historico.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Histórico de valores importados</summary>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {historico.map((h) => (
              <div key={h.id} className="p-2 flex flex-wrap gap-x-2">
                <span className="font-mono">{h.placa}</span>
                <span>
                  {h.valor_anterior != null ? formatBRL(h.valor_anterior) : "—"} → {formatBRL(h.valor_novo)}
                </span>
                <span className="text-muted-foreground">
                  {new Date(h.created_at).toLocaleString("pt-BR")} · {h.usuario_nome || "—"} · {h.arquivo_nome}
                  {h.data_referencia ? ` · ref. ${new Date(`${h.data_referencia}T00:00:00`).toLocaleDateString("pt-BR")}` : ""}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <Dialog open={previa !== null} onOpenChange={(o) => !o && !gravando && setPrevia(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia da importação Webmotors</DialogTitle>
            <DialogDescription className="truncate">{arquivo}</DialogDescription>
          </DialogHeader>
          {previa && (
            <div className="space-y-3">
              <Resumo p={previa} />
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-2 py-1">Linha</th>
                      <th className="px-2 py-1">Placa</th>
                      <th className="px-2 py-1 text-right">Atual</th>
                      <th className="px-2 py-1 text-right">Novo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.validas.slice(0, 200).map((v) => (
                      <tr key={v.linha} className="border-t border-border">
                        <td className="px-2 py-1">{v.linha}</td>
                        <td className="px-2 py-1 font-mono">{v.placa}</td>
                        <td className="px-2 py-1 text-right">
                          {v.valor_anterior != null ? formatBRL(v.valor_anterior) : "Não informado"}
                        </td>
                        <td className="px-2 py-1 text-right">{formatBRL(v.valor)}</td>
                      </tr>
                    ))}
                    {previa.inconsistencias.slice(0, 200).map((i) => (
                      <tr key={`e${i.linha}`} className="border-t border-border text-destructive">
                        <td className="px-2 py-1">{i.linha}</td>
                        <td className="px-2 py-1 font-mono">{i.placa || "—"}</td>
                        <td className="px-2 py-1" colSpan={2}>
                          {ROTULO_MOTIVO[i.motivo]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Linhas com inconsistência não alteram o estoque. Placas duplicadas são bloqueadas e
                precisam ser corrigidas no arquivo.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            {previa && previa.inconsistencias.length > 0 && (
              <Button variant="outline" onClick={() => void baixarInconsistencias(previa)}>
                <Download className="w-4 h-4 mr-1" /> Inconsistências
              </Button>
            )}
            <Button variant="outline" disabled={gravando} onClick={() => setPrevia(null)}>
              Cancelar
            </Button>
            <Button disabled={gravando || !previa?.validas.length} onClick={() => void confirmar()}>
              {gravando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Confirmar importação ({previa?.validas.length ?? 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
