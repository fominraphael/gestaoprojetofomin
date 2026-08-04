import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  X,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Download,
} from "lucide-react";
import {
  type Anexo,
  uploadAnexo,
  removerAnexo,
  getAnexoUrl,
  formatTamanho,
} from "@/lib/rotina";

interface AnexosUploadProps {
  entidade: "atividade" | "tarefa";
  entidadeId: string;
}

export function AnexosUpload({ entidade, entidadeId }: AnexosUploadProps) {
  const { user } = useAuth();
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [uploading, setUploading] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("rotina_anexos")
      .select("*")
      .eq("entidade", entidade)
      .eq("entidade_id", entidadeId)
      .order("created_at", { ascending: true });
    setAnexos((data as any) ?? []);
  }, [entidade, entidadeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      const result = await uploadAnexo(file, entidade, entidadeId, user.id);
      if (result) ok++;
    }
    setUploading(false);
    e.target.value = "";
    if (ok > 0) {
      toast.success(`${ok} arquivo(s) anexado(s).`);
      carregar();
    } else {
      toast.error("Falha ao anexar arquivo.");
    }
  }

  async function handleRemover(anexo: Anexo) {
    if (!confirm(`Remover "${anexo.nome_original}"?`)) return;
    const ok = await removerAnexo(anexo);
    if (ok) {
      toast.success("Anexo removido.");
      setAnexos((prev) => prev.filter((a) => a.id !== anexo.id));
    } else {
      toast.error("Falha ao remover anexo.");
    }
  }

  async function handleDownload(anexo: Anexo) {
    const url = await getAnexoUrl(anexo.arquivo_path);
    if (url) window.open(url, "_blank");
    else toast.error("Falha ao obter link do arquivo.");
  }

  function getIcon(tipo: string | null) {
    if (!tipo) return File;
    if (tipo.startsWith("image/")) return Image;
    if (tipo.includes("pdf")) return FileText;
    if (tipo.includes("spreadsheet") || tipo.includes("excel")) return FileSpreadsheet;
    return File;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={uploading}
          >
            <span>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {uploading ? "Enviando…" : "Anexar arquivo"}
            </span>
          </Button>
        </label>
      </div>

      {anexos.length > 0 && (
        <div className="space-y-1">
          {anexos.map((a) => {
            const Icon = getIcon(a.tipo_mime);
            return (
              <div
                key={a.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-accent/50 transition-colors group"
              >
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1 min-w-0">
                  {a.nome_original}
                </span>
                {a.tamanho != null && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTamanho(a.tamanho)}
                  </span>
                )}
                <button
                  onClick={() => handleDownload(a)}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Baixar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemover(a)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {anexos.length === 0 && !uploading && (
        <p className="text-xs text-muted-foreground">Nenhum anexo.</p>
      )}
    </div>
  );
}
