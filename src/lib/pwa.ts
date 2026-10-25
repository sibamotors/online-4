/** Small helpers for the installable app (PWA). Browser only. */

// The browser offers "install" once, as an event; keep it so a button can use it later.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

export function startPwa(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((fn) => fn());
  });
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }
}

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const canInstall = () => deferred !== null;

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  listeners.forEach((fn) => fn());
  return choice.outcome === "accepted";
}

/** Already running as an installed app? */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const arrayBufferToBase64Url = (buf: ArrayBuffer | null): string => {
  if (!buf) return "";
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
