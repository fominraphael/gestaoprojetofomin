import { useState } from "react";
import { Loader2, Wrench, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RevisaoItem {
  id: string;
  placa: string;
  modelo: string | null;
  chassi: string;
  km_atual: number | null;
  status: string | null;
  mecanico_id: string | null;
  numero_os: string | null;
  tipo_os: string | null;
  observacao_mecanico: string | null;
  km_validado_mecanico: number | null;
  observacao_finalizacao: string | null;
  data_inicio_execucao: string | null;
}

interface RevisaoExecucaoDialogProps {
  revisao: RevisaoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  userId: string;
}

export function RevisaoExecucaoDialog({
  revisao,
  open,
  onOpenChange,
  onComplete,
  userId,
}: RevisaoExecucaoDialogProps) {
  const [processando, setProcessando] = useState(false);

  // Assumir / registrar OS
  const [numeroOs, setNumeroOs] = useState("");
  const [tipoOs, setTipoOs] = useState("");
  const [obsAssumir, setObsAssumir] = useState("");

  // Concluir
  const [kmValidado, setKmValidado] = useState("");
  const [obsFinal, setObsFinal] = useState("");

  if (!revisao) return null;

  const isAprovado = revisao.status === "aprovado_pos_vendas";
  const isEmExecucao =
    revisao.status === "em_execucao" && revisao.mecanico_id === userId;

  const handleAssumir = async () => {
    if (!numeroOs.trim()) return toast.error("Informe o número da OS.");
    if (!tipoOs) return toast.error("Selecione o tipo de OS.");

    setProcessando(true);
    try {
      const { error } = await supabase
        .from("toyota_revisoes")
        .update({
          status: "em_execucao",
          mecanico_id: userId,
          numero_os: numeroOs.trim(),
          tipo_os: tipoOs,
          data_inicio_execucao: new Date().toISOString(),
          observacao_mecanico: obsAssumir.trim() || null,
        })
        .eq("id", revisao.id);
      if (error) throw error;
      toast.success("Revisão assumida e OS registrada.");
      onOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Erro ao assumir revisão.");
    } finally {
      setProcessando(false);
    }
  };

  const handleConcluir = async () => {
    setProcessando(true);
    try {
      const payload: {
        status: "finalizado";
        data_finalizacao: string;
        observacao_finalizacao: string | null;
        km_validado_mecanico?: number;
      } = {
        status: "finalizado",
        data_finalizacao: new Date().toISOString(),
        observacao_finalizacao: obsFinal.trim() || null,
      };
      if (kmValidado) payload.km_validado_mecanico = Number(kmValidado.replace(/\D/g, ""));

      const { error } = await supabase
        .from("toyota_revisoes")
        .update(payload)
        .eq("id", revisao.id);
      if (error) throw error;
      toast.success("Revisão finalizada com sucesso.");
      onOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar revisão.");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {isAprovado ? "Assumir e Registrar OS" : "Concluir Revisão"}
          </DialogTitle>
          <DialogDescription className="font-mono text-sm">
            {revisao.placa} · {revisao.modelo ?? "—"} · {revisao.chassi}
          </DialogDescription>
        </DialogHeader>

        {isAprovado && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">
                Número da OS <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                placeholder="Ex: OS-12345"
                value={numeroOs}
                onChange={(e) => setNumeroOs(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Tipo de OS <span className="text-destructive">*</span>
              </Label>
              <Select value={tipoOs} onValueChange={setTipoOs}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R1 - GODRIVE">R1 - GODRIVE</SelectItem>
                  <SelectItem value="M2 - INTERNA SN">M2 - INTERNA SN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Observação (opcional)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Observações ao assumir..."
                value={obsAssumir}
                onChange={(e) => setObsAssumir(e.target.value)}
              />
            </div>
          </div>
        )}

        {isEmExecucao && (
          <div className="space-y-3">
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <strong>OS:</strong> {revisao.numero_os} ({revisao.tipo_os})
              {revisao.data_inicio_execucao && (
                <>
                  <br />
                  <strong>Início:</strong>{" "}
                  {new Date(revisao.data_inicio_execucao).toLocaleString("pt-BR")}
                </>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold">KM Validado (opcional)</Label>
              <Input
                className="mt-1"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={revisao.km_atual != null ? String(revisao.km_atual) : "KM"}
                value={kmValidado}
                onChange={(e) => setKmValidado(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Observação Final (opcional)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                placeholder="Observações de conclusão..."
                value={obsFinal}
                onChange={(e) => setObsFinal(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processando}>
            Cancelar
          </Button>
          {isAprovado && (
            <Button onClick={handleAssumir} disabled={processando || !numeroOs.trim() || !tipoOs}>
              {processando && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Assumir e Registrar OS
            </Button>
          )}
          {isEmExecucao && (
            <Button onClick={handleConcluir} disabled={processando}>
              {processando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Concluir Revisão
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
