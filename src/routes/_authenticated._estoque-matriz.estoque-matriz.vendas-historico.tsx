import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/estoque-motor";
import {
  atualizarVenda,
  getVendasHistorico,
  moverVendaParaLixeira,
  restaurarVenda,
  type VendaHistoricoRow,
} from "@/lib/estoque";

export const Route = createFileRoute(
  "/_authenticated/_estoque-matriz/estoque-matriz/vendas-historico",
)({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Vendas Históricas — Análise de Estoque Matriz" },
      {
        name: "description",
        content:
          "Histórico completo de vendas importadas, com edição dos campos e filtros por KM, ano/modelo e código FIPE.",
      },
      { property: "og:title", content: "Vendas Históricas — Análise de Estoque Matriz" },
      {
        property: "og:description",
        content: "Consulte, edite e exclua registros do histórico de vendas importado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendasHistoricoPage,
});

/** Campos editáveis do registro de venda, na ordem exibida no formulário. */
const CAMPOS: { chave: keyof VendaHistoricoRow; label: string; tipo: "texto" | "numero" | "data" }[] =
  [
    { chave: "chassi", label: "Chassi", tipo: "texto" },
    { chave: "placa", label: "Placa", tipo: "texto" },
    { chave: "modelo", label: "Modelo", tipo: "texto" },
    { chave: "versao", label: "Versão", tipo: "texto" },
    { chave: "ano_modelo", label: "Ano/Modelo", tipo: "texto" },
    { chave: "km", label: "KM", tipo: "numero" },
    { chave: "codigo_fipe", label: "Código FIPE", tipo: "texto" },
    { chave: "data_venda", label: "Data da venda", tipo: "data" },
    { chave: "valor_venda", label: "Valor da venda", tipo: "numero" },
    { chave: "valor_custo", label: "Valor de custo", tipo: "numero" },
    { chave: "valor_imposto", label: "Valor de imposto", tipo: "numero" },
    { chave: "lucro_bruto", label: "Lucro bruto", tipo: "numero" },
    { chave: "dias_em_estoque", label: "Dias em estoque", tipo: "numero" },
    { chave: "regional", label: "Regional", tipo: "texto" },
    { chave: "loja", label: "Loja", tipo: "texto" },
    { chave: "vendedor", label: "Vendedor", tipo: "texto" },
    { chave: "nome_cliente", label: "Cliente", tipo: "texto" },
    { chave: "finalidade", label: "Finalidade", tipo: "texto" },
  ];

function VendasHistoricoPage() {
  const qc = useQueryClient();
  const [lixeira, setLixeira] = useState(false);
  const [kmMin, setKmMin] = useState("");
  const [kmMax, setKmMax] = useState("");
  const [ano, setAno] = useState("");
  const [fipe, setFipe] = useState("");
  const [editando, setEditando] = useState<VendaHistoricoRow | null>(null);

  const { data: vendas = [] } = useQuery({
    queryKey: ["estoque", "vendas-historico", lixeira],
    queryFn: () => getVendasHistorico({ lixeira }),
  });

  const filtrados = useMemo(() => {
    const min = kmMin === "" ? null : Number(kmMin);
    const max = kmMax === "" ? null : Number(kmMax);
    const a = ano.trim().toLowerCase();
    const f = fipe.trim().toLowerCase();
    return vendas.filter((v) => {
      if (min != null && (v.km ?? 0) < min) return false;
      if (max != null && (v.km ?? 0) > max) return false;
      if (a && !(v.ano_modelo ?? "").toLowerCase().includes(a)) return false;
      if (f && !(v.codigo_fipe ?? "").toLowerCase().includes(f)) return false;
      return true;
    });
  }, [vendas, kmMin, kmMax, ano, fipe]);

  const recarregar = () => qc.invalidateQueries({ queryKey: ["estoque", "vendas-historico"] });

  const excluir = async (v: VendaHistoricoRow) => {
    try {
      await moverVendaParaLixeira(v.id);
      toast.success("Venda movida para a lixeira.");
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  const restaurar = async (v: VendaHistoricoRow) => {
    try {
      await restaurarVenda(v.id);
      toast.success("Venda restaurada.");
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao restaurar");
    }
  };

  return (
    <div className="p-6 space-y-4 w-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Vendas Históricas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as vendas importadas. Edite os campos, exclua registros (vão para a lixeira) e
            filtre por KM, ano/modelo ou código FIPE.
          </p>
        </div>
        <Button variant={lixeira ? "default" : "outline"} onClick={() => setLixeira((l) => !l)}>
          {lixeira ? "Ver ativas" : "Ver lixeira"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="w-[120px]"
          placeholder="KM mín."
          inputMode="numeric"
          value={kmMin}
          onChange={(e) => setKmMin(e.target.value.replace(/\D/g, ""))}
        />
        <Input
          className="w-[120px]"
          placeholder="KM máx."
          inputMode="numeric"
          value={kmMax}
          onChange={(e) => setKmMax(e.target.value.replace(/\D/g, ""))}
        />
        <Input
          className="w-[150px]"
          placeholder="Ano/Modelo"
          value={ano}
          onChange={(e) => setAno(e.target.value)}
        />
        <Input
          className="w-[170px]"
          placeholder="Código FIPE"
          value={fipe}
          onChange={(e) => setFipe(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Modelo</th>
              <th className="px-3 py-2 font-medium">Chassi</th>
              <th className="px-3 py-2 font-medium">Placa</th>
              <th className="px-3 py-2 font-medium">Ano/Mod</th>
              <th className="px-3 py-2 font-medium text-right">KM</th>
              <th className="px-3 py-2 font-medium">Cód. FIPE</th>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium text-right">Valor</th>
              <th className="px-3 py-2 font-medium">Loja</th>
              <th className="px-3 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
            {filtrados.map((v) => (
              <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2">{v.modelo ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.chassi ?? "—"}</td>
                <td className="px-3 py-2">{v.placa ?? "—"}</td>
                <td className="px-3 py-2">{v.ano_modelo ?? "—"}</td>
                <td className="px-3 py-2 text-right">{v.km ?? "—"}</td>
                <td className="px-3 py-2">{v.codigo_fipe ?? "—"}</td>
                <td className="px-3 py-2">
                  {v.data_venda ? new Date(v.data_venda).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatBRL(v.valor_venda)}</td>
                <td className="px-3 py-2">{v.loja ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    {lixeira ? (
                      <Button size="icon" variant="ghost" onClick={() => void restaurar(v)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setEditando(v)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void excluir(v)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {vendas.length} vendas
      </p>

      <EditarVendaDialog venda={editando} onClose={() => setEditando(null)} onSalvo={recarregar} />
    </div>
  );
}

interface EditarVendaDialogProps {
  venda: VendaHistoricoRow | null;
  onClose: () => void;
  onSalvo: () => void | Promise<unknown>;
}

function EditarVendaDialog({ venda, onClose, onSalvo }: EditarVendaDialogProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  // Reinicializa o formulário sempre que outro registro é aberto.
  const chaveAtual = venda?.id ?? "";
  const [chaveCarregada, setChaveCarregada] = useState("");
  if (venda && chaveAtual !== chaveCarregada) {
    const inicial: Record<string, string> = {};
    for (const c of CAMPOS) {
      const valor = venda[c.chave];
      inicial[c.chave as string] = valor == null ? "" : String(valor);
    }
    setForm(inicial);
    setChaveCarregada(chaveAtual);
  }

  const salvar = async () => {
    if (!venda) return;
    setSalvando(true);
    try {
      const patch: Record<string, unknown> = {};
      for (const c of CAMPOS) {
        const bruto = (form[c.chave as string] ?? "").trim();
        if (c.tipo === "numero") {
          patch[c.chave as string] = bruto === "" ? null : Number(bruto.replace(",", "."));
        } else {
          patch[c.chave as string] = bruto === "" ? null : bruto;
        }
      }
      await atualizarVenda(venda.id, patch);
      toast.success("Venda atualizada.");
      await onSalvo();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!venda} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar venda</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPOS.map((c) => (
            <div key={c.chave as string} className="space-y-1">
              <Label htmlFor={`venda-${c.chave as string}`}>{c.label}</Label>
              <Input
                id={`venda-${c.chave as string}`}
                type={c.tipo === "data" ? "date" : "text"}
                inputMode={c.tipo === "numero" ? "decimal" : undefined}
                value={form[c.chave as string] ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [c.chave as string]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()} disabled={salvando}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
