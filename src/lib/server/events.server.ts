/**
 * Tiny in-process event bus for live updates (Server-Sent Events). The app runs as ONE process,
 * so a plain in-memory set of listeners is enough. Messages only say "something changed";
 * each browser then re-reads what it is showing.
 */
type Listener = (line: string) => void;
const g = globalThis as typeof globalThis & { __sseListeners__?: Set<Listener>; __sseTimer__?: ReturnType<typeof setTimeout> | null };
const listeners = (g.__sseListeners__ ??= new Set<Listener>());

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listenerCount(): number {
  return listeners.size;
}

/** Tells every connected browser to refresh (many changes in a row are merged into one message). */
export function publishChange(): void {
  if (listeners.size === 0 || g.__sseTimer__) return;
  g.__sseTimer__ = setTimeout(() => {
    g.__sseTimer__ = null;
    for (const fn of listeners) {
      try {
        fn('data: {"t":"change"}\n\n');
      } catch {
        /* a dead connection removes itself */
      }
    }
  }, 200);
}
