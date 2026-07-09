import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { notificarChamado } from "@/lib/compras.functions";
import {
  STATUS_LABEL, TIPO_COMPRA_LABEL, TIPOS_DEBITO, MOTIVOS_PENDENCIA, MOTIVOS_CANCELAMENTO,
  documentosRequeridos, type EstadoUF, type TipoPessoa, type StatusChamado,
} from "@/lib/compras";
import { ArrowLeft, Upload, Eye, CheckCircle2, XCircle, AlertCircle, ShoppingCart, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_compras/compras/$id")({
  errorComponent: ModuleErrorBoundary,
  component: DetalheChamado,
});

interface Chamado {
  id: string;
  criado_por: string;
  tipo_pessoa: TipoPessoa;
  estado_uf: EstadoUF;
  status: StatusChamado;
  nome: string;
  cpf_cnpj: string;
  placa: string;
  chassi: string | null;
  modelo: string | null;
  ano_modelo: string | null;
  tipo_compra: string;
  valor_avaliado: number | null;
  loja_estoque: string | null;
  codigo_avaliacao_nbs: string | null;
  motivo_pendencia: string | null;
  observacao_pendencia: string | null;
  motivo_cancelamento: string | null;
  observacao_cancelamento: string | null;
  observacao_compra: string | null;
  nf_status: string | null;
  nf_observacao: string | null;
  created_at: string;
}

interface Documento {
  id: string;
  categoria: string;
  descricao: string | null;
  storage_path: string;
  created_at: string;
}
interface Debito {
  id: string;
  tipo: string;
  status: "pago" | "pendente";
  comprovante_path: string | null;
  observacao: string | null;
}
interface HistoricoItem {
  id: string;
  acao: string;
  motivo: string | null;
  observacao: string | null;
  created_at: string;
}

