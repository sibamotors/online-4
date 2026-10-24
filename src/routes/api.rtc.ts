import { createFileRoute } from "@tanstack/react-router";

/** GET /api/rtc — live events of the conference room (people joining, signalling, chat). Needs a signed-in session. */
export const Route = createFileRoute("/api/rtc")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        let username: string;
        try {
          const s = await import("@/lib/server/session.server");
          username = (await s.requireSessionUser(false)).username;
        } catch {
          return new Response("unauthorized", { status: 401 });
        }
        const rtc = await import("@/lib/server/rtc.server");
        if (rtc.connectionCount() >= 200) return new Response("busy", { status: 503 });

        const encoder = new TextEncoder();
        let cleanup = () => {};
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            controller.enqueue(encoder.encode("retry: 3000\n\n"));
            const remove = rtc.addConnection(username, send);
            send("room", rtc.publicRoom()); // the current state right away
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(": ping\n\n"));
              } catch {
                cleanup();
              }
            }, 20_000);
            cleanup = () => {
              clearInterval(heartbeat);
              remove();
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
