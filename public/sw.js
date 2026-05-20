// PEAK! Service Worker — handles background push notifications
const ICON = "/peak-auth/images/peak-logo.png";

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: "PEAK!", body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || "PEAK!", {
      body: data.body || "",
      icon: data.icon || ICON,
      badge: ICON,
      tag: data.tag || "peak-notif",
      data: { url: data.url || "/peak-auth/home.html" },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/peak-auth/home.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/peak-auth/") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
