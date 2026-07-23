import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_toyota/toyota/revisoes/nova")({
  component: NovaRevisao,
  errorComponent: ModuleErrorBoundary,
});

interface Filial {
  id: string;
  nome: string;
  dealer_number: string | null;
  ativo: boolean;
}

function NovaRevisao() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [chassi, setChassi] = useState("");
  const [kmAtual, setKmAtual] = useState("");
  const [revisao, setRevisao] = useState(false);
  const [certificacao, setCertificacao] = useState(false);
  const [prioridade, setPrioridade] = useState<string>("normal");
  const [observacao, setObservacao] = useState("");
  const [filialId, setFilialId] = useState("");
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filiaisVinculadas, setFiliaisVinculadas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      if (!user) return;

      const [resFiliais, resVinculos] = await Promise.all([
        supabase
          .from("toyota_filiais")
          .select("id,nome,dealer_number,ativo")
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("toyota_usuario_filial")
          .select("filial_id")
          .eq("user_id", user.id),
      ]);

      const filiaisData = (resFiliais.data ?? []) as Filial[];
      setFiliais(filiaisData);

      const vinculos = (resVinculos.data ?? []).map((v) => v.filial_id);
      setFiliaisVinculadas(vinculos);

      if (vinculos.length === 1) {
        setFilialId(vinculos[0]);
      } else if (vinculos.length === 0 && filiaisData.length > 0) {
        setFilialId(filiaisData[0].id);
      }

      setCarregando(false);
    };
    carregar();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!placa.trim()) return toast.error("Informe a placa.");
    if (!modelo.trim()) return toast.error("Informe o modelo.");
    if (!chassi.trim()) return toast.error("Informe o chassi.");
    if (!filialId) return toast.error("Selecione a filial.");
    if (!revisao && !certificacao)
      return toast.error("Marque pelo menos uma opção: Revisão e/ou Certificação.");

    setSalvando(true);
    try {
      const { error } = await supabase.from("toyota_revisoes").insert({
        placa: placa.trim().toUpperCase(),
        modelo: modelo.trim().toUpperCase(),
        chassi: chassi.trim().toUpperCase(),
        km_atual: kmAtual ? Number(kmAtual.replace(/\D/g, "")) : null,
        revisao,
        certificacao,
        prioridade,
        observacao_seminovos: observacao.trim() || null,
        filial_id: filialId,
        solicitante_id: user?.id ?? null,
        consultor_seminovos: user?.username ?? "",
        status: "aguardando_aprovacao",
      });

      if (error) throw error;

      toast.success("Solicitação criada com sucesso!");
      navigate({ to: "/toyota/revisoes" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar solicitação.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/toyota/revisoes" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nova Solicitação de Revisão</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados do veículo para enviar à aprovação da Gestora de Seminovos.
        </p>
      </div>

      {filiaisVinculadas.length === 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Atenção:</strong> Você não possui filiais vinculadas. O cadastro de vínculo está
          pendente. A filial selecionada pode não ser a correta.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">
                  Filial <span className="text-destructive">*</span>
                </Label>
                <Select value={filialId} onValueChange={setFilialId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a filial" />
                  </SelectTrigger>
                  <SelectContent>
                    {filiais.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Placa <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1"
                  placeholder="ABC1234"
                  maxLength={7}
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Modelo <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: COROLLA CROSS"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Chassi <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1"
                  placeholder="17 dígitos"
                  maxLength={17}
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">KM Atual</Label>
                <Input
                  className="mt-1"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Ex: 45230"
                  value={kmAtual}
                  onChange={(e) => setKmAtual(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tipo de Serviço *</Label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={revisao}
                    onCheckedChange={(v) => setRevisao(v === true)}
                  />
                  Revisão
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={certificacao}
                    onCheckedChange={(v) => setCertificacao(v === true)}
                  />
                  Certificação
                </label>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Observação</Label>
              <Textarea
                className="mt-1"
                placeholder="Informações adicionais sobre a solicitação..."
                rows={3}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/toyota/revisoes" })}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Enviar para Aprovação
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
