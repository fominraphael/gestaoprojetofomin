// Hook para registrar inscrição de Web Push no navegador
// Solicita permissão e salva a subscription no Supabase
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid.config";
import { useAuth } from "@/hooks/use-auth";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function usePushRegistration() {
  const { user } = useAuth();

  const registrarSubscription = useCallback(async () => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      // Se não tem subscription, criar uma nova
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const sub = subscription.toJSON();
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;

      // Salvar no banco (upsert por endpoint)
      await (supabase as any).from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth_key: sub.keys.auth,
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
    } catch (err) {
      console.error("[push] Erro ao registrar subscription:", err);
    }
  }, [user]);

  // Registrar ao fazer login
  useEffect(() => {
    if (!user) return;
    // Pequeno delay para não bloquear a UI
    const timer = setTimeout(registrarSubscription, 2000);
    return () => clearTimeout(timer);
  }, [user, registrarSubscription]);

  return { registrarSubscription };
}
