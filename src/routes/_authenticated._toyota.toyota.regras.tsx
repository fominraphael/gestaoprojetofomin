import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Plus, X, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/regras")({
  errorComponent: ModuleErrorBoundary,
  component: RegrasPage,
});

interface ToyotaRegras {
  origens_aceitas: string[];
  marcas_aceitas: string[];
  tcuv_idade_max: number;
  tsim_idade_min: number;
  tsim_idade_max: number;
  laudos_aprovados: string[];
}

const DEFAULT_TOYOTA: ToyotaRegras = {
  origens_aceitas: ["Toyota - Estoque"],
  marcas_aceitas: ["Toyota", "Lexus"],
  tcuv_idade_max: 10,
  tsim_idade_min: 6,
  tsim_idade_max: 15,
  laudos_aprovados: ["AVALIADO", "APROVADO"],
};

function RegrasPage() {
  const { isAdmin } = useAuth();
  const [toyota, setToyota] = useState<ToyotaRegras>(DEFAULT_TOYOTA);
  const [uploadMb, setUploadMb] = useState(10);
  const [horarioAlerta, setHorarioAlerta] = useState("00:01");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("key, value");
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      if (map.toyota_regras) setToyota({ ...DEFAULT_TOYOTA, ...map.toyota_regras });
      if (map.upload?.max_mb) setUploadMb(Number(map.upload.max_mb));
      if (map.alertas?.horario_diario) setHorarioAlerta(String(map.alertas.horario_diario));
      setLoading(false);
    })();
  }, []);

  async function salvar() {
    if (!isAdmin) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    const rows = [
      { key: "toyota_regras", value: toyota as unknown as Record<string, unknown>, updated_by: uid, updated_at: new Date().toISOString() },
      { key: "upload", value: { max_mb: uploadMb } as Record<string, unknown>, updated_by: uid, updated_at: new Date().toISOString() },
      { key: "alertas", value: { horario_diario: horarioAlerta } as Record<string, unknown>, updated_by: uid, updated_at: new Date().toISOString() },
    ];
    const { error } = await supabase.from("system_settings").upsert(rows as any, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Regras salvas com sucesso.");
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8 max-w-3xl">
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
            <ShieldAlert className="w-10 h-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Acesso restrito</p>
              <p className="text-sm text-muted-foreground">
                Apenas administradores podem editar as regras do sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="container mx-auto p-8 text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Regras do Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Configuração dinâmica dos parâmetros de análise, importação e notificações.
          </p>
        </div>
        <Button onClick={salvar} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Critérios de Elegibilidade — Toyota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TagListEditor
            label="Origens aceitas na importação"
            hint="Somente registros da planilha com estas origens serão processados."
            values={toyota.origens_aceitas}
            onChange={(v) => setToyota({ ...toyota, origens_aceitas: v })}
          />
          <TagListEditor
            label="Marcas aceitas"
            values={toyota.marcas_aceitas}
            onChange={(v) => setToyota({ ...toyota, marcas_aceitas: v })}
          />
          <TagListEditor
            label="Resultados de laudo considerados aprovados"
            values={toyota.laudos_aprovados}
            onChange={(v) => setToyota({ ...toyota, laudos_aprovados: v })}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumField
              label="Idade máx. TCUV (anos)"
              value={toyota.tcuv_idade_max}
              onChange={(v) => setToyota({ ...toyota, tcuv_idade_max: v })}
            />
            <NumField
              label="Idade mín. TSIM (anos)"
              value={toyota.tsim_idade_min}
              onChange={(v) => setToyota({ ...toyota, tsim_idade_min: v })}
            />
            <NumField
              label="Idade máx. TSIM (anos)"
              value={toyota.tsim_idade_max}
              onChange={(v) => setToyota({ ...toyota, tsim_idade_max: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <NumField
            label="Tamanho máximo de arquivo (MB)"
            value={uploadMb}
            onChange={setUploadMb}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rotina de Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label>Horário diário (HH:MM)</Label>
            <Input
              type="time"
              value={horarioAlerta}
              onChange={(e) => setHorarioAlerta(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Horário em que o sistema varre documentos vencidos e envia notificações por e-mail.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function TagListEditor({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="Adicionar valor..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const t = draft.trim();
              if (t && !values.includes(t)) onChange([...values, t]);
              setDraft("");
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const t = draft.trim();
            if (t && !values.includes(t)) onChange([...values, t]);
            setDraft("");
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
