import { getSql } from "../db";

/**
 * Web Push (notifications on phones and computers even when the site is closed).
 * Needs VAPID keys in .env; without them nothing runs and the UI hides the option.
 */
const pub = () => process.env.VAPID_PUBLIC_KEY?.trim() || "";
const priv = () => process.env.VAPID_PRIVATE_KEY?.trim() || "";

export function pushConfigured(): boolean {
  return pub().length > 0 && priv().length > 0;
}

export function vapidPublicKey(): string | null {
  return pushConfigured() ? pub() : null;
}

let ready = false;
async function webPush() {
  const wp = (await import("web-push")).default;
  if (!ready) {
    const subject = process.env.VAPID_SUBJECT?.trim() || process.env.APP_URL?.trim() || "mailto:admin@example.com";
    wp.setVapidDetails(subject, pub(), priv());
    ready = true;
  }
  return wp;
}

export type PushPayload = { title: string; body?: string; url?: string; tag?: string };

/** Sends a notification to every device of a user. Never throws; dead devices are removed. */
export async function sendPush(username: string, payload: PushPayload): Promise<void> {
  if (!pushConfigured()) return;
  try {
    const sql = await getSql();
    const subs = await sql<{ id: string; endpoint: string; p256dh: string; auth: string }>`
      select id, endpoint, p256dh, auth from app_push_subscriptions where username = ${username}
    `;
    if (subs.length === 0) return;
    const wp = await webPush();
    const body = JSON.stringify({ title: payload.title.slice(0, 120), body: (payload.body ?? "").slice(0, 200), url: payload.url ?? "/", tag: payload.tag });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await wp.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600 });
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await sql`delete from app_push_subscriptions where id = ${s.id}`; // the device is gone
          else console.error("[push] send failed:", code ?? (err instanceof Error ? err.message : "unknown error"));
        }
      }),
    );
  } catch (err) {
    console.error("[push] failed:", err instanceof Error ? err.message : "unknown error");
  }
}
