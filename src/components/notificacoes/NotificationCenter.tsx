import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface Notificacao {
  id: string;
  chamado_id: string;
  destinatario_id: string;
  tipo: string;
  status_notif: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  criado_em: string;
  lido_em: string | null;
  enviado_em: string | null;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);

  const unread = notifs.filter((n) => !n.lido_em).length;

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("compras_notificacoes")
      .select("*")
      .eq("destinatario_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(50);
    setNotifs((data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Poll a cada 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(carregar, 30000);
    return () => clearInterval(interval);
  }, [user, carregar]);

  async function marcarLido(n: Notificacao) {
    if (n.lido_em) return;
    await (supabase as any)
      .from("compras_notificacoes")
      .update({ lido_em: new Date().toISOString() })
      .eq("id", n.id);
    setNotifs((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, lido_em: new Date().toISOString() } : x)),
    );
    if (n.link) navigate({ to: n.link });
    setOpen(false);
  }

  async function marcarTodosLidos() {
    if (!user) return;
    await (supabase as any)
      .from("compras_notificacoes")
      .update({ lido_em: new Date().toISOString() })
      .eq("destinatario_id", user.id)
      .is("lido_em", null);
    setNotifs((prev) =>
      prev.map((x) => (x.lido_em ? x : { ...x, lido_em: new Date().toISOString() })),
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => {
          setOpen(!open);
          if (!open) carregar();
        }}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] bg-red-500 text-white">
            {unread}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] bg-card border border-border rounded-lg shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="font-semibold text-sm">Notificações</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={marcarTodosLidos}
                >
                  <CheckCheck className="w-3 h-3 mr-1" /> Marcar lidas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setOpen(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">Carregando…</div>
            )}
            {!loading && notifs.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            )}
            {notifs.map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${!n.lido_em ? "bg-primary/5" : ""}`}
                onClick={() => marcarLido(n)}
              >
                <div className="flex items-start gap-2">
                  {!n.lido_em && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{n.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(n.criado_em).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  {!n.lido_em && <Check className="w-3 h-3 text-muted-foreground shrink-0 mt-1" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
