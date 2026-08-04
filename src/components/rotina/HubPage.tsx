import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarCheck,
  Target,
  Megaphone,
  Save,
  ArrowRight,
} from "lucide-react";
import { KpiCard } from "@/components/rotina/KpiCard";
import { AvisosMural } from "@/components/rotina/AvisosMural";
import { useAuth } from "@/hooks/use-auth";
import type { Setor, Kpi, KpiHistorico, Missao } from "@/lib/rotina";

export function HubPage() {
  const { isAdmin } = useAuth();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [historico, setHistorico] = useState<KpiHistorico[]>([]);
  const [missao, setMissao] = useState<Missao | null>(null);
  const [editMissao, setEditMissao] = useState("");
  const [editandoMissao, setEditandoMissao] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [setoresRes, kpisRes, histRes, missaoRes] = await Promise.all([
      supabase.from("rotina_setores").select("*").eq("ativo", true).order("ordem"),
      supabase.from("rotina_kpis").select("*").eq("ativo", true).order("ordem"),
      supabase.from("rotina_kpi_historico").select("*"),
      supabase.from("rotina_missao").select("*").limit(1).single(),
    ]);
    setSetores((setoresRes.data as any) ?? []);
    setKpis((kpisRes.data as any) ?? []);
    setHistorico((histRes.data as any) ?? []);
    if (missaoRes.data) {
      setMissao(missaoRes.data as any);
      setEditMissao((missaoRes.data as any).conteudo ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvarMissao() {
    if (!missao) return;
    const { error } = await supabase
      .from("rotina_missao")
      .update({ conteudo: editMissao.trim() })
      .eq("id", missao.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMissao({ ...missao, conteudo: editMissao.trim() });
    setEditandoMissao(false);
    toast.success("Missão atualizada.");
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" /> HUB
        </h1>
        <p className="text-sm text-muted-foreground">
          Página central — visão geral do núcleo
        </p>
      </div>

      {/* Missão / Propósito */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4" /> Missão / Propósito do Núcleo
            </CardTitle>
            {isAdmin && !editandoMissao && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditandoMissao(true)}
              >
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : editandoMissao ? (
            <div className="space-y-2">
              <Textarea
                value={editMissao}
                onChange={(e) => setEditMissao(e.target.value)}
                rows={4}
                placeholder="Descreva a missão e o propósito do núcleo…"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={salvarMissao}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditandoMissao(false);
                    setEditMissao(missao?.conteudo ?? "");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {missao?.conteudo || "Nenhuma missão cadastrada."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mural de Avisos */}
      <AvisosMural />

      {/* Cards das Frentes */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Frentes de Trabalho</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : setores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma frente cadastrada.{" "}
            {isAdmin && (
              <Link to="/rotina/configuracoes" className="text-primary hover:underline">
                Cadastrar frentes
              </Link>
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {setores.map((s) => (
              <Link key={s.id} to="/rotina/$setorId" params={{ setorId: s.id }}>
                <Card
                  className="hover:border-primary/50 transition-all cursor-pointer group h-full"
                  style={{ borderColor: s.cor + "40" }}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: s.cor + "15" }}
                    >
                      {s.icone || "📋"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.nome}</div>
                      {s.descricao && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {s.descricao}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Acessar frente →
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Indicadores (KPIs)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                kpi={kpi}
                historico={historico.filter((h) => h.kpi_id === kpi.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
