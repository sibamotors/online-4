import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { adminMiddleware } from "./session-middleware";
import { nid } from "./utils";
import { parse } from "./validate";

export type ApiToken = { id: string; name: string; prefix: string; scope: "read" | "write"; createdAt: string; lastUsedAt: string | null; revoked: boolean };
export type Webhook = { id: string; url: string; events: string[]; enabled: boolean; lastStatus: string | null; lastAt: string | null };

const id100 = z.string().min(1).max(100);

export const listApiTokens = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<ApiToken[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; name: string; prefix: string; scope: "read" | "write"; created_at: string; last_used_at: string | null; revoked: boolean }>`
      select id, name, prefix, scope, created_at, last_used_at, revoked from app_api_tokens order by created_at desc
    `;
    return rows.map((r) => ({ id: r.id, name: r.name, prefix: r.prefix, scope: r.scope, createdAt: r.created_at, lastUsedAt: r.last_used_at, revoked: r.revoked }));
  });

/** The full token is returned ONCE here; afterwards only its hash exists. */
export const createApiToken = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ name: z.string().trim().min(1).max(60), scope: z.enum(["read", "write"]) })))
  .handler(async ({ data, context }): Promise<{ token: string }> => {
    const { randomBytes } = await import("node:crypto");
    const { hashToken } = await import("./server/api-auth.server");
    const token = `sbm_${randomBytes(32).toString("base64url")}`;
    const sql = await getSql();
    await sql`
      insert into app_api_tokens (id, name, token_hash, prefix, scope, created_by)
      values (${nid()}, ${data.name}, ${hashToken(token)}, ${token.slice(0, 12)}, ${data.scope}, ${context.user.username})
    `;
    const { audit } = await import("./server/audit.server");
    await audit({ actor: context.user.username, actorName: context.user.displayName, category: "security", action: "api.token.create", summary: `توکن API «${data.name}» (${data.scope === "write" ? "نوشتن" : "فقط خواندن"}) ساخت` });
    return { token };
  });

export const revokeApiToken = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ name: string }>`update app_api_tokens set revoked = true where id = ${data.id} returning name`;
    if (!rows[0]) return { ok: false };
    const { audit } = await import("./server/audit.server");
    await audit({ actor: context.user.username, actorName: context.user.displayName, category: "security", action: "api.token.revoke", summary: `توکن API «${rows[0].name}» را باطل کرد` });
    return { ok: true };
  });

export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<Webhook[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; url: string; events: string[]; enabled: boolean; last_status: string | null; last_at: string | null }>`
      select id, url, events, enabled, last_status, last_at from app_webhooks order by created_at desc
    `;
    return rows.map((r) => ({ id: r.id, url: r.url, events: Array.isArray(r.events) ? r.events : ["*"], enabled: r.enabled, lastStatus: r.last_status, lastAt: r.last_at }));
  });

/** The signing secret is shown once, so the receiving system can verify the signature. */
export const createWebhook = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ url: z.string().trim().min(8).max(500), events: z.array(z.string().trim().min(1).max(40)).min(1).max(20) })))
  .handler(async ({ data, context }): Promise<{ ok: true; secret: string } | { ok: false; error: string }> => {
    const hooks = await import("./server/webhooks.server");
    const problem = await hooks.checkWebhookUrl(data.url);
    if (problem) return { ok: false, error: problem };
    const { randomBytes } = await import("node:crypto");
    const secret = randomBytes(24).toString("hex");
    const sql = await getSql();
    await sql`
      insert into app_webhooks (id, url, secret, events, created_by)
      values (${nid()}, ${data.url}, ${secret}, ${JSON.stringify(data.events)}::jsonb, ${context.user.username})
    `;
    hooks.invalidateWebhookCache();
    const { audit } = await import("./server/audit.server");
    await audit({ actor: context.user.username, actorName: context.user.displayName, category: "security", action: "webhook.create", summary: `وب‌هوک جدید به ${new URL(data.url).hostname} ساخت` });
    return { ok: true, secret };
  });

export const setWebhookEnabled = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: id100, enabled: z.boolean() })))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`update app_webhooks set enabled = ${data.enabled} where id = ${data.id} returning id`;
    (await import("./server/webhooks.server")).invalidateWebhookCache();
    return { ok: rows.length > 0 };
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`delete from app_webhooks where id = ${data.id} returning id`;
    (await import("./server/webhooks.server")).invalidateWebhookCache();
    return { ok: rows.length > 0 };
  });

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data }): Promise<{ status: string }> => ({ status: await (await import("./server/webhooks.server")).pingWebhook(data.id) }));
