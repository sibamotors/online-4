import { createFileRoute } from "@tanstack/react-router";

/**
 * GET  /api/v1/boards/:boardId/cards             — the cards of a board (add ?archived=1 to include archived ones)
 * POST /api/v1/boards/:boardId/cards             — create a card: {"title","listId"?,"notes"?,"priority"?,"dueDate"?}
 * Both need  Authorization: Bearer sbm_…  (POST needs a token with write access).
 */
export const Route = createFileRoute("/api/v1/boards/$boardId/cards")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { boardId: string } }) => {
        const { authenticate, jsonResponse } = await import("@/lib/server/api-auth.server");
        const auth = await authenticate(request, "read");
        if ("error" in auth) return auth.error;
        const { readWorkspaceRaw } = await import("@/lib/server/workspace-raw.server");
        const ws = await readWorkspaceRaw();
        const board = ws?.boards.find((b) => b.id === params.boardId);
        if (!ws || !board) return jsonResponse({ error: "board not found" }, 404);
        const withArchived = new URL(request.url).searchParams.get("archived") === "1";
        const people = new Map(ws.people.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]));
        const lists = board.lists ?? [];
        return jsonResponse(
          lists.flatMap((l, i) =>
            (l.cards ?? [])
              .filter((c) => withArchived || !c.archived)
              .map((c) => ({
                id: c.id,
                title: c.title,
                notes: c.notes,
                listId: l.id,
                list: l.title,
                done: i === lists.length - 1,
                priority: c.priority,
                dueDate: c.dueDate,
                startDate: c.startDate,
                progress: c.progress,
                assignees: (c.memberIds ?? []).map((id) => people.get(id)).filter(Boolean),
                archived: c.archived,
                estimateMinutes: c.estimateMinutes ?? null,
              })),
          ),
        );
      },

      POST: async ({ request, params }: { request: Request; params: { boardId: string } }) => {
        const { authenticate, jsonResponse } = await import("@/lib/server/api-auth.server");
        const auth = await authenticate(request, "write");
        if ("error" in auth) return auth.error;
        const { principal } = auth;

        if (Number(request.headers.get("content-length") ?? 0) > 65_536) return jsonResponse({ error: "body too large" }, 413);
        const { z } = await import("zod");
        const parsed = z
          .object({
            title: z.string().trim().min(1).max(200),
            listId: z.string().max(100).optional(),
            notes: z.string().max(20_000).optional(),
            priority: z.enum(["high", "med", "low"]).optional(),
            dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
          })
          .safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonResponse({ error: "invalid body", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
        const d = parsed.data;

        const { withWorkspaceLock } = await import("@/lib/server/lock.server");
        const { readWorkspaceRaw, writeWorkspaceRaw } = await import("@/lib/server/workspace-raw.server");
        return withWorkspaceLock(async () => {
          const ws = await readWorkspaceRaw();
          const board = ws?.boards.find((b) => b.id === params.boardId);
          if (!ws || !board) return jsonResponse({ error: "board not found" }, 404);
          const list = d.listId ? board.lists?.find((l) => l.id === d.listId) : board.lists?.[0];
          if (!list) return jsonResponse({ error: "list not found" }, 404);

          const by = `API: ${principal.name}`;
          const id = crypto.randomUUID();
          const last = list.cards[list.cards.length - 1];
          list.cards.push({
            id,
            listId: list.id,
            boardId: board.id,
            title: d.title,
            notes: d.notes ?? "",
            priority: d.priority ?? "med",
            dueDate: d.dueDate ?? null,
            startDate: null,
            coverColor: null,
            position: (last?.position ?? 0) + 1000,
            archived: false,
            followerId: null,
            memberIds: [],
            labelIds: [],
            progress: 0,
            createdAt: new Date().toISOString().slice(0, 10),
            checklists: [],
            comments: [],
            activities: [{ id: crypto.randomUUID(), at: new Date().toISOString(), by, text: `کارت از طریق API ساخته شد` }],
            dependsOnIds: [],
            enteredListAt: new Date().toISOString(),
          });
          const { runAutomations } = await import("@/lib/server/automation.server");
          await runAutomations(ws, { type: "card_created", boardId: board.id, cardId: id, listId: list.id, actor: { username: `api:${principal.name}`, displayName: by } });
          await writeWorkspaceRaw(ws);
          const { audit } = await import("@/lib/server/audit.server");
          await audit({ actor: `api:${principal.name}`, actorName: by, category: "card", action: "card.create", boardId: board.id, boardTitle: board.title, cardId: id, cardTitle: d.title, summary: `کارت «${d.title}» از طریق API ساخته شد` });
          return jsonResponse({ id, listId: list.id }, 201);
        });
      },
    },
  },
});
