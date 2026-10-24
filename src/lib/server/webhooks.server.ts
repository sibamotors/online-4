import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getSql } from "../db";

/** True when `host` points to the public internet (not this server, not a private network). */
export async function isPublicHost(host: string): Promise<boolean> {
  const h = host.replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  let addrs: string[];
  if (isIP(h)) addrs = [h];
  else {
    try {
      addrs = (await lookup(h, { all: true })).map((a) => a.address);
    } catch {
      return false;
    }
  }
  return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a));
}

function isPrivateAddress(a: string): boolean {
  if (isIP(a) === 6) {
    const x = a.toLowerCase();
    if (x === "::1" || x === "::" || x.startsWith("fe80") || x.startsWith("fc") || x.startsWith("fd")) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x);
    return mapped ? isPrivateAddress(mapped[1]!) : false;
  }
  const [a1, a2] = a.split(".").map(Number) as [number, number];
  return (
    a1 === 10 || a1 === 127 || a1 === 0 || a1 >= 224 ||
    (a1 === 169 && a2 === 254) ||
    (a1 === 172 && a2 >= 16 && a2 <= 31) ||
    (a1 === 192 && a2 === 168) ||
    (a1 === 100 && a2 >= 64 && a2 <= 127)
  );
}

export async function checkWebhookUrl(raw: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "آدرس درست نیست.";
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return "فقط http و https مجاز است.";
  if (u.username || u.password) return "آدرس نباید نام‌کاربری و رمز داشته باشد.";
  if (!(await isPublicHost(u.hostname))) return "آدرس باید یک سرور عمومی در اینترنت باشد (نه شبکه‌ی داخلی یا localhost).";
  return null;
}

type Hook = { id: string; url: string; secret: string; events: string[] };
let cache: { at: number; hooks: Hook[] } | null = null;

export function invalidateWebhookCache(): void {
  cache = null;
}

async function activeHooks(): Promise<Hook[]> {
  if (cache && Date.now() - cache.at < 30_000) return cache.hooks;
  const sql = await getSql();
  const rows = await sql<{ id: string; url: string; secret: string; events: string[] }>`select id, url, secret, events from app_webhooks where enabled`;
  cache = { at: Date.now(), hooks: rows.map((r) => ({ ...r, events: Array.isArray(r.events) ? r.events : ["*"] })) };
  return cache.hooks;
}

export type WebhookEvent = {
  event: string;
  actor: string;
  actorName?: string;
  summary: string;
  boardId?: string | null;
  boardTitle?: string | null;
  cardId?: string | null;
  cardTitle?: string | null;
};

const matches = (events: string[], event: string) => events.some((e) => e === "*" || e === event || (e.endsWith(".*") && event.startsWith(e.slice(0, -1))));

async function deliver(hook: Hook, body: string, event: string): Promise<string> {
  const u = new URL(hook.url);
  if (!(await isPublicHost(u.hostname))) return "blocked: not a public host";
  const signature = createHmac("sha256", hook.secret).update(body).digest("hex");
  try {
    const res = await fetch(hook.url, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/json", "x-sibamotor-event": event, "x-sibamotor-signature": `sha256=${signature}` },
      body,
      signal: AbortSignal.timeout(8000),
    });
    return String(res.status);
  } catch (err) {
    return err instanceof Error ? err.name : "error";
  }
}

/** Sends one change to every webhook that asked for it. Fire and forget; never throws. */
export function dispatchWebhooks(e: WebhookEvent): void {
  void (async () => {
    try {
      const hooks = (await activeHooks()).filter((h) => matches(h.events, e.event));
      if (hooks.length === 0) return;
      const body = JSON.stringify({
        event: e.event,
        at: new Date().toISOString(),
        actor: { username: e.actor, name: e.actorName ?? "" },
        board: e.boardId ? { id: e.boardId, title: e.boardTitle ?? "" } : null,
        card: e.cardId ? { id: e.cardId, title: e.cardTitle ?? "" } : null,
        summary: e.summary,
      });
      const sql = await getSql();
      for (const h of hooks) {
        const status = await deliver(h, body, e.event);
        await sql`update app_webhooks set last_status = ${status}, last_at = now() where id = ${h.id}`;
      }
    } catch (err) {
      console.error("[webhook] failed:", err instanceof Error ? err.message : "unknown error");
    }
  })();
}

/** Sends a test message to one webhook; returns what came back. */
export async function pingWebhook(id: string): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ id: string; url: string; secret: string }>`select id, url, secret from app_webhooks where id = ${id}`;
  const h = rows[0];
  if (!h) return "not found";
  const body = JSON.stringify({ event: "ping", at: new Date().toISOString(), summary: "Test from SibaMotor" });
  const status = await deliver({ ...h, events: ["*"] }, body, "ping");
  await sql`update app_webhooks set last_status = ${status}, last_at = now() where id = ${id}`;
  return status;
}
