import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { atualizarVeiculo, type CampoEditavel, type Veiculo } from "@/lib/estoque";

interface CampoDef {
  campo: CampoEditavel;
  label: string;
  tipo: "texto" | "numero";
}

/** Todos os campos trazidos pela importação de estoque, editáveis manualmente. */
const CAMPOS: CampoDef[] = [
  { campo: "chassi", label: "Chassi", tipo: "texto" },
  { campo: "chassi_resumido", label: "Chassi resumido", tipo: "texto" },
  { campo: "modelo", label: "Modelo", tipo: "texto" },
  { campo: "placa", label: "Placa", tipo: "texto" },
  { campo: "ano_mod", label: "Ano / Ano mod.", tipo: "texto" },
  { campo: "cor", label: "Cor", tipo: "texto" },
  { campo: "regional", label: "Regional", tipo: "texto" },
  { campo: "loja", label: "Loja", tipo: "texto" },
  { campo: "km", label: "KM", tipo: "numero" },
  { campo: "custo_total", label: "Custo total (R$)", tipo: "numero" },
  { campo: "fipe", label: "FIPE (R$)", tipo: "numero" },
  { campo: "codigo_fipe", label: "Código FIPE", tipo: "texto" },
  { campo: "percentual_fipe_planilha", label: "% FIPE (planilha)", tipo: "numero" },
  { campo: "valor_anunciado_planilha", label: "Valor anúncio importado (R$)", tipo: "numero" },
  { campo: "valor_anuncio_calculado", label: "Valor anunciado sugerido (R$)", tipo: "numero" },
  { campo: "dias_em_estoque", label: "Dias em estoque", tipo: "numero" },
  { campo: "fotos_qtd", label: "Qtd. de fotos", tipo: "numero" },
  { campo: "leads_60_dias", label: "Leads 60 dias", tipo: "numero" },
  { campo: "classificacao", label: "Classificação", tipo: "texto" },
  { campo: "finalidade", label: "Finalidade (importada)", tipo: "texto" },
  { campo: "finalidade_atual", label: "Finalidade atual", tipo: "texto" },
];

export interface EditarVeiculoDialogProps {
  veiculo: Veiculo;
  onSalvo: () => void | Promise<void>;
}

export function EditarVeiculoDialog({ veiculo, onSalvo }: EditarVeiculoDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});

  const iniciais = useMemo(() => {
    const base: Record<string, string> = {};
    for (const c of CAMPOS) {
      const v = (veiculo as unknown as Record<string, unknown>)[c.campo];
      base[c.campo] = v == null ? "" : String(v);
    }
    return base;
  }, [veiculo]);

  useEffect(() => {
    if (aberto) setValores(iniciais);
  }, [aberto, iniciais]);

  const manuais = new Set(veiculo.campos_manuais ?? []);

  const salvar = async () => {
    setSalvando(true);
    try {
      const patch: Partial<Record<CampoEditavel, unknown>> = {};
      for (const c of CAMPOS) {
        const bruto = (valores[c.campo] ?? "").trim();
        if (c.tipo === "numero") {
          const n = bruto === "" ? null : Number(bruto.replace(/\./g, "").replace(",", "."));
          if (n != null && !Number.isFinite(n)) {
            toast.error(`Valor inválido em "${c.label}".`);
            setSalvando(false);
            return;
          }
          patch[c.campo] = n;
        } else {
          patch[c.campo] = bruto === "" ? null : bruto;
        }
      }
      // Campos obrigatórios no banco não podem ficar nulos.
      if (!patch["chassi"] || !patch["chassi_resumido"]) {
        toast.error("Chassi e chassi resumido são obrigatórios.");
        setSalvando(false);
        return;
      }
      patch["dias_em_estoque"] = patch["dias_em_estoque"] ?? 0;
      patch["leads_60_dias"] = patch["leads_60_dias"] ?? 0;

      await atualizarVeiculo(veiculo, patch);
      toast.success("Veículo atualizado.");
      setAberto(false);
      await onSalvo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar o veículo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Editar veículo">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar veículo</DialogTitle>
          <DialogDescription>
            Todos os campos vindos da importação podem ser ajustados. Campos alterados ficam
            marcados como <strong>Manual</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPOS.map((c) => (
            <div key={c.campo} className="space-y-1.5">
              <Label htmlFor={`campo-${c.campo}`} className="flex items-center gap-2 text-xs">
                {c.label}
                {manuais.has(c.campo) ? (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    Manual
                  </Badge>
                ) : null}
              </Label>
              <Input
                id={`campo-${c.campo}`}
                inputMode={c.tipo === "numero" ? "decimal" : "text"}
                value={valores[c.campo] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [c.campo]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
