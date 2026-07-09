import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL, TIPO_COMPRA_LABEL, type StatusChamado } from "@/lib/compras";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_compras/compras/")({
  errorComponent: ModuleErrorBoundary,
  component: ComprasIndex,
});

interface ChamadoRow {
  id: string;
  placa: string;
  nome: string;
  tipo_pessoa: string;
  tipo_compra: string;
  estado_uf: string;
  status: StatusChamado;
  created_at: string;
  valor_avaliado: number | null;
}

const STATUS_VARIANT: Record<StatusChamado, string> = {
  documentacao: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  em_analise: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  pendenciado: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  comprado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelado: "bg-red-500/15 text-red-300 border-red-500/30",
};

function ComprasIndex() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChamadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("todos");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("compras_chamados")
        .select("id, placa, nome, tipo_pessoa, tipo_compra, estado_uf, status, created_at, valor_avaliado")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== "todos" && r.status !== status) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return (
          r.placa?.toLowerCase().includes(q) ||
          r.nome?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, busca, status]);

  return (
    <div className="p-6 space-y-4 max-w-none">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Chamados de Compra</h1>
          <p className="text-sm text-muted-foreground">Compras Seminovos — fluxo completo</p>
        </div>
        <Button onClick={() => navigate({ to: "/compras/novo" })}>
          <Plus className="w-4 h-4 mr-2" /> Novo chamado
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa ou nome"
            className="pl-8 w-72"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as StatusChamado[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>PF/PJ</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Tipo compra</TableHead>
              <TableHead>Valor avaliado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum chamado.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.placa}</TableCell>
                <TableCell>{r.nome}</TableCell>
                <TableCell>{r.tipo_pessoa}</TableCell>
                <TableCell>{r.estado_uf}</TableCell>
                <TableCell>{TIPO_COMPRA_LABEL[r.tipo_compra as keyof typeof TIPO_COMPRA_LABEL] ?? r.tipo_compra}</TableCell>
                <TableCell>{r.valor_avaliado != null ? `R$ ${Number(r.valor_avaliado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_VARIANT[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <Link to="/compras/$id" params={{ id: r.id }} className="text-primary text-sm hover:underline">
                    Abrir
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
