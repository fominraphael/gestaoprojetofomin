import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Truck, Loader2, AlertTriangle, Search, Wrench } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute(
  "/_authenticated/_toyota/toyota/fila-preparador",
)({
  component: FilaPreparador,
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
  filial_destino_id: string | null;
  motivo_reprovacao: string | null;
  hsv_revisoes_pendentes: string[] | null;
  hsv_os_ajustes: string[] | null;
  hsv_observacoes_preparador: string | null;
}

function FilaPreparador() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("toyota_estoque_veiculos")
      .select(
        "id,chassi,placa,modelo,marca,ano_modelo,elegibilidade,status_aprovacao,filial_destino_id,motivo_reprovacao,hsv_revisoes_pendentes,hsv_os_ajustes,hsv_observacoes_preparador",
      )
      .in("status_aprovacao", ["pendente_preparacao", "devolvido_preparador"])
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

  const novos = filtrados.filter(
    (v) => v.status_aprovacao === "pendente_preparacao",
  );
  const devolvidos = filtrados.filter(
    (v) => v.status_aprovacao === "devolvido_preparador",
  );

  const entregar = async (v: Veiculo) => {
    setAcaoId(v.id);
    const { error } = await supabase
      .from("toyota_estoque_veiculos")
      .update({ status_aprovacao: "em_posvendas", enviado_posvendas_em: new Date().toISOString() })
      .eq("id", v.id);
    setAcaoId(null);
    if (error) {
      toast.error("Erro ao atualizar veículo");
      return;
    }
    toast.success("Veículo entregue ao Pós-Vendas");
    carregar();
  };

  const renderTabela = (lista: Veiculo[], devolvido: boolean) => {
    if (loading) {
      return (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }
    if (lista.length === 0) {
      return (
        <p className="text-center text-sm text-muted-foreground py-12">
          Nenhum veículo nesta fila.
        </p>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chassi / Placa</TableHead>
            <TableHead>Veículo</TableHead>
            <TableHead>Elegibilidade</TableHead>
            <TableHead>Orientações HSV</TableHead>
            {devolvido && <TableHead>Pendência da Central</TableHead>}
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <div className="font-mono text-xs">{v.chassi}</div>
                <div className="text-xs text-muted-foreground">
                  {v.placa ?? "—"}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{v.modelo ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {v.marca ?? "—"} · {v.ano_modelo ?? "—"}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{v.elegibilidade ?? "—"}</Badge>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="space-y-1 text-xs">
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
                  {v.hsv_observacoes_preparador ? (
                    <div className="text-muted-foreground">
                      {v.hsv_observacoes_preparador}
                    </div>
                  ) : null}
                  {!v.hsv_revisoes_pendentes?.length &&
                  !v.hsv_os_ajustes?.length &&
                  !v.hsv_observacoes_preparador ? (
                    <span className="text-muted-foreground">—</span>
                  ) : null}
                </div>
              </TableCell>
              {devolvido && (
                <TableCell className="max-w-xs">
                  <div className="flex items-start gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{v.motivo_reprovacao ?? "—"}</span>
                  </div>
                </TableCell>
              )}
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => entregar(v)}
                  disabled={acaoId === v.id}
                >
                  {acaoId === v.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Wrench className="h-3.5 w-3.5 mr-1" />
                  )}
                  Entregue ao Pós-Vendas
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" /> Fila do Preparador
        </h1>
        <p className="text-sm text-muted-foreground">
          Veículos aprovados pela Análise Central aguardando entrega ao
          Pós-Vendas (oficina).
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

      <Tabs defaultValue="novos" className="w-full">
        <TabsList>
          <TabsTrigger value="novos">
            Aprovados pelo ADM ({novos.length})
          </TabsTrigger>
          <TabsTrigger value="devolvidos">
            Devolvidos pela Central ({devolvidos.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="novos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pendentes de entrega</CardTitle>
            </CardHeader>
            <CardContent>{renderTabela(novos, false)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="devolvidos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Retornos da Análise Central
              </CardTitle>
            </CardHeader>
            <CardContent>{renderTabela(devolvidos, true)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground">
        <Link to="/toyota/fila-posvendas" className="underline">
          Ir para a Fila do Pós-Vendas →
        </Link>
      </div>
    </div>
  );
}
