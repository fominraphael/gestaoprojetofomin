import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileCheck2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export type HealthCheckStatus =
  | "pendente"
  | "auto_identificado"
  | "manual"
  | "aprovado"
  | "recusado";

export interface HealthCheckValidacao {
  arquivoNome?: string;
  arquivoUrl?: string;
  chassiIdentificado?: string;
  status: HealthCheckStatus;
  justificativaRecusa?: string;
}

interface Props {
  /** Chassi esperado (do veículo no estoque) para checar contra o documento */
  chassiEsperado?: string;
  value: HealthCheckValidacao;
  onChange: (v: HealthCheckValidacao) => void;
}

/**
 * Simula a leitura do chassi no PDF.
 * Em produção: substituir por OCR/serverFn que processa o PDF.
 * Aqui retornamos o chassi se o nome do arquivo contiver a string, senão null.
 */
function simularLeituraChassi(file: File, chassiEsperado?: string): string | null {
  if (!chassiEsperado) return null;
  const nome = file.name.toUpperCase();
  if (nome.includes(chassiEsperado.toUpperCase())) return chassiEsperado;
  // simulação: ~60% das vezes identifica corretamente
  return Math.random() > 0.4 ? chassiEsperado : null;
}

export function ValidacaoHealthCheck({ chassiEsperado, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo excede 10MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const chassi = simularLeituraChassi(file, chassiEsperado);

    onChange({
      ...value,
      arquivoNome: file.name,
      arquivoUrl: url,
      chassiIdentificado: chassi ?? undefined,
      status: chassi ? "auto_identificado" : "pendente",
    });
  };

  const iniciarAnaliseManual = () => {
    onChange({ ...value, status: "manual" });
    setPreviewOpen(true);
  };

  const aprovar = () => {
    onChange({ ...value, status: "aprovado", justificativaRecusa: undefined });
    toast.success("Health Check aprovado.");
  };

  const recusar = () => {
    if (!value.justificativaRecusa?.trim()) {
      toast.error("Informe a justificativa para recusar o documento.");
      return;
    }
    onChange({ ...value, status: "recusado" });
    toast.warning("Documento recusado. Veículo voltará para pendentes do preparador.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-slate-600" />
            Validação do Health Check
          </span>
          <StatusBadge status={value.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!value.arquivoUrl && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-slate-400 hover:bg-slate-100"
          >
            <Upload className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              Clique ou arraste o PDF do Health Check
            </p>
            <p className="text-xs text-slate-500">Apenas PDF, até 10MB</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {value.arquivoUrl && value.status === "auto_identificado" && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle>Chassi identificado automaticamente</AlertTitle>
            <AlertDescription>
              <span className="font-mono">{value.chassiIdentificado}</span> —{" "}
              {value.arquivoNome}
            </AlertDescription>
          </Alert>
        )}

        {value.arquivoUrl && value.status === "pendente" && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Chassi não identificado automaticamente</AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                Não foi possível extrair o chassi do PDF{" "}
                <strong>{value.arquivoNome}</strong>. Inicie a análise manual.
              </p>
              <Button size="sm" onClick={iniciarAnaliseManual}>
                <Eye className="mr-2 h-4 w-4" />
                Análise Manual
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {value.arquivoUrl &&
          (value.status === "manual" || previewOpen) &&
          value.status !== "aprovado" &&
          value.status !== "recusado" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-md border border-slate-200">
                <iframe
                  src={value.arquivoUrl}
                  title="Health Check PDF"
                  className="h-[420px] w-full"
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-medium text-slate-700">Chassi esperado</p>
                  <p className="font-mono">{chassiEsperado ?? "—"}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="justificativa">
                    Justificativa (obrigatório para recusar)
                  </Label>
                  <Textarea
                    id="justificativa"
                    rows={5}
                    placeholder="Descreva o motivo da recusa..."
                    value={value.justificativaRecusa ?? ""}
                    onChange={(e) =>
                      onChange({ ...value, justificativaRecusa: e.target.value })
                    }
                    maxLength={1000}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={aprovar} className="flex-1">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aprovar Documento
                  </Button>
                  <Button
                    onClick={recusar}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Recusar Documento
                  </Button>
                </div>
              </div>
            </div>
          )}

        {value.status === "aprovado" && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle>Documento aprovado</AlertTitle>
            <AlertDescription>{value.arquivoNome}</AlertDescription>
          </Alert>
        )}

        {value.status === "recusado" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Documento recusado</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>{value.justificativaRecusa}</p>
              <p className="text-xs opacity-80">
                Veículo retornará à lista de pendentes do preparador.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: HealthCheckStatus }) {
  const map: Record<HealthCheckStatus, { label: string; cls: string }> = {
    pendente: { label: "Aguardando análise", cls: "bg-amber-100 text-amber-800" },
    auto_identificado: {
      label: "Identificado automaticamente",
      cls: "bg-sky-100 text-sky-800",
    },
    manual: { label: "Em análise manual", cls: "bg-slate-200 text-slate-800" },
    aprovado: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-800" },
    recusado: { label: "Recusado", cls: "bg-red-100 text-red-800" },
  };
  const v = map[status];
  return <Badge className={v.cls}>{v.label}</Badge>;
}
