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

  const targetUrl = event.notification.data?.url || "/compras";
  console.log("[sw] notificationclick - URL:", targetUrl);

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      console.log("[sw] clients found:", clientList.length);
      // Focus existing window or open new one
      for (const client of clientList) {
        console.log("[sw] client URL:", client.url);
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return sw.clients.openWindow(targetUrl);
    }),
  );
});

sw.addEventListener("pushsubscriptionchange", (event) => {
  // Re-solicitar subscription quando expirar
  event.waitUntil(
    sw.registration.pushManager.subscribe(event.oldSubscription.options).catch((err) => {
      console.warn("[sw] Falha ao re-solicitar subscription:", err);
    }),
  );
});
