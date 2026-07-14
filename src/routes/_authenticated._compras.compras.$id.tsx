import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { notificarChamado } from "@/lib/compras.functions";
import {
  STATUS_LABEL, TIPO_COMPRA_LABEL, TIPOS_DEBITO, MOTIVOS_PENDENCIA, MOTIVOS_CANCELAMENTO,
  MOTIVOS_SUSPENSAO, ADMIN_SUSPENSAO_ID,
  documentosRequeridos, type EstadoUF, type TipoPessoa, type StatusChamado,
} from "@/lib/compras";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Eye, CheckCircle2, XCircle, AlertCircle, ShoppingCart, Ban, Trash2, Eye as EyeIcon, UserCheck, History, Pencil, Save, X as XIcon, Download as DownloadIcon } from "lucide-react";


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
  assumido_por: string | null;
  assumido_em: string | null;
  motivo_suspensao: string | null;
  observacao_suspensao: string | null;
  suspenso_em: string | null;
  suspenso_por: string | null;
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
  id?: string;
  tipo: string;
  status: string;
  comprovante_path?: string | null;
  observacao?: string | null;
}
interface HistoricoItem {
  id: string;
  acao: string;
  motivo: string | null;
  observacao: string | null;
  campo: string | null;
  valor_antes: string | null;
  valor_depois: string | null;
  autor_id: string | null;
  created_at: string;
}

interface PendingFile { file: File; categoria: string; }

const CAMPOS_EDITAVEIS: { key: keyof EditForm; label: string; type?: "number" }[] = [
  { key: "nome", label: "Nome / Razão social" },
  { key: "cpf_cnpj", label: "CPF / CNPJ" },
  { key: "placa", label: "Placa" },
  { key: "chassi", label: "Chassi" },
  { key: "modelo", label: "Modelo" },
  { key: "ano_modelo", label: "Ano/Modelo" },
  { key: "codigo_avaliacao_nbs", label: "Código avaliação NBS" },
  { key: "valor_avaliado", label: "Valor avaliado", type: "number" },
];

type EditForm = {
  nome: string; cpf_cnpj: string; placa: string; chassi: string;
  modelo: string; ano_modelo: string; loja_estoque: string;
  codigo_avaliacao_nbs: string; valor_avaliado: string; status: StatusChamado;
};

