// VAPID configuration for Web Push notifications
// The public key is used on the client side to subscribe to push
// The private key is used on the server side to send push notifications
// NEVER commit the private key to version control

export const VAPID_PUBLIC_KEY =
  "BCvVGXw009sG-BULFOtLi5W0UO8pioNctr0w1thdp21Q38BK8S70Y5GvmuLde3d-jixlZXBhvpCVu7TJf8d5mbI";

// Server-side only: loaded from env var
export function getVapidPrivateKey(): string {
  const key = process.env.VAPID_PRIVATE_KEY;
  if (!key) {
    throw new Error("VAPID_PRIVATE_KEY environment variable is not set");
  }
  return key;
}

export const VAPID_SUBJECT = "mailto:admin@moduloabsn.com";
