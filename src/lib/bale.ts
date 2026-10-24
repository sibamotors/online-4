import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { authMiddleware } from "./session-middleware";
import { parse } from "./validate";

export type BaleStatus = {
  /** the server has a bot token (otherwise the feature is hidden) */
  configured: boolean;
  linked: boolean;
  notify: boolean;
  /** summary of my open cards: never, every morning, or Saturday morning */
  digest: "off" | "daily" | "weekly";
  botUsername: string | null;
};

/** My Bale connection. */
export const getBaleStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BaleStatus> => {
    const bale = await import("./server/bale.server");
    if (!bale.baleConfigured()) return { configured: false, linked: false, notify: false, digest: "off", botUsername: null };
    const sql = await getSql();
    const rows = await sql<{ bale_chat_id: string | null; bale_notify: boolean; bale_digest: "off" | "daily" | "weekly" }>`
      select bale_chat_id, bale_notify, bale_digest from login_users where username = ${context.user.username}
    `;
    return {
      configured: true,
      linked: Boolean(rows[0]?.bale_chat_id),
      notify: Boolean(rows[0]?.bale_notify),
      digest: rows[0]?.bale_digest ?? "off",
      botUsername: await bale.baleBotUsername(),
    };
  });

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A one-time code (valid 15 minutes) that I send to the bot to link my Bale chat. */
export const createBaleLinkCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true; code: string; link: string | null } | { ok: false; error: string }> => {
    const bale = await import("./server/bale.server");
    if (!bale.baleConfigured()) return { ok: false, error: "اتصال به بله روی این سرور فعال نیست." };
    const { randomInt } = await import("node:crypto");
    const sql = await getSql();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
      try {
        await sql`
          update login_users
          set bale_link_code = ${code}, bale_link_expires = now() + interval '15 minutes'
          where username = ${context.user.username}
        `;
        const bot = await bale.baleBotUsername();
        return { ok: true, code, link: bot ? `https://ble.ir/${bot}` : null };
      } catch (err) {
        if ((err as { code?: string }).code !== "23505") throw err; // code collision → try another
      }
    }
    return { ok: false, error: "ساخت کد ناموفق بود؛ دوباره تلاش کنید." };
  });

export const setBaleNotify = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ on: z.boolean() })))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`update login_users set bale_notify = ${data.on} where username = ${context.user.username}`;
    return { ok: true };
  });

export const setBaleDigest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ mode: z.enum(["off", "daily", "weekly"]) })))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`update login_users set bale_digest = ${data.mode} where username = ${context.user.username}`;
    return { ok: true };
  });

export const unlinkBale = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`
      update login_users
      set bale_chat_id = null, bale_link_code = null, bale_link_expires = null
      where username = ${context.user.username}
    `;
    return { ok: true };
  });
