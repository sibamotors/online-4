import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const KEYS = ["board", "boards", "overview", "my-requests", "my-approvals", "card-time", "automation-board"];

/**
 * Keeps the screen up to date when somebody else changes something: the server announces
 * "something changed" and we re-read what is on screen. While a window (card, dialog) is open
 * the refresh waits, so nobody loses what they are typing.
 */
export function LiveSync() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      if (!pending) return;
      if (document.querySelector('[role="dialog"]')) {
        timer = setTimeout(flush, 1500); // a window is open: try again shortly
        return;
      }
      pending = false;
      for (const k of KEYS) void qc.invalidateQueries({ queryKey: [k] });
    };

    const es = new EventSource("/api/events");
    es.onmessage = () => {
      pending = true;
      if (!timer) timer = setTimeout(flush, 400);
    };
    // EventSource reconnects by itself; after a reconnect catch up on what was missed
    es.onopen = () => {
      pending = true;
      if (!timer) timer = setTimeout(flush, 400);
    };
    return () => {
      es.close();
      if (timer) clearTimeout(timer);
    };
  }, [qc]);

  return null;
}
