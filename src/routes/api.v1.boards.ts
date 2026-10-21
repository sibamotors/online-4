import { createFileRoute } from "@tanstack/react-router";

/** GET /api/v1/boards — boards and their columns (token with read access). */
export const Route = createFileRoute("/api/v1/boards")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const { authenticate, jsonResponse } = await import("@/lib/server/api-auth.server");
        const auth = await authenticate(request, "read");
        if ("error" in auth) return auth.error;
        const { readWorkspaceRaw } = await import("@/lib/server/workspace-raw.server");
        const ws = await readWorkspaceRaw();
        return jsonResponse(
          (ws?.boards ?? []).map((b) => ({
            id: b.id,
            title: b.title,
            lists: (b.lists ?? []).map((l) => ({ id: l.id, title: l.title, cards: (l.cards ?? []).filter((c) => !c.archived).length })),
          })),
        );
      },
    },
  },
});
