import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { authMiddleware } from "./session-middleware";
import { nid } from "./utils";
import { parse } from "./validate";

export type PushStatus = {
  /** the server has VAPID keys */
  configured: boolean;
  publicKey: string | null;
  /** how many of my devices receive push */
  devices: number;
};

export const getPushStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PushStatus> => {
    const { pushConfigured, vapidPublicKey } = await import("./server/push.server");
    if (!pushConfigured()) return { configured: false, publicKey: null, devices: 0 };
    const sql = await getSql();
    const n = await sql<{ n: number }>`select count(*)::int as n from app_push_subscriptions where username = ${context.user.username}`;
    return { configured: true, publicKey: vapidPublicKey(), devices: n[0]?.n ?? 0 };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      z.object({
        endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "https only"),
        p256dh: z.string().min(10).max(200),
        auth: z.string().min(10).max(100),
        userAgent: z.string().max(300).optional(),
      }),
    ),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const sql = await getSql();
    const n = await sql<{ n: number }>`select count(*)::int as n from app_push_subscriptions where username = ${context.user.username}`;
    if ((n[0]?.n ?? 0) >= 10) return { ok: false, error: "حداکثر ۱۰ دستگاه برای هر کاربر مجاز است." };
    // the same device may re-register (also after another person used this browser): it always belongs to the latest user
    await sql`
      insert into app_push_subscriptions (id, username, endpoint, p256dh, auth, user_agent)
      values (${nid()}, ${context.user.username}, ${data.endpoint}, ${data.p256dh}, ${data.auth}, ${data.userAgent ?? ""})
      on conflict (endpoint) do update set username = excluded.username, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent
    `;
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ endpoint: z.string().max(1000) })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    await sql`delete from app_push_subscriptions where endpoint = ${data.endpoint} and username = ${context.user.username}`;
    return { ok: true };
  });
