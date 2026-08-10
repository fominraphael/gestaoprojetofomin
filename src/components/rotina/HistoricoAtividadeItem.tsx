import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Download, FileText, ExternalLink } from "lucide-react";
import {
  type Anexo,
  type SemanaSnapshotAtividade,
  getAnexoUrl,
  formatTamanho,
} from "@/lib/rotina";

interface HistoricoAtividadeItemProps {
  atividade: SemanaSnapshotAtividade;
}

function formatData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function HistoricoAtividadeItem({ atividade }: HistoricoAtividadeItemProps) {
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!aberto || carregado) return;
    let ativo = true;
    setCarregando(true);
    (async () => {
      const [ativRes, anexosRes] = await Promise.all([
        supabase
          .from("rotina_atividades")
          .select("descricao")
          .eq("id", atividade.id)
          .maybeSingle(),
        supabase
          .from("rotina_anexos")
          .select("*")
          .eq("entidade", "atividade")
          .eq("entidade_id", atividade.id)
          .order("created_at", { ascending: true }),
      ]);
      if (!ativo) return;
      setDescricao(((ativRes.data as any)?.descricao as string) ?? "");
      setAnexos((anexosRes.data as any) ?? []);
      setCarregando(false);
      setCarregado(true);
    })();
    return () => {
      ativo = false;
    };
  }, [aberto, carregado, atividade.id]);

  async function baixar(anexo: Anexo) {
    const url = await getAnexoUrl(anexo.arquivo_path);
    if (url) window.open(url, "_blank");
  }

  const concluida = atividade.concluidos.length > 0;

  return (
    <AccordionItem value={atividade.id} className="border-b border-border/50">
      <AccordionTrigger
        className="text-sm py-2 hover:no-underline"
        onClick={() => setAberto(true)}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <span className="flex-1 min-w-0 truncate text-left">{atividade.nome}</span>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              concluida
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
            }`}
          >
            {concluida ? `${atividade.concluidos.length} conclusão(ões)` : "Pendente"}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 pl-2 pb-2">
          {carregando && (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          )}

          {!carregando && (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Descrição
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {descricao?.trim() ? descricao : "Nenhuma descrição adicionada."}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Dias concluídos
                </p>
                {concluida ? (
                  <div className="flex flex-wrap gap-1">
                    {atividade.concluidos.map((d) => (
                      <Badge key={d} variant="outline" className="text-[10px]">
                        {formatData(d)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conclusão registrada.
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Anexos
                </p>
                {anexos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
                ) : (
                  <div className="space-y-1">
                    {anexos.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => baixar(a)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-border hover:bg-accent/50 transition-colors text-left"
                      >
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1 min-w-0">
                          {a.nome_original}
                        </span>
                        {a.tamanho != null && (
                          <span className="text-xs text-muted-foreground">
                            {formatTamanho(a.tamanho)}
                          </span>
                        )}
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/rotina/atividade/$id"
                params={{ id: atividade.id }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Abrir atividade <ExternalLink className="w-3 h-3" />
              </Link>
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