function chamadoToEdit(c: Chamado): EditForm {
  return {
    nome: c.nome ?? "", cpf_cnpj: c.cpf_cnpj ?? "", placa: c.placa ?? "",
    chassi: c.chassi ?? "", modelo: c.modelo ?? "", ano_modelo: c.ano_modelo ?? "",
    loja_estoque: c.loja_estoque ?? "", codigo_avaliacao_nbs: c.codigo_avaliacao_nbs ?? "",
    valor_avaliado: c.valor_avaliado != null ? String(c.valor_avaliado) : "",
    status: c.status,
  };
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
  const [preview, setPreview] = useState<{ url: string; nome: string } | null>(null);

  const [dialogo, setDialogo] = useState<null | "pendenciar" | "resolver" | "comprar" | "cancelar" | "suspender" | "reativar">(null);
  const [motivo, setMotivo] = useState("");
  const [observ, setObserv] = useState("");

  const [modoAdmin, setModoAdmin] = useState<"visualizar" | "assumido" | null>(null);
  const [askAdmin, setAskAdmin] = useState(false);
  const askedRef = useRef(false);

  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [logOpen, setLogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [debitoPend, setDebitoPend] = useState<null | { tipo: string; label: string; statusValor: string; statusLabel: string; exigeAnexo: boolean; exigeDescricao: boolean }>(null);
  const [debObs, setDebObs] = useState("");
  const [debFile, setDebFile] = useState<File | null>(null);
  const [debSaving, setDebSaving] = useState(false);
  const [lojas, setLojas] = useState<{ valor: string; label: string }[]>([]);
  const [statusOpts, setStatusOpts] = useState<{ valor: string; label: string; grupo: string | null; exige_anexo: boolean; exige_descricao: boolean }[]>([]);

  useEffect(() => {
    (async () => {
      const [lojasRes, stRes] = await Promise.all([
        supabase.from("compras_cadastros").select("valor,label").eq("categoria", "loja_estoque").eq("ativo", true).order("ordem"),
        supabase.from("compras_cadastros").select("valor,label,grupo,exige_anexo,exige_descricao").eq("categoria", "status_debito").eq("ativo", true).order("ordem"),
      ]);
      setLojas((lojasRes.data as any) ?? []);
      setStatusOpts((stRes.data as any) ?? []);
    })();
  }, []);

  const statusesFor = useCallback(
    (tipo: string) => statusOpts.filter((s) => !s.grupo || s.grupo === tipo),
    [statusOpts],
  );

  const registrarHistorico = useCallback(
    async (payload: {
      acao: string; motivo?: string | null; observacao?: string | null;
      campo?: string | null; valor_antes?: string | null; valor_depois?: string | null;
      anexo_path?: string | null;
    }) => {
      await supabase.from("compras_historico").insert({
        chamado_id: id,
        autor_id: user?.id ?? null,
        acao: payload.acao,
        motivo: payload.motivo ?? null,
        observacao: payload.observacao ?? null,
        campo: payload.campo ?? null,
        valor_antes: payload.valor_antes ?? null,
        valor_depois: payload.valor_depois ?? null,
        anexo_path: payload.anexo_path ?? null,
      });
    },
    [id, user?.id],
  );


  const [autores, setAutores] = useState<Record<string, string>>({});

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
    const histRows = ((hist.data as any) ?? []) as HistoricoItem[];
    setHistorico(histRows);
    const ids = Array.from(new Set(histRows.map((h: any) => h.autor_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, nome_fantasia").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.nome_fantasia || p.username; });
      setAutores(map);
    } else setAutores({});
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Pergunta ao admin quando entra em processo não concluído
  useEffect(() => {
    if (!chamado || !isAdmin || askedRef.current) return;
    const finalizado = chamado.status === "comprado" || chamado.status === "cancelado";
    if (finalizado) return;
    if (chamado.assumido_por === user?.id) {
      setModoAdmin("assumido");
      askedRef.current = true;
      return;
    }
    askedRef.current = true;
    setAskAdmin(true);
  }, [chamado, isAdmin, user?.id]);

  useEffect(() => {
    console.log("=== DEBUG COMPRAS SEMINOVOS ===");
    console.log("Chamado Status Atual:", chamado?.status);
    console.log("Usuário Logado:", user);
    console.log("ID do Usuário Logado (user?.id):", user?.id);
    console.log("É Admin (isAdmin):", isAdmin);
    console.log("ID Autorizado para Suspensão (ADMIN_SUSPENSAO_ID):", ADMIN_SUSPENSAO_ID);
    console.log("Permissão 'podeAdminSuspensao':", isAdmin && user?.id === ADMIN_SUSPENSAO_ID);
    console.log("=================================");
  }, [chamado, user, isAdmin]);

  const isCriador = !!user && !!chamado && user.id === chamado.criado_por;
  const isCentral = isAdmin;
  const readOnlyAdmin = isAdmin && modoAdmin === "visualizar";

  const requisitos = useMemo(
    () => (chamado ? documentosRequeridos(chamado.estado_uf, chamado.tipo_pessoa) : []),
    [chamado],
  );

  const docsByCat = useMemo(() => {
    const map: Record<string, Documento[]> = {};
    for (const doc of documentos) (map[doc.categoria] ??= []).push(doc);
    return map;
  }, [documentos]);

  const requisitosCategorias = useMemo(
    () => requisitos.map((r) => ({ value: r.categoria, label: r.label })),
    [requisitos],
  );

  async function assumir() {
    if (!chamado || !user) return;
    const novoStatus: StatusChamado = chamado.status === "na_fila_central" ? "em_analise" : chamado.status;
    const { error } = await supabase
      .from("compras_chamados")
      .update({ assumido_por: user.id, assumido_em: new Date().toISOString(), status: novoStatus })
      .eq("id", chamado.id);
    if (error) { toast.error(error.message); return; }
    await registrarHistorico({
      acao: "assumido",
      valor_antes: chamado.status,
      valor_depois: novoStatus,
      campo: "status",
    });

    setModoAdmin("assumido");
    setAskAdmin(false);
    toast.success("Processo assumido.");
    carregar();
  }

  function guessCategoria(name: string): string {
    const lower = name.toLowerCase();
    const match = requisitos.find((r) => lower.includes(r.categoria.split("_")[0]));
    return match?.categoria ?? requisitos[0]?.categoria ?? "outros";
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    setPending((prev) => [
      ...prev,
      ...arr.map((f) => ({ file: f, categoria: guessCategoria(f.name) })),
    ]);
  }

  async function enviarPending() {
    if (!chamado || !user || pending.length === 0) return;
    setUploading(true);
    let ok = 0, fail = 0;
    try {
      for (const p of pending) {
        const path = `compras/${chamado.id}/${p.categoria}-${Date.now()}-${p.file.name}`;
        const { error: upErr } = await supabase.storage.from("documentos").upload(path, p.file);
        if (upErr) { fail++; toast.error(`${p.file.name}: ${upErr.message}`); continue; }
        const { error: insErr } = await supabase.from("compras_documentos").insert({
          chamado_id: chamado.id, categoria: p.categoria, storage_path: path, enviado_por: user.id,
        });
        if (insErr) { fail++; toast.error(`${p.file.name}: ${insErr.message}`); continue; }
        await registrarHistorico({ acao: "documento_anexado", observacao: p.file.name, campo: p.categoria });
        ok++;
      }
      setPending([]);
      if (ok > 0) toast.success(`${ok} documento(s) anexado(s)${fail ? ` — ${fail} falha(s)` : ""}.`);
      else if (fail > 0) toast.error(`Falha ao enviar ${fail} arquivo(s).`);
      carregar();
    } finally {
      setUploading(false);
    }
  }

  async function alterarStatus(novo: StatusChamado) {
    if (!chamado || novo === chamado.status) return;
    const updates: any = { status: novo };
    if (novo === "comprado") updates.concluido_em = new Date().toISOString();
    if (novo === "cancelado") updates.cancelado_em = new Date().toISOString();
    const { error } = await supabase.from("compras_chamados").update(updates).eq("id", chamado.id);
    if (error) { toast.error(error.message); return; }
    await registrarHistorico({ acao: "status_alterado", campo: "status", valor_antes: chamado.status, valor_depois: novo });
    toast.success("Status atualizado.");
    carregar();
  }

  async function abrirDoc(path: string) {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 300);
    if (error) { toast.error(error.message); return; }
    const nome = path.split("/").pop() || "documento";
    setPreview({ url: data.signedUrl, nome });
  }

  async function baixarDoc(path: string) {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 300, { download: true });
    if (error) { toast.error(error.message); return; }
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = path.split("/").pop() || "documento";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  async function excluirDoc(doc: Documento) {
    if (!confirm("Excluir este documento?")) return;
    await supabase.storage.from("documentos").remove([doc.storage_path]);
    const { error } = await supabase.from("compras_documentos").delete().eq("id", doc.id);
    if (error) { toast.error(error.message); return; }
    setDocumentos((prev) => prev.filter((d) => d.id !== doc.id));
    await registrarHistorico({ acao: "documento_removido", campo: doc.categoria, observacao: doc.storage_path });
  }

  async function marcarDebito(tipo: string, statusValor: string) {
    if (!chamado) return;
    const opt = statusOpts.find((s) => s.valor === statusValor && (!s.grupo || s.grupo === tipo));
    if (!opt) { toast.error("Status inválido."); return; }
    const tipoLabel = TIPOS_DEBITO.find((t) => t.key === tipo)?.label ?? tipo;
    if (opt.exige_anexo || opt.exige_descricao) {
      setDebObs(""); setDebFile(null);
      setDebitoPend({
        tipo, label: tipoLabel,
        statusValor: opt.valor, statusLabel: opt.label,
        exigeAnexo: opt.exige_anexo, exigeDescricao: opt.exige_descricao,
      });
      return;
    }
    const anterior = debitos.find((d) => d.tipo === tipo)?.status ?? null;
    setDebitos((prev) => {
      const idx = prev.findIndex((d) => d.tipo === tipo);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], status: statusValor }; return copy; }
      return [...prev, { tipo, status: statusValor }];
    });
    const { error } = await supabase.from("compras_debitos").upsert(
      { chamado_id: chamado.id, tipo, status: statusValor },
      { onConflict: "chamado_id,tipo" },
    );
    if (error) { toast.error(error.message); carregar(); return; }
    await registrarHistorico({ acao: "debito_marcado", campo: tipo, valor_antes: anterior, valor_depois: statusValor });
  }

  async function confirmarDebitoPendente() {
    if (!chamado || !debitoPend) return;
    if (debitoPend.exigeAnexo && !debFile) { toast.error("Anexo obrigatório para este status."); return; }
    if (debitoPend.exigeDescricao && !debObs.trim()) { toast.error("Descrição obrigatória para este status."); return; }
    setDebSaving(true);
    try {
      let path: string | null = null;
      if (debFile) {
        path = `compras/${chamado.id}/debitos/${debitoPend.tipo}-${Date.now()}-${debFile.name}`;
        const { error: upErr } = await supabase.storage.from("documentos").upload(path, debFile);
        if (upErr) { toast.error(upErr.message); return; }
      }
      const anterior = debitos.find((d) => d.tipo === debitoPend.tipo)?.status ?? null;
      const payload: any = {
        chamado_id: chamado.id, tipo: debitoPend.tipo, status: debitoPend.statusValor,
        observacao: debObs.trim() || null,
      };
      if (path) payload.comprovante_path = path;
      const { error } = await supabase.from("compras_debitos").upsert(payload, { onConflict: "chamado_id,tipo" });
      if (error) { toast.error(error.message); return; }
      setDebitos((prev) => {
        const idx = prev.findIndex((d) => d.tipo === debitoPend.tipo);
        const item: Debito = { tipo: debitoPend.tipo, status: debitoPend.statusValor, comprovante_path: path ?? undefined, observacao: debObs.trim() || undefined };
        if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], ...item }; return copy; }
        return [...prev, item];
      });
      await registrarHistorico({
        acao: "debito_status_alterado", campo: debitoPend.tipo,
        valor_antes: anterior, valor_depois: debitoPend.statusValor,
        observacao: debObs.trim() || null, anexo_path: path,
      });
      toast.success("Status registrado.");
      setDebitoPend(null);
    } finally { setDebSaving(false); }
  }


  async function enviarParaFila() {
    if (!chamado) return;

    // Valida obrigatoriedade de documentos e itens de checagem/débitos
    const { data: cad } = await supabase
      .from("compras_cadastros")
      .select("categoria,valor,label,uf,tipo_pessoa,obrigatorio")
      .in("categoria", ["documento", "tipo_debito"])
      .eq("ativo", true)
      .eq("obrigatorio", true);
    const uf = chamado.estado_uf;
    const tp = chamado.tipo_pessoa;
    const aplicaveis = ((cad as any[]) ?? []).filter(
      (c) => (!c.uf || c.uf === uf) && (!c.tipo_pessoa || c.tipo_pessoa === tp),
    );
    const docsFalt = aplicaveis
      .filter((c) => c.categoria === "documento")
      .filter((c) => !(documentos.some((d) => d.categoria === c.valor)))
      .map((c) => c.label);
    const debFalt = aplicaveis
      .filter((c) => c.categoria === "tipo_debito")
      .filter((c) => !debitos.some((d) => d.tipo === c.valor))
      .map((c) => c.label);
    if (docsFalt.length || debFalt.length) {
      const parts: string[] = [];
      if (docsFalt.length) parts.push(`Documentos obrigatórios pendentes: ${docsFalt.join(", ")}`);
      if (debFalt.length) parts.push(`Itens de checagem/débitos obrigatórios pendentes: ${debFalt.join(", ")}`);
      toast.error(parts.join(" • "));
      return;
    }

    const { error } = await supabase
      .from("compras_chamados")
      .update({ status: "na_fila_central" })
      .eq("id", chamado.id);
    if (error) { toast.error(error.message); return; }
    await registrarHistorico({
      acao: "enviado_fila_central", campo: "status",
      valor_antes: chamado.status, valor_depois: "na_fila_central",
    });

    toast.success("Enviado para a fila da Central.");
    carregar();
  }

  async function confirmarAcao() {
    if (!chamado || !dialogo) return;
    if ((dialogo === "pendenciar" || dialogo === "cancelar" || dialogo === "suspender") && !motivo) {
      toast.error("Informe o motivo."); return;
    }
    if (dialogo === "comprar" && !observ.trim()) {
      toast.error("Informe a observação da compra."); return;
    }
    const updates: any = {};
    let acao = "";
    if (dialogo === "pendenciar") {
      updates.status = "pendenciado";
      updates.motivo_pendencia = motivo;
      updates.observacao_pendencia = observ;
      acao = "pendenciado";
    } else if (dialogo === "resolver") {
      updates.status = "na_fila_central";
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
    } else if (dialogo === "suspender") {
      updates.status = "suspenso";
      updates.motivo_suspensao = motivo;
      updates.observacao_suspensao = observ || null;
      updates.suspenso_em = new Date().toISOString();
      updates.suspenso_por = user?.id ?? null;
      acao = "suspenso";
    } else if (dialogo === "reativar") {
      updates.status = "em_analise";
      updates.motivo_suspensao = null;
      updates.observacao_suspensao = null;
      updates.suspenso_em = null;
      updates.suspenso_por = null;
      acao = "reativado";
    }
    const { error } = await supabase.from("compras_chamados").update(updates).eq("id", chamado.id);
    if (error) { toast.error(error.message); return; }
    await registrarHistorico({
      acao, motivo, observacao: observ, campo: "status",
      valor_antes: chamado.status, valor_depois: updates.status,
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

  function abrirEdicao() {
    if (!chamado) return;
    setEditForm(chamadoToEdit(chamado));
    setEditOpen(true);
  }

  async function salvarEdicaoAdmin() {
    if (!chamado || !editForm) return;
    setSavingEdit(true);
    try {
      const atual = chamadoToEdit(chamado);
      const updates: Record<string, any> = {};
      const mudancas: { campo: string; label: string; antes: string; depois: string }[] = [];
      for (const { key, label, type } of CAMPOS_EDITAVEIS) {
        const antes = atual[key] ?? "";
        const depois = editForm[key] ?? "";
        if (antes === depois) continue;
        updates[key] = type === "number"
          ? (depois ? Number(String(depois).replace(",", ".")) : null)
          : (depois || null);
        mudancas.push({ campo: key as string, label, antes: String(antes), depois: String(depois) });
      }
      // Loja de estoque (select)
      if ((editForm.loja_estoque ?? "") !== (atual.loja_estoque ?? "")) {
        updates.loja_estoque = editForm.loja_estoque || null;
        mudancas.push({ campo: "loja_estoque", label: "Loja de estoque", antes: atual.loja_estoque, depois: editForm.loja_estoque });
      }
      // Status (select)
      if (editForm.status !== atual.status) {
        updates.status = editForm.status;
        if (editForm.status === "comprado") updates.concluido_em = new Date().toISOString();
        if (editForm.status === "cancelado") updates.cancelado_em = new Date().toISOString();
        mudancas.push({ campo: "status", label: "Status", antes: atual.status, depois: editForm.status });
      }
      if (mudancas.length === 0) { setEditOpen(false); return; }
      const { error } = await supabase.from("compras_chamados").update(updates as never).eq("id", chamado.id);

      if (error) { toast.error(error.message); return; }
      for (const m of mudancas) {
        await registrarHistorico({
          acao: m.campo === "status" ? "status_alterado" : "campo_alterado",
          campo: m.campo, valor_antes: m.antes, valor_depois: m.depois, observacao: m.label,
        });
      }
      toast.success(`${mudancas.length} campo(s) atualizado(s).`);
      setEditOpen(false);
      carregar();
    } finally { setSavingEdit(false); }
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  if (!chamado) return <div className="p-6">Chamado não encontrado.</div>;

  const finalizado = chamado.status === "comprado" || chamado.status === "cancelado";
  // Admin com permissão exclusiva de suspensão
  const podeAdminSuspensao = isAdmin && user?.id === ADMIN_SUSPENSAO_ID;
  const STATUS_EDITAVEIS_CRIADOR: StatusChamado[] = ["documentacao", "na_fila_central", "pendenciado"];
  const podeEditarDados =
    !finalizado &&
    (
      (isAdmin && !readOnlyAdmin) ||
      (isCriador && STATUS_EDITAVEIS_CRIADOR.includes(chamado.status))
    );
  const podeAgirCentral = isAdmin && modoAdmin === "assumido" && !finalizado;
  const podeEnviarFila = chamado.status === "documentacao" && (isCriador || (isAdmin && !readOnlyAdmin));
  const podePendenciar = podeAgirCentral && (chamado.status === "em_analise" || chamado.status === "na_fila_central" || chamado.status === "documentacao");
  const podeResolver = (isCriador || (isAdmin && !readOnlyAdmin)) && chamado.status === "pendenciado";
  const podeComprar = podeAgirCentral && (chamado.status === "em_analise" || chamado.status === "na_fila_central");
  const podeCancelar = isAdmin && !readOnlyAdmin && !finalizado;
  // Suspender: admin específico, chamado em análise ou na fila, não finalizado
  const podeSuspender = podeAdminSuspensao && !finalizado &&
    (chamado.status === "em_analise" || chamado.status === "na_fila_central");
  // Reativar: admin específico, chamado suspenso
  const podeReativar = podeAdminSuspensao && chamado.status === "suspenso";

  return (
    <div className="p-4 md:p-6 space-y-4 w-full">
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>
            <History className="w-4 h-4 mr-2" /> Log ({historico.length})
          </Button>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={abrirEdicao} disabled={readOnlyAdmin}>
              <Pencil className="w-4 h-4 mr-2" /> Editar dados
            </Button>
          )}

          {readOnlyAdmin && (
            <Badge variant="outline" className="text-xs gap-1"><EyeIcon className="w-3 h-3" /> Somente visualização</Badge>
          )}
          {isAdmin && modoAdmin === "visualizar" && !finalizado && (
            <Button size="sm" variant="outline" onClick={assumir}>
              <UserCheck className="w-4 h-4 mr-2" /> Assumir processo
            </Button>
          )}
          {isAdmin && !readOnlyAdmin && !finalizado ? (
            <Select value={chamado.status} onValueChange={(v) => alterarStatus(v as StatusChamado)}>
              <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as StatusChamado[])
                  .filter((s) => s !== "suspenso" || podeAdminSuspensao)
                  .map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="text-sm">{STATUS_LABEL[chamado.status]}</Badge>
          )}
        </div>
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

      {chamado.status === "suspenso" && (
        <Card className="border-purple-500/50 bg-purple-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <div className="font-medium text-purple-300">Chamado suspenso — aguardando terceiros</div>
                {chamado.motivo_suspensao && (
                  <div className="text-sm"><strong>Motivo:</strong> {chamado.motivo_suspensao}</div>
                )}
                {chamado.observacao_suspensao && (
                  <div className="text-sm"><strong>Obs:</strong> {chamado.observacao_suspensao}</div>
                )}
                {chamado.suspenso_em && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Suspenso em: {new Date(chamado.suspenso_em).toLocaleString("pt-BR")}
                  </div>
                )}
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
        <CardHeader>
          <CardTitle>Documentos ({chamado.estado_uf} • {chamado.tipo_pessoa})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          {podeEditarDados && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed rounded-md p-6 text-center text-sm transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <div>Arraste arquivos aqui ou</div>
              <label className="inline-block mt-2">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
                <Button variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">Selecionar arquivos</span>
                </Button>
              </label>
            </div>
          )}

          {/* Fila de pendentes */}
          {pending.length > 0 && (
            <div className="space-y-2 rounded-md border border-border p-3 bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground">
                {pending.length} arquivo(s) para enviar — selecione a categoria de cada um
              </div>
              {pending.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 truncate text-sm">{p.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(p.file.size / 1024).toFixed(0)} KB
                  </div>
                  <Select
                    value={p.categoria}
                    onValueChange={(v) => setPending((prev) => prev.map((x, j) => j === i ? { ...x, categoria: v } : x))}
                  >
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {requisitosCategorias.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setPending([])}>Limpar</Button>
                <Button size="sm" onClick={enviarPending} disabled={uploading}>
                  {uploading ? "Enviando…" : `Enviar ${pending.length} arquivo(s)`}
                </Button>
              </div>
            </div>
          )}

          {/* Grade de requisitos */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {requisitos.map((req) => {
              const enviados = docsByCat[req.categoria] ?? [];
              return (
                <div key={req.categoria} className="flex items-start justify-between gap-3 border border-border rounded-md p-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {enviados.length > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{req.label}</div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {enviados.length} arquivo(s)
                      </div>
                      {enviados.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {enviados.map((d) => (
                            <div key={d.id} className="inline-flex items-center gap-1 rounded bg-muted/40 px-1.5 py-0.5 text-xs">
                              <button onClick={() => abrirDoc(d.storage_path)} className="hover:underline inline-flex items-center gap-1">
                                <Eye className="w-3 h-3" /> ver
                              </button>
                              <button onClick={() => baixarDoc(d.storage_path)} className="hover:underline inline-flex items-center gap-1 text-foreground/80" title="Baixar">
                                <DownloadIcon className="w-3 h-3" />
                              </button>
                              {podeEditarDados && (
                                <button onClick={() => excluirDoc(d)} className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                          ))}
                        </div>
                      )}
                      {podeEditarDados && (
                        <label className="inline-block mt-2">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                const arr = Array.from(e.target.files);
                                setPending((prev) => [...prev, ...arr.map((f) => ({ file: f, categoria: req.categoria }))]);
                              }
                              e.target.value = "";
                            }}
                          />
                          <span className="cursor-pointer text-xs text-primary hover:underline inline-flex items-center gap-1">
                            <Upload className="w-3 h-3" /> Anexar
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Débitos / itens de checagem</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TIPOS_DEBITO.map((t) => {
              const atual = debitos.find((d) => d.tipo === t.key);
              const opts = statusesFor(t.key);
              return (
                <div key={t.key} className="flex items-center justify-between gap-3 border border-border rounded-md p-2">
                  <div className="text-sm font-medium">{t.label}</div>
                  <Select
                    value={atual?.status ?? ""}
                    onValueChange={(v) => marcarDebito(t.key, v)}
                    disabled={!podeEditarDados || opts.length === 0}
                  >
                    <SelectTrigger className="w-44"><SelectValue placeholder={opts.length === 0 ? "Sem status" : "Marcar"} /></SelectTrigger>
                    <SelectContent>
                      {opts.map((s) => (
                        <SelectItem key={s.valor} value={s.valor}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {podeEnviarFila && (
            <Button onClick={enviarParaFila}>Enviar para a fila (Central)</Button>
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
          {podeSuspender && (
            <Button
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
              onClick={() => setDialogo("suspender")}
            >
              <AlertCircle className="w-4 h-4 mr-2" /> Suspender
            </Button>
          )}
          {podeReativar && (
            <Button
              variant="outline"
              className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
              onClick={() => setDialogo("reativar")}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Reativar
            </Button>
          )}
          {podeCancelar && (
            <Button variant="destructive" onClick={() => setDialogo("cancelar")}>
              <Ban className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          )}
          {readOnlyAdmin && (
            <span className="text-xs text-muted-foreground self-center">
              Assuma o processo para tomar ações.
            </span>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Log de auditoria */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log do chamado</DialogTitle>
            <DialogDescription>Todas as ações e alterações registradas.</DialogDescription>
          </DialogHeader>
          {historico.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem eventos.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {historico.map((h) => (
                <li key={h.id} className="border border-border rounded-md p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{h.acao}{h.campo ? ` • ${h.campo}` : ""}</span>
                    <span className="text-xs text-muted-foreground">
                      {(h as any).autor_id ? `${autores[(h as any).autor_id] ?? "usuário"} • ` : ""}
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {(h.valor_antes !== null || h.valor_depois !== null) && (
                    <div className="text-xs mt-1">
                      <span className="text-muted-foreground line-through">{h.valor_antes ?? "—"}</span>
                      {" → "}
                      <span className="font-medium">{h.valor_depois ?? "—"}</span>
                    </div>
                  )}
                  {h.motivo && <div className="text-xs mt-1">Motivo: {h.motivo}</div>}
                  {h.observacao && <div className="text-xs text-muted-foreground mt-1">{h.observacao}</div>}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Edição admin */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar dados do chamado</DialogTitle>
            <DialogDescription>Alterações ficam registradas no log com valor anterior e novo.</DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="grid md:grid-cols-2 gap-3">
              {CAMPOS_EDITAVEIS.map(({ key, label, type }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    type={type ?? "text"}
                    value={editForm[key] as string}
                    onChange={(e) => setEditForm((f) => f ? { ...f, [key]: e.target.value } : f)}
                  />
                </div>
              ))}
              <div>
                <Label>Loja de estoque</Label>
                <Select
                  value={editForm.loja_estoque}
                  onValueChange={(v) => setEditForm((f) => f ? { ...f, loja_estoque: v } : f)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {lojas.map((l) => (
                      <SelectItem key={l.valor} value={l.valor}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm((f) => f ? { ...f, status: v as StatusChamado } : f)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as StatusChamado[])
                      .filter((s) => s !== "suspenso" || podeAdminSuspensao)
                      .map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              <XIcon className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={salvarEdicaoAdmin} disabled={savingEdit}>
              <Save className="w-4 h-4 mr-2" /> {savingEdit ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pendência de débito (anexo obrigatório) */}
      <Dialog open={!!debitoPend} onOpenChange={(o) => !o && setDebitoPend(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{debitoPend?.label} → {debitoPend?.statusLabel}</DialogTitle>
            <DialogDescription>
              {[debitoPend?.exigeDescricao ? "descrição" : null, debitoPend?.exigeAnexo ? "anexo" : null]
                .filter(Boolean).join(" e ")} obrigatório(s) para este status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Descrição {debitoPend?.exigeDescricao && "*"}</Label>
              <Textarea rows={3} value={debObs} onChange={(e) => setDebObs(e.target.value)} />
            </div>
            <div>
              <Label>Anexo {debitoPend?.exigeAnexo && "*"}</Label>
              <Input type="file" onChange={(e) => setDebFile(e.target.files?.[0] ?? null)} />
              {debFile && <div className="text-xs text-muted-foreground mt-1">{debFile.name}</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebitoPend(null)}>Cancelar</Button>
            <Button onClick={confirmarDebitoPendente} disabled={debSaving}>
              {debSaving ? "Salvando…" : "Confirmar pendência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Diálogo Admin: visualizar ou assumir */}
      <Dialog open={askAdmin} onOpenChange={setAskAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como deseja acessar este processo?</DialogTitle>
            <DialogDescription>
              Você pode apenas visualizar sem alterar nada, ou assumir o processo para tomar ações da Central.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setModoAdmin("visualizar"); setAskAdmin(false); }}>
              <EyeIcon className="w-4 h-4 mr-2" /> Apenas visualizar
            </Button>
            <Button onClick={assumir}>
              <UserCheck className="w-4 h-4 mr-2" /> Assumir processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dialogo} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogo === "pendenciar" && "Pendenciar chamado"}
              {dialogo === "resolver" && "Resolver pendência"}
              {dialogo === "comprar" && "Confirmar compra"}
              {dialogo === "cancelar" && "Cancelar chamado"}
              {dialogo === "suspender" && "Suspender chamado"}
              {dialogo === "reativar" && "Reativar chamado suspenso"}
            </DialogTitle>
            {dialogo === "suspender" && (
              <DialogDescription>
                O chamado ficará suspenso até que terceiros resolvam a pendência. Apenas você poderá reativá-lo.
              </DialogDescription>
            )}
            {dialogo === "reativar" && (
              <DialogDescription>
                O chamado voltará para o status "Em análise (Central)" para continuar o processo.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {(dialogo === "pendenciar" || dialogo === "cancelar" || dialogo === "suspender") && (
              <div>
                <Label>Motivo</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(
                      dialogo === "pendenciar" ? MOTIVOS_PENDENCIA
                      : dialogo === "suspender" ? MOTIVOS_SUSPENSAO
                      : MOTIVOS_CANCELAMENTO
                    ).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dialogo !== "reativar" && (
              <div>
                <Label>
                  Observação{dialogo === "comprar" && <span className="text-red-500"> *</span>}
                </Label>
                <Textarea
                  rows={3}
                  value={observ}
                  onChange={(e) => setObserv(e.target.value)}
                  placeholder={dialogo === "comprar" ? "Obrigatório: descreva condições, valores acordados, etc." : ""}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>Fechar</Button>
            <Button onClick={confirmarAcao}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-border gap-2">
              <div className="text-sm font-semibold text-foreground truncate">{preview.nome}</div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={() => { const a = document.createElement("a"); a.href = preview.url; a.download = preview.nome; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}>
                  <DownloadIcon className="w-3.5 h-3.5 mr-1" /> Baixar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreview(null)}>
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-muted/30">
              {/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(preview.nome) ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                  <img src={preview.url} alt={preview.nome} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <iframe src={preview.url} title={preview.nome} className="w-full h-full border-0" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

