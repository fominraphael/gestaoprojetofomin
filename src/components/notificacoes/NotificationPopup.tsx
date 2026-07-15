// Pop-up de notificação in-app estilo WhatsApp
// Aparece no canto inferior direito e permanece até o usuário interagir
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { X, Bell } from "lucide-react";

interface Notificacao {
  id: string;
  chamado_id: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  criado_em: string;
}

export function NotificationPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [popups, setPopups] = useState<Notificacao[]>([]);

  const checar = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("compras_notificacoes")
      .select("id, chamado_id, titulo, mensagem, link, criado_em")
      .eq("destinatario_id", user.id)
      .is("lido_em", null)
      .eq("tipo", "popup")
      .order("criado_em", { ascending: false })
      .limit(5);

    if (!data?.length) return;

    setPopups((prev) => {
      const existentes = new Set(prev.map((p) => p.id));
      const novos = (data as any[]).filter((d) => !existentes.has(d.id));
      return [...novos, ...prev].slice(0, 5);
    });
  }, [user?.id]);

  useEffect(() => {
    checar();
  }, [checar]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checar, 15000);
    return () => clearInterval(interval);
  }, [user?.id, checar]);

  function fechar(id: string) {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }

  async function abrir(n: Notificacao) {
    await (supabase as any)
      .from("compras_notificacoes")
      .update({ lido_em: new Date().toISOString() })
      .eq("id", n.id);
    setPopups((prev) => prev.filter((p) => p.id !== n.id));
    if (n.link) navigate({ to: n.link });
  }

  if (!popups.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {popups.map((n) => (
        <div
          key={n.id}
          className="bg-card border border-border rounded-lg shadow-2xl p-3 animate-in slide-in-from-right-full duration-300 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => abrir(n)}
        >
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{n.titulo}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {n.mensagem}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(n.criado_em).toLocaleString("pt-BR")}
              </div>
            </div>
            <button
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                fechar(n.id);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
