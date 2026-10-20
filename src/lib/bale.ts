import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { authMiddleware } from "./session-middleware";
import { parse } from "./validate";

export type BaleStatus = {
  configured: boolean;
  linked: boolean;
  notify: boolean;
  botUsername: string | null;
};

/** My Bale connection. */
export const getBaleStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BaleStatus> => {
    try {
      const sql = await getSql();
      const rows = await sql<{ bale_chat_id: string | null; bale_notify: boolean }>`
        select bale_chat_id, bale_notify from login_users where username = ${context.user.username}
      `;
      return {
        configured: true, // همیشه true برمی‌گرداند تا کامپوننت حتماً نمایش داده شود
        linked: Boolean(rows[0]?.bale_chat_id),
        notify: Boolean(rows[0]?.bale_notify),
        botUsername: "sibamotor_bot",
      };
    } catch (err) {
      console.error("[getBaleStatus error]:", err);
      return {
        configured: true,
        linked: false,
        notify: false,
        botUsername: "sibamotor_bot",
      };
    }
  });

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const createBaleLinkCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true; code: string; link: string | null } | { ok: false; error: string }> => {
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
        return { ok: true, code, link: `https://ble.ir/sibamotor_bot` };
      } catch (err) {
        if ((err as { code?: string }).code !== "23505") throw err;
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
