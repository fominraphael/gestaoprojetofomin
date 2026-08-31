import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/estoque-motor";
import {
  atualizarAnuncio,
  getAnunciosCompletos,
  moverAnuncioParaLixeira,
  restaurarAnuncio,
  type AnuncioRow,
} from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/_estoque-matriz/estoque-matriz/anunciados")({
  errorComponent: ModuleErrorBoundary,
  head: () => ({
    meta: [
      { title: "Veículos Anunciados — Análise de Estoque Matriz" },
      {
        name: "description",
        content:
          "Veículos importados como anunciados, com edição dos campos, exclusão e filtros por chassi e placa.",
      },
      { property: "og:title", content: "Veículos Anunciados — Análise de Estoque Matriz" },
      {
        property: "og:description",
        content: "Gerencie os veículos anunciados importados das plataformas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnunciadosPage,
});

const CAMPOS: { chave: keyof AnuncioRow; label: string; tipo: "texto" | "numero" }[] = [
  { chave: "chassi", label: "Chassi", tipo: "texto" },
  { chave: "codigo", label: "Código", tipo: "texto" },
  { chave: "conta", label: "Conta", tipo: "texto" },
  { chave: "placa", label: "Placa", tipo: "texto" },
  { chave: "marca", label: "Marca", tipo: "texto" },
  { chave: "modelo", label: "Modelo", tipo: "texto" },
  { chave: "versao", label: "Versão", tipo: "texto" },
  { chave: "ano_fabricacao", label: "Ano de fabricação", tipo: "texto" },
  { chave: "ano_modelo", label: "Ano modelo", tipo: "texto" },
  { chave: "cor", label: "Cor", tipo: "texto" },
  { chave: "km", label: "KM", tipo: "numero" },
  { chave: "preco_venda", label: "Preço de venda", tipo: "numero" },
  { chave: "qtd_fotos", label: "Qtd. fotos", tipo: "numero" },
  { chave: "status", label: "Status", tipo: "texto" },
];

const CANAIS: { chave: keyof AnuncioRow; label: string }[] = [
  { chave: "canal_site_proprio", label: "Site próprio" },
  { chave: "canal_olx", label: "OLX" },
  { chave: "canal_webmotors", label: "WebMotors" },
];

function AnunciadosPage() {
  const qc = useQueryClient();
  const [lixeira, setLixeira] = useState(false);
  const [chassi, setChassi] = useState("");
  const [placa, setPlaca] = useState("");
  const [editando, setEditando] = useState<AnuncioRow | null>(null);

  const { data: anuncios = [] } = useQuery({
    queryKey: ["estoque", "anunciados", lixeira],
    queryFn: () => getAnunciosCompletos({ lixeira }),
  });

  const filtrados = useMemo(() => {
    const c = chassi.trim().toLowerCase();
    const p = placa.trim().toLowerCase();
    return anuncios.filter((a) => {
      if (c && !a.chassi.toLowerCase().includes(c)) return false;
      if (p && !(a.placa ?? "").toLowerCase().includes(p)) return false;
      return true;
    });
  }, [anuncios, chassi, placa]);

  const recarregar = () => qc.invalidateQueries({ queryKey: ["estoque", "anunciados"] });

  const excluir = async (a: AnuncioRow) => {
    try {
      await moverAnuncioParaLixeira(a.id);
      toast.success("Anúncio movido para a lixeira.");
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  const restaurar = async (a: AnuncioRow) => {
    try {
      await restaurarAnuncio(a.id);
      toast.success("Anúncio restaurado.");
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
            <Megaphone className="w-5 h-5 text-primary" /> Veículos Anunciados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todos os veículos importados como anunciados. Edite os campos, exclua registros (vão
            para a lixeira) e filtre por chassi ou placa.
          </p>
        </div>
        <Button variant={lixeira ? "default" : "outline"} onClick={() => setLixeira((l) => !l)}>
          {lixeira ? "Ver ativos" : "Ver lixeira"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="w-full sm:w-[240px]"
          placeholder="Filtrar por chassi"
          value={chassi}
          onChange={(e) => setChassi(e.target.value)}
        />
        <Input
          className="w-full sm:w-[180px]"
          placeholder="Filtrar por placa"
          value={placa}
          onChange={(e) => setPlaca(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Modelo</th>
              <th className="px-3 py-2 font-medium">Chassi</th>
              <th className="px-3 py-2 font-medium">Placa</th>
              <th className="px-3 py-2 font-medium">Ano modelo</th>
              <th className="px-3 py-2 font-medium text-right">KM</th>
              <th className="px-3 py-2 font-medium text-right">Preço</th>
              <th className="px-3 py-2 font-medium text-right">Fotos</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Canais</th>
              <th className="px-3 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhum veículo anunciado encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2">{a.modelo ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.chassi}</td>
                <td className="px-3 py-2">{a.placa ?? "—"}</td>
                <td className="px-3 py-2">{a.ano_modelo ?? "—"}</td>
                <td className="px-3 py-2 text-right">{a.km ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatBRL(a.preco_venda)}</td>
                <td className="px-3 py-2 text-right">{a.qtd_fotos ?? "—"}</td>
                <td className="px-3 py-2">{a.status ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {[
                    a.canal_site_proprio ? "Site" : null,
                    a.canal_olx ? "OLX" : null,
                    a.canal_webmotors ? "WM" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    {lixeira ? (
                      <Button size="icon" variant="ghost" onClick={() => void restaurar(a)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setEditando(a)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void excluir(a)}>
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
        {filtrados.length} de {anuncios.length} veículos anunciados
      </p>

      <EditarAnuncioDialog
        anuncio={editando}
        onClose={() => setEditando(null)}
        onSalvo={recarregar}
      />
    </div>
  );
}

interface EditarAnuncioDialogProps {
  anuncio: AnuncioRow | null;
  onClose: () => void;
  onSalvo: () => void | Promise<unknown>;
}

function EditarAnuncioDialog({ anuncio, onClose, onSalvo }: EditarAnuncioDialogProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [canais, setCanais] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [chaveCarregada, setChaveCarregada] = useState("");

  const chaveAtual = anuncio?.id ?? "";
  if (anuncio && chaveAtual !== chaveCarregada) {
    const inicial: Record<string, string> = {};
    for (const c of CAMPOS) {
      const valor = anuncio[c.chave];
      inicial[c.chave as string] = valor == null ? "" : String(valor);
    }
    setForm(inicial);
    setCanais({
      canal_site_proprio: anuncio.canal_site_proprio,
      canal_olx: anuncio.canal_olx,
      canal_webmotors: anuncio.canal_webmotors,
    });
    setChaveCarregada(chaveAtual);
  }

  const salvar = async () => {
    if (!anuncio) return;
    setSalvando(true);
    try {
      const patch: Record<string, unknown> = { ...canais };
      for (const c of CAMPOS) {
        const bruto = (form[c.chave as string] ?? "").trim();
        if (c.chave === "chassi") {
          if (!bruto) {
            toast.error("Chassi é obrigatório.");
            setSalvando(false);
            return;
          }
          patch["chassi"] = bruto;
          continue;
        }
        patch[c.chave as string] =
          c.tipo === "numero"
            ? bruto === ""
              ? null
              : Number(bruto.replace(",", "."))
            : bruto === ""
              ? null
              : bruto;
      }
      await atualizarAnuncio(anuncio.id, patch);
      toast.success("Anúncio atualizado.");
      await onSalvo();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!anuncio} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar veículo anunciado</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPOS.map((c) => (
            <div key={c.chave as string} className="space-y-1">
              <Label htmlFor={`anuncio-${c.chave as string}`}>{c.label}</Label>
              <Input
                id={`anuncio-${c.chave as string}`}
                inputMode={c.tipo === "numero" ? "decimal" : undefined}
                value={form[c.chave as string] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [c.chave as string]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          {CANAIS.map((c) => (
            <label key={c.chave as string} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!canais[c.chave as string]}
                onCheckedChange={(v) =>
                  setCanais((s) => ({ ...s, [c.chave as string]: v === true }))
                }
              />
              {c.label}
            </label>
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
