/**
 * Adds browser security headers to every response (Nitro middleware). Dynamic data endpoints are also marked "no-store" so private data is
 * never kept in a shared cache.
 *
 * If a future feature is blocked by the Content-Security-Policy, set the
 * environment variable DISABLE_CSP=1 as an emergency switch (the other headers
 * stay on) and ask for the policy to be adjusted.
 */
interface SecurityEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

const CSP = [
  "default-src 'self'",
  // TanStack Start streams small inline scripts/styles for hydration, so inline scripts stay allowed for now.
  // A strict nonce policy needs `ssr: { nonce }` + a per-request middleware, and the installed version has an
  // open bug (TanStack/router #8550: inline scripts are duplicated after hydration when the nonce comes in a
  // header). Revisit after upgrading TanStack Start, and test it on a copy of the site first.
  // Risk is reduced meanwhile: no innerHTML/eval anywhere in the app, object-src 'none', frame-ancestors 'none'.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
};
if (process.env.DISABLE_CSP !== "1") HEADERS["content-security-policy"] = CSP;

export default async function securityHeaders(
  event: SecurityEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;
  const headers = new Headers(result.headers);
  for (const [name, value] of Object.entries(HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  if (event.url.pathname.startsWith("/_serverFn")) headers.set("cache-control", "no-store");
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
