import { getSql } from "../db";
import { nid } from "../utils";
import { baleConfigured, sendBaleMessage } from "./bale.server";

export type NotifyInput = {
  username: string;
  kind: string;
  title: string;
  body?: string;
  /** same-site path such as /b/123 */
  href?: string | null;
  /** show it in the in-app bell (default true) */
  inApp?: boolean;
  /** also send it to the user's Bale chat when linked (default true) */
  bale?: boolean;
};

/**
 * The one place that notifies a person: an entry in the in-app bell and, if the user linked Bale
 * and has it switched on, a Bale message. Never throws — a failed notification must not break the action.
 */
export async function notifyUser(n: NotifyInput): Promise<void> {
  try {
    const sql = await getSql();
    const username = n.username.trim().toLowerCase();
    if (!username) return;
    const title = n.title.slice(0, 200);
    const body = (n.body ?? "").slice(0, 500);
    const href = n.href && n.href.startsWith("/") && !n.href.startsWith("//") ? n.href.slice(0, 300) : null;

    if (n.inApp !== false) {
      await sql`
        insert into app_notifications (id, username, kind, title, body, href, read_at, created_at)
        values (${nid()}, ${username}, ${n.kind.slice(0, 40)}, ${title}, ${body}, ${href}, null, ${new Date().toISOString()})
      `;
    }

    if (n.bale !== false && baleConfigured()) {
      const rows = await sql<{ bale_chat_id: string | null; bale_notify: boolean }>`
        select bale_chat_id, bale_notify from login_users where username = ${username}
      `;
      const chat = rows[0];
      if (chat?.bale_chat_id && chat.bale_notify) {
        const appUrl = process.env.APP_URL?.trim().replace(/\/+$/, "");
        const lines = [title, body, href && appUrl ? `${appUrl}${href}` : ""].filter(Boolean);
        void sendBaleMessage(chat.bale_chat_id, lines.join("\n"));
      }
    }
  } catch (err) {
    console.error("[notify] failed:", err instanceof Error ? err.message : "unknown error");
  }
}
