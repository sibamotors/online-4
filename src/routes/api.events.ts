import { createFileRoute } from "@tanstack/react-router";

/** GET /api/events — a Server-Sent-Events stream: "something changed, refresh". Needs a signed-in session. */
export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const s = await import("@/lib/server/session.server");
          await s.requireSessionUser(false);
        } catch {
          return new Response("unauthorized", { status: 401 });
        }
        const { subscribe, listenerCount } = await import("@/lib/server/events.server");
        if (listenerCount() >= 500) return new Response("busy", { status: 503 });

        const encoder = new TextEncoder();
        let cleanup = () => {};
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (text: string) => controller.enqueue(encoder.encode(text));
            send("retry: 5000\n\n");
            const unsubscribe = subscribe(send);
            const heartbeat = setInterval(() => {
              try {
                send(": ping\n\n");
              } catch {
                cleanup();
              }
            }, 25_000);
            cleanup = () => {
              clearInterval(heartbeat);
              unsubscribe();
              try {
                controller.close();
              } catch {
                /* already closed */
              }
            };
            request.signal.addEventListener("abort", () => cleanup());
          },
          cancel() {
            cleanup();
          },
        });
        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
