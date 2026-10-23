import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndicadorBadge } from "@/components/preparacao/IndicadorBadge";
import { MuralObservacoes } from "@/components/preparacao/MuralObservacoes";
import { INDICADORES, campo, carregarHistoricoAuditoria, carregarVeiculosCalculados } from "@/lib/preparacao-anuncios";
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

const CAMPOS_TCUV = ["TIPO", "ENVIO TOYOTA", "TOYOTA", "DATA COMPRA", "DATA VENDA", "DEALER"];
const vazioTxt = (v: unknown) => v == null || String(v).trim() === "";

function corNbs(nbs: string): "default" | "secondary" | "destructive" | "outline" {
  const n = nbs.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (n.includes("NAO ENCONTRADO")) return "destructive";
  if (n.includes("FATURADO")) return "secondary";
  if (n.includes("ESTOQUE")) return "default";
  return "outline";
}

/** Bloco visual de cada registro TCUV. */
function CartoesTcuv({ dados }: { dados: Record<string, unknown>[] }) {
  if (!dados.length) return null;
  return (
    <div className="space-y-3">
      {dados.map((d, idx) => {
        const sol = campo(d, "SOLICITADO"); const ret = campo(d, "RETORNO");
        const pend = !vazioTxt(sol) && vazioTxt(ret);
        const nbs = String(campo(d, "NBS") ?? "").trim();
        const obs = campo(d, "OBSERVAÇÃO", "OBSERVACAO"); const det = campo(d, "DETALHES");
        return (
          <div key={idx} className="rounded-md border border-border bg-muted/40 p-3 space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={pend ? "destructive" : "secondary"}>{pend ? "Solicitado sem retorno" : vazioTxt(sol) ? "Sem solicitação" : "Retorno recebido"}</Badge>
              {nbs && <Badge variant={corNbs(nbs)}>NBS: {nbs}</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-border bg-background p-2"><p className="text-xs text-muted-foreground">Solicitado</p><p className="font-medium">{valorDado(sol) || "—"}</p></div>
              <div className={`rounded border p-2 ${pend ? "border-destructive bg-destructive/10" : "border-border bg-background"}`}><p className="text-xs text-muted-foreground">Retorno</p><p className="font-medium">{valorDado(ret) || "Pendente"}</p></div>
            </div>
            <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {CAMPOS_TCUV.map((k) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{valorDado(campo(d, k)) || "—"}</dd></div>
              ))}
            </dl>
            {!vazioTxt(obs) && <div><p className="text-xs text-muted-foreground">Observação</p><p>{valorDado(obs)}</p></div>}
            {!vazioTxt(det) && <div><p className="text-xs text-muted-foreground">Detalhes</p><p>{valorDado(det)}</p></div>}
          </div>
        );
      })}
    </div>
  );
}

/** Histórico de resultados de Auditoria ao longo das importações. */
function HistoricoAuditoria({ placa }: { placa: string }) {
  const { data = [], isLoading } = useQuery({ queryKey: ["prep", "auditoria-hist", placa], queryFn: () => carregarHistoricoAuditoria(placa) });
  return (
    <Card className="p-4 space-y-3">
      <h2 className="font-semibold">Histórico de Auditoria</h2>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !data.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma auditoria registrada para esta placa.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((h) => {
            const enc = String(campo(h.dados, "encontrado") ?? "");
            const nao = enc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === "NAO";
            return (
              <li key={h.id} className="rounded-md border border-border p-3 text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Importado em {new Date(h.importado_em).toLocaleString("pt-BR")}</span>
                  <Badge variant={nao ? "destructive" : "secondary"}>Encontrado: {enc || "—"}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(["sobra", "dataconferiu", "conferente", "localconferencia"] as const).map((k) => (
                    <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{valorDado(campo(h.dados, k)) || "—"}</dd></div>
                  ))}
                </dl>
                <LinksFotoAuditoria dados={[h.dados]} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
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
              {i.id === "tcuv" && <CartoesTcuv dados={r.dados} />}
              {i.id !== "tcuv" && r.dados.slice(0, 5).map((d, idx) => (
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

      <HistoricoAuditoria placa={data.placa} />

      <MuralObservacoes placa={data.placa} />
    </div>
  );
}
