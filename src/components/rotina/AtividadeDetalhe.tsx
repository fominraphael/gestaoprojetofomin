import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, CalendarCheck } from "lucide-react";
import { AnexosUpload } from "@/components/rotina/AnexosUpload";
import {
  type Atividade,
  FREQUENCIA_LABELS,
  formatDiasSemana,
} from "@/lib/rotina";

export function AtividadeDetalhe() {
  const { id } = useParams({ from: "/_authenticated/_rotina/rotina/atividade/$id" });
  const { user, isAdmin } = useAuth();
  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [descricao, setDescricao] = useState("");
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rotina_atividades")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      toast.error("Atividade não encontrada.");
      setLoading(false);
      return;
    }
    setAtividade(data as any);
    setDescricao((data as any).descricao ?? "");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvarDescricao() {
    if (!atividade) return;
    setSalvando(true);
    const { error } = await supabase
      .from("rotina_atividades")
      .update({ descricao: descricao.trim() })
      .eq("id", atividade.id);
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAtividade({ ...atividade, descricao: descricao.trim() });
    setEditando(false);
    toast.success("Descrição atualizada.");
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!atividade) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Atividade não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" asChild>
        <Link
          to="/rotina/$setorId"
          params={{ setorId: atividade.setor_id ?? "" }}
          search={{ tab: "rotina" as const }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à Rotina Diária
        </Link>
      </Button>


      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{atividade.nome}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {FREQUENCIA_LABELS[atividade.frequencia]}
            </Badge>
            {atividade.frequencia === "semanal" && atividade.dias_semana && (
              <span className="text-sm text-muted-foreground">
                {formatDiasSemana(atividade.dias_semana)}
              </span>
            )}
            {atividade.frequencia === "mensal" && atividade.periodo_mensal && (
              <span className="text-sm text-muted-foreground">
                {atividade.periodo_mensal}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Descrição */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Descrição</CardTitle>
            {(isAdmin || atividade.created_by === user?.id) && !editando && (
              <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editando ? (
            <div className="space-y-2">
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={6}
                placeholder="Descreva esta atividade de rotina…"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={salvarDescricao} disabled={salvando}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {salvando ? "Salvando…" : "Salvar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditando(false);
                    setDescricao(atividade.descricao ?? "");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {atividade.descricao || "Nenhuma descrição adicionada."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Anexos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Anexos</CardTitle>
        </CardHeader>
        <CardContent>
          <AnexosUpload entidade="atividade" entidadeId={atividade.id} />
        </CardContent>
      </Card>
    </div>
  );
}
