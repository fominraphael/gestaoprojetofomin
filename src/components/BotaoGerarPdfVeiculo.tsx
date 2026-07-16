import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { baixarPdf, gerarPdfVeiculo } from "@/lib/pdf-veiculo";
import { formatarModeloComAno, formatarKm } from "@/lib/checklist-template";

interface Props {
  veiculoId: string;
  avaliador?: string;
  tecnico?: string;
  className?: string;
}

/**
 * Botão que busca o veículo + filial no Supabase, preenche o PDF (AcroForm)
 * e dispara o download.
 */
export function BotaoGerarPdfVeiculo({
  veiculoId,
  avaliador = "",
  tecnico = "",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data: veiculo, error } = await supabase
        .from("toyota_estoque_veiculos")
        .select(
          `id, chassi, modelo, marca, ano_modelo, quilometragem,
           filial:toyota_filiais!toyota_estoque_veiculos_filial_destino_id_fkey (
             dealer_number, nome_bi_toyota, nome
           )`,
        )
        .eq("id", veiculoId)
        .maybeSingle();

      if (error) throw error;
      if (!veiculo) throw new Error("Veículo não encontrado.");

      const filial = (veiculo.filial ?? {}) as {
        dealer_number?: string | null;
        nome_bi_toyota?: string | null;
        nome?: string | null;
      };

      const bytes = await gerarPdfVeiculo({
        veiculo: formatarModeloComAno(veiculo.modelo, veiculo.ano_modelo),
        chassi: veiculo.chassi ?? "",
        km: formatarKm(veiculo.quilometragem),
        dn: filial.dealer_number ?? "",
        distribuidor: filial.nome_bi_toyota ?? filial.nome ?? "",
        avaliador,
        tecnico,
      });

      const nome = `checklist-${(veiculo.chassi ?? veiculoId).slice(-8)}.pdf`;
      baixarPdf(bytes, nome);
      toast.success("PDF gerado com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Falha ao gerar PDF do veículo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      Gerar PDF do Veículo
    </Button>
  );
}
