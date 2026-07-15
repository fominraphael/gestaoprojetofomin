// Service Worker para Web Push Notifications
// Escuta eventos push e exibe notificações nativas do navegador
// Ao clicar na notificação, redireciona para a rota do chamado

// eslint-disable-next-line no-restricted-globals
const sw = self;

sw.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Notificação",
      body: event.data.text(),
      url: "/compras",
    };
  }

  const { title, body, url, icon, badge } = payload;

  const options = {
    body,
    icon: icon || "/favicon.ico",
    badge: badge || "/favicon.ico",
    vibrate: [200, 100, 200],
    tag: payload.tag || "compras-notif",
    renotify: true,
    data: { url: url || "/compras" },
    actions: [
      { action: "open", title: "Abrir" },
      { action: "dismiss", title: "Dispensar" },
    ],
  };

  event.waitUntil(sw.registration.showNotification(title || "GOSYSTEM", options));
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/compras";

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Se já existe uma janela do sistema aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(sw.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Senão, abre nova janela
      return sw.clients.openWindow(url);
    }),
  );
});

sw.addEventListener("pushsubscriptionchange", (event) => {
  // Re-solicitar subscription quando expirar
  event.waitUntil(
    sw.registration.pushManager.subscribe(event.oldSubscription.options).then((subscription) => {
      // Enviar nova subscription ao servidor
      return fetch("/api/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
    }),
  );
});
