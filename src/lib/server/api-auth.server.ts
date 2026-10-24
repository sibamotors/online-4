import { createHash } from "node:crypto";
import { getSql } from "../db";

export type ApiPrincipal = { id: string; name: string; scope: "read" | "write" };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const hits = new Map<string, { n: number; reset: number }>();
const LIMIT_PER_MIN = 120;

/** Checks the "Authorization: Bearer …" header. Returns the token's owner, or a ready error response. */
export async function authenticate(request: Request, need: "read" | "write"): Promise<{ principal: ApiPrincipal } | { error: Response }> {
  const json = (status: number, error: string) =>
    ({ error: new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json; charset=utf-8" } }) });
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(sbm_[A-Za-z0-9_-]{20,100})$/.exec(header);
  if (!m) return json(401, "missing or malformed token");
  const hash = hashToken(m[1]!);

  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; scope: "read" | "write" }>`
    select id, name, scope from app_api_tokens where token_hash = ${hash} and not revoked
  `;
  const t = rows[0];
  if (!t) return json(401, "invalid token");
  if (need === "write" && t.scope !== "write") return json(403, "this token is read-only");

  const now = Date.now();
  const h = hits.get(t.id);
  if (!h || h.reset < now) hits.set(t.id, { n: 1, reset: now + 60_000 });
  else if (++h.n > LIMIT_PER_MIN) return json(429, "too many requests");

  void sql`update app_api_tokens set last_used_at = now() where id = ${t.id}`.catch(() => undefined);
  return { principal: t };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
