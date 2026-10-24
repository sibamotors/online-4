import { getSql } from "../db";

/**
 * Bale bot (https://tapi.bale.ai, same API shape as Telegram bots).
 * Used to send notifications outside the app and to link a user's Bale chat to their account.
 * Everything here is optional: without BALE_BOT_TOKEN nothing runs and nothing is shown in the UI.
 */
const token = () => process.env.BALE_BOT_TOKEN?.trim() || "";
const base = () => (process.env.BALE_API_BASE?.trim() || "https://tapi.bale.ai").replace(/\/+$/, "");

export function baleConfigured(): boolean {
  return token().length > 0;
}

type ApiResult<T> = { ok: boolean; result?: T; description?: string };

async function api<T>(method: string, payload: Record<string, unknown> = {}, timeoutMs = 15_000): Promise<T> {
  const res = await fetch(`${base()}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json()) as ApiResult<T>;
  if (!json.ok) throw new Error(json.description || `Bale ${method} failed (${res.status})`);
  return json.result as T;
}

/** Sends a text message. Never throws; returns false if it could not be delivered. */
export async function sendBaleMessage(chatId: string, text: string): Promise<boolean> {
  if (!baleConfigured()) return false;
  try {
    await api("sendMessage", { chat_id: chatId, text: text.slice(0, 4000) });
    return true;
  } catch (err) {
    console.error("[bale] send failed:", err instanceof Error ? err.message : "unknown error");
    return false;
  }
}

let cachedUsername: string | null | undefined;

/** The bot's @username (for the "open in Bale" link). */
export async function baleBotUsername(): Promise<string | null> {
  if (!baleConfigured()) return null;
  if (cachedUsername !== undefined) return cachedUsername;
  try {
    const me = await api<{ username?: string }>("getMe");
    cachedUsername = me.username ?? null;
  } catch {
    return null; // try again next time
  }
  return cachedUsername;
}

type BaleUpdate = {
  update_id: number;
  message?: { text?: string; chat?: { id: number | string; type?: string } };
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const HELP =
  "برای اتصال به سیباموتور: در سامانه، منوی پروفایل ← «اعلان در بله»، کد اتصال را بگیرید و همین‌جا برای من بفرستید.";

async function handleUpdate(u: BaleUpdate): Promise<void> {
  const msg = u.message;
  if (!msg?.text || !msg.chat) return;
  if (msg.chat.type && msg.chat.type !== "private") return;
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const start = /^\/start(?:\s+(\S+))?$/i.exec(text);
  const rawCode = start ? (start[1] ?? "") : /^[A-Za-z0-9]{8}$/.test(text) ? text : "";
  const code = rawCode.toUpperCase();
  const sql = await getSql();

  if (!code) {
    const linked = await sql<{ display_name: string }>`select display_name from login_users where bale_chat_id = ${chatId}`;
    await sendBaleMessage(
      chatId,
      linked[0] ? `این چت به حساب «${linked[0].display_name}» متصل است و اعلان‌ها همین‌جا می‌رسد.` : HELP,
    );
    return;
  }

  try {
    const rows = await sql<{ username: string; display_name: string }>`
      update login_users
      set bale_chat_id = ${chatId}, bale_notify = true, bale_link_code = null, bale_link_expires = null
      where bale_link_code = ${code} and bale_link_expires > now()
      returning username, display_name
    `;
    if (rows[0]) {
      await sendBaleMessage(chatId, `حساب «${rows[0].display_name}» با موفقیت متصل شد. از این به بعد اعلان‌ها همین‌جا می‌رسد.`);
      return;
    }
    const already = await sql<{ display_name: string }>`select display_name from login_users where bale_chat_id = ${chatId}`;
    await sendBaleMessage(
      chatId,
      already[0] ? `این چت قبلاً به حساب «${already[0].display_name}» متصل شده است.` : "کد نامعتبر است یا منقضی شده. یک کد تازه از سامانه بگیرید.",
    );
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      await sendBaleMessage(chatId, "این چت بله قبلاً به حساب دیگری متصل شده است.");
      return;
    }
    throw err;
  }
}

const g = globalThis as typeof globalThis & { __balePoller__?: boolean };

/** Long-polls the bot for messages (link codes). Started once per process. */
export function startBalePolling(): void {
  if (g.__balePoller__ || !baleConfigured()) return;
  g.__balePoller__ = true;
  void (async () => {
    let offset = 0;
    for (;;) {
      const startedAt = Date.now();
      try {
        const updates = await api<BaleUpdate[]>("getUpdates", { offset, timeout: 25 }, 40_000);
        for (const u of updates) {
          offset = u.update_id + 1;
          try {
            await handleUpdate(u);
          } catch (err) {
            console.error("[bale] update failed:", err instanceof Error ? err.message : "unknown error");
          }
        }
        // some gateways ignore `timeout`; never spin
        if (Date.now() - startedAt < 2000) await sleep(3000);
      } catch (err) {
        console.error("[bale] polling error:", err instanceof Error ? err.message : "unknown error");
        await sleep(15_000);
      }
    }
  })();
}
