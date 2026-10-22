import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndicadorBadge } from "@/components/preparacao/IndicadorBadge";
import { MuralObservacoes } from "@/components/preparacao/MuralObservacoes";
import { INDICADORES, campo, carregarVeiculosCalculados } from "@/lib/preparacao-anuncios";
import { formatarMoedaBR } from "@/lib/moeda";

export const Route = createFileRoute("/_authenticated/_preparacao-anuncios/preparacao-anuncios/$placa")({
  errorComponent: ModuleErrorBoundary,
  head: ({ params }) => ({
    meta: [
      { title: `${params.placa} — Pendências Preparação/Anúncios` },
      { name: "description", content: `Indicadores de preparação e mural de observações da placa ${params.placa}.` },
      { property: "og:title", content: `Veículo ${params.placa}` },
      { property: "og:description", content: "Detalhe de pendências de preparação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetalheVeiculo,
});

function valorDado(v: unknown): string {
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString("pt-BR");
  return v == null ? "" : String(v);
}

/** Link(s) de foto da conferência física (coluna "foto" da planilha de Auditoria). */
function LinksFotoAuditoria({ dados }: { dados: Record<string, unknown>[] }) {
  const links = dados.map((d) => String(campo(d, "foto") ?? "").trim()).filter(Boolean);
  if (!links.length) return <p className="text-sm text-muted-foreground">Sem foto disponível</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((url, idx) => /^https?:\/\//i.test(url) ? (
        <a key={url + idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ExternalLink className="h-3 w-3" /> Abrir foto{links.length > 1 ? ` ${idx + 1}` : ""}
        </a>
      ) : (
        <span key={url + idx} className="text-sm text-muted-foreground">Sem foto disponível (link inválido)</span>
      ))}
    </div>
  );
}

function DetalheVeiculo() {
  const { placa } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["prep", "veiculo", placa],
    queryFn: async () => (await carregarVeiculosCalculados(null, placa))[0] ?? null,
  });

  if (isLoading) return <div className="flex items-center gap-2 p-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (!data) return <div className="p-10 text-muted-foreground">Veículo {placa} não encontrado.</div>;

  const geral: [string, string | number | null][] = [
    ["Modelo", data.modelo], ["Ano/Mod", data.ano_mod], ["Cor", data.cor], ["Km", data.km],
    ["Dias em estoque", data.dias_em_estoque], ["Fotos", data.fotos_qtd], ["Leads 60 dias", data.leads_60_dias],
    ["Classificação", data.classificacao], ["Chassi", data.chassi], ["Finalidade", data.finalidade],
    ["Custo total", data.custo_total == null ? null : formatarMoedaBR(data.custo_total)],
    ["Valor anunciado", data.valor_anunciado == null ? null : formatarMoedaBR(data.valor_anunciado)],
    ["FIPE", data.fipe == null ? null : formatarMoedaBR(data.fipe)],
    ["Regional", data.regional], ["Responsável", data.responsavel],
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Link to="/preparacao-anuncios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold">{data.placa}</h1>
        <Badge variant={data.ativo ? "default" : "secondary"}>{data.ativo ? "Ativo" : `Inativo desde ${data.inativado_em ? new Date(data.inativado_em).toLocaleDateString("pt-BR") : "—"}`}</Badge>
        {data.pendente && <Badge variant="destructive">Com pendência</Badge>}
      </div>

      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3 lg:grid-cols-5">
          {geral.map(([k, v]) => (
            <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v ?? "—"}</dd></div>
          ))}
        </dl>
        <div className="mt-4 text-sm">
          <span className="text-xs text-muted-foreground">Resolução de loja: </span>
          <span className="text-muted-foreground">Loja Estoque:</span> {data.loja.bruta || "—"} → <span className="text-muted-foreground">Loja Direcionamento:</span> {data.loja.direcionada || "—"} → <span className="text-muted-foreground">Loja Agrupamento:</span> {data.loja.final || "—"} → <span className="text-muted-foreground">Loja Pendência:</span> <strong>{data.loja.final || "—"}</strong>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {INDICADORES.map((i) => {
          const r = data.indicadores[i.id];
          return (
            <Card key={i.id} className="p-4 space-y-2">
              <div className="flex items-center gap-2"><h2 className="font-semibold">{i.label}</h2><IndicadorBadge label={i.label} status={r.status} /></div>
              <p className="text-sm text-muted-foreground">{r.motivo}</p>
              {i.id === "auditoria" && <LinksFotoAuditoria dados={r.dados} />}
              {r.dados.slice(0, 5).map((d, idx) => (
                <div key={idx} className="rounded border border-border bg-muted/40 p-2 text-xs">
                  {Object.entries(d).filter(([, v]) => v !== null && v !== "").map(([k, v]) => (
                    <span key={k} className="mr-3 inline-block"><span className="text-muted-foreground">{k}:</span> {valorDado(v)}</span>
                  ))}
                </div>
              ))}
            </Card>
          );
        })}
      </div>

      <MuralObservacoes placa={data.placa} />
    </div>
  );
}