function DetalheChamado() {
  const { id } = useParams({ from: "/_authenticated/_compras/compras/$id" });
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const notificar = useServerFn(notificarChamado);

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [debitos, setDebitos] = useState<Debito[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogo, setDialogo] = useState<null | "pendenciar" | "resolver" | "comprar" | "cancelar">(null);
  const [motivo, setMotivo] = useState("");
  const [observ, setObserv] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [c, d, deb, hist] = await Promise.all([
      supabase.from("compras_chamados").select("*").eq("id", id).maybeSingle(),
      supabase.from("compras_documentos").select("*").eq("chamado_id", id).order("created_at"),
      supabase.from("compras_debitos").select("*").eq("chamado_id", id),
      supabase.from("compras_historico").select("*").eq("chamado_id", id).order("created_at", { ascending: false }),
    ]);
    setChamado((c.data as any) ?? null);
    setDocumentos((d.data as any) ?? []);
    setDebitos((deb.data as any) ?? []);
    setHistorico((hist.data as any) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const isCriador = !!user && !!chamado && user.id === chamado.criado_por;
  const isCentral = isAdmin; // perfil Central = admin nesta iteração

  const requisitos = useMemo(
    () => (chamado ? documentosRequeridos(chamado.estado_uf, chamado.tipo_pessoa) : []),
    [chamado],
  );

  const docsByCat = useMemo(() => {
    const map: Record<string, Documento[]> = {};
    for (const doc of documentos) (map[doc.categoria] ??= []).push(doc);
    return map;
  }, [documentos]);

  async function uploadDoc(categoria: string, file: File) {
    if (!chamado || !user) return;
    const path = `compras/${chamado.id}/${categoria}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { error: insErr } = await supabase.from("compras_documentos").insert({
      chamado_id: chamado.id, categoria, storage_path: path, enviado_por: user.id,
    });
    if (insErr) { toast.error(insErr.message); return; }
    await supabase.from("compras_historico").insert({
      chamado_id: chamado.id, acao: "documento_anexado", observacao: categoria, autor_id: user.id,
    });
    toast.success("Documento anexado.");
    carregar();
  }

  async function abrirDoc(path: string) {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function marcarDebito(tipo: string, status: "pago" | "pendente", obs?: string) {
    if (!chamado) return;
    const { error } = await supabase.from("compras_debitos").upsert(
      { chamado_id: chamado.id, tipo, status, observacao: obs ?? null },
      { onConflict: "chamado_id,tipo" },
    );
    if (error) { toast.error(error.message); return; }
    carregar();
  }

  async function enviarParaAnalise() {
    if (!chamado) return;
    const { error } = await supabase
      .from("compras_chamados")
      .update({ status: "em_analise" })
      .eq("id", chamado.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("compras_historico").insert({
      chamado_id: chamado.id, acao: "enviado_analise", autor_id: user?.id,
    });
    toast.success("Enviado para análise da Central.");
    carregar();
  }

  async function confirmarAcao() {
    if (!chamado || !dialogo) return;
    if ((dialogo === "pendenciar" || dialogo === "cancelar") && !motivo) {
      toast.error("Informe o motivo.");
      return;
    }
    const updates: any = {};
    let acao = "";
    if (dialogo === "pendenciar") {
      updates.status = "pendenciado";
      updates.motivo_pendencia = motivo;
      updates.observacao_pendencia = observ;
      acao = "pendenciado";
    } else if (dialogo === "resolver") {
      updates.status = "em_analise";
      updates.motivo_pendencia = null;
      updates.observacao_pendencia = null;
      acao = "resolvido";
    } else if (dialogo === "comprar") {
      updates.status = "comprado";
      updates.concluido_em = new Date().toISOString();
      updates.observacao_compra = observ;
      acao = "comprado";
    } else if (dialogo === "cancelar") {
      updates.status = "cancelado";
      updates.cancelado_em = new Date().toISOString();
      updates.motivo_cancelamento = motivo;
      updates.observacao_cancelamento = observ;
      acao = "cancelado";
    }
    const { error } = await supabase.from("compras_chamados").update(updates).eq("id", chamado.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("compras_historico").insert({
      chamado_id: chamado.id, acao, motivo, observacao: observ, autor_id: user?.id,
    });
    if (dialogo === "pendenciar" || dialogo === "resolver") {
      try {
        await notificar({ data: { chamadoId: chamado.id, tipo: dialogo === "pendenciar" ? "pendenciado" : "resolvido", motivo, observacao: observ } });
      } catch {/* email é best-effort */}
    }
    toast.success("Ação registrada.");
    setDialogo(null); setMotivo(""); setObserv("");
    carregar();
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (!chamado) return <div className="p-6">Chamado não encontrado.</div>;

  const podeEnviarAnalise = chamado.status === "documentacao" && (isCriador || isCentral);
  const podePendenciar = isCentral && (chamado.status === "em_analise" || chamado.status === "documentacao");
  const podeResolver = isCriador && chamado.status === "pendenciado";
  const podeComprar = isCentral && chamado.status === "em_analise";
  const podeCancelar = (isCentral || isCriador) && chamado.status !== "comprado" && chamado.status !== "cancelado";

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/compras" })}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{chamado.placa} — {chamado.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {chamado.tipo_pessoa} • {chamado.estado_uf} • {TIPO_COMPRA_LABEL[chamado.tipo_compra as keyof typeof TIPO_COMPRA_LABEL]}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">{STATUS_LABEL[chamado.status]}</Badge>
      </div>

      {chamado.status === "pendenciado" && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <div className="font-medium">Chamado pendenciado</div>
                <div className="text-sm"><strong>Motivo:</strong> {chamado.motivo_pendencia}</div>
                {chamado.observacao_pendencia && <div className="text-sm"><strong>Obs:</strong> {chamado.observacao_pendencia}</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Dados do veículo</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><strong>Chassi:</strong> {chamado.chassi ?? "-"}</div>
            <div><strong>Modelo:</strong> {chamado.modelo ?? "-"} {chamado.ano_modelo ?? ""}</div>
            <div><strong>Loja estoque:</strong> {chamado.loja_estoque ?? "-"}</div>
            <div><strong>Cód. avaliação NBS:</strong> {chamado.codigo_avaliacao_nbs ?? "-"}</div>
            <div><strong>Valor avaliado:</strong> {chamado.valor_avaliado != null ? `R$ ${Number(chamado.valor_avaliado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><strong>Nome/Razão:</strong> {chamado.nome}</div>
            <div><strong>{chamado.tipo_pessoa === "PF" ? "CPF" : "CNPJ"}:</strong> {chamado.cpf_cnpj}</div>
            {chamado.tipo_pessoa === "PJ" && (
              <div><strong>Status NF:</strong> {chamado.nf_status ?? "-"}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Documentos ({chamado.estado_uf} • {chamado.tipo_pessoa})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requisitos.map((req) => {
            const enviados = docsByCat[req.categoria] ?? [];
            return (
              <div key={req.categoria} className="flex items-center justify-between gap-3 border border-border rounded-md p-2">
                <div className="flex items-center gap-2 min-w-0">
                  {enviados.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{req.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {enviados.length} arquivo(s)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {enviados.map((d) => (
                    <Button key={d.id} variant="ghost" size="sm" onClick={() => abrirDoc(d.storage_path)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  ))}
                  <label>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(req.categoria, f); e.target.value = ""; }}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer inline-flex items-center"><Upload className="w-4 h-4 mr-1" /> Enviar</span>
                    </Button>
                  </label>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Débitos / itens de checagem</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {TIPOS_DEBITO.map((t) => {
            const atual = debitos.find((d) => d.tipo === t.key);
            return (
              <div key={t.key} className="flex items-center justify-between gap-3 border border-border rounded-md p-2">
                <div className="text-sm font-medium">{t.label}</div>
                <div className="flex items-center gap-2">
                  <Select
                    value={atual?.status ?? ""}
                    onValueChange={(v) => marcarDebito(t.key, v as "pago" | "pendente")}
                  >
                    <SelectTrigger className="w-40"><SelectValue placeholder="Marcar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago">Pago / OK</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {podeEnviarAnalise && (
            <Button onClick={enviarParaAnalise}>Enviar para análise Central</Button>
          )}
          {podePendenciar && (
            <Button variant="outline" onClick={() => setDialogo("pendenciar")}>
              <AlertCircle className="w-4 h-4 mr-2" /> Pendenciar
            </Button>
          )}
          {podeResolver && (
            <Button onClick={() => setDialogo("resolver")}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Resolver pendência
            </Button>
          )}
          {podeComprar && (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialogo("comprar")}>
              <ShoppingCart className="w-4 h-4 mr-2" /> Comprar
            </Button>
          )}
          {podeCancelar && (
            <Button variant="destructive" onClick={() => setDialogo("cancelar")}>
              <Ban className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem eventos.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {historico.map((h) => (
                <li key={h.id} className="border-b border-border pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{h.acao}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {h.motivo && <div className="text-xs">Motivo: {h.motivo}</div>}
                  {h.observacao && <div className="text-xs text-muted-foreground">{h.observacao}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dialogo} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogo === "pendenciar" && "Pendenciar chamado"}
              {dialogo === "resolver" && "Resolver pendência"}
              {dialogo === "comprar" && "Confirmar compra"}
              {dialogo === "cancelar" && "Cancelar chamado"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(dialogo === "pendenciar" || dialogo === "cancelar") && (
              <div>
                <Label>Motivo</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(dialogo === "pendenciar" ? MOTIVOS_PENDENCIA : MOTIVOS_CANCELAMENTO).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Observação</Label>
              <Textarea rows={3} value={observ} onChange={(e) => setObserv(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>Fechar</Button>
            <Button onClick={confirmarAcao}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
