import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { authMiddleware, requireBoardAction, workspaceWriteLock } from "./session-middleware";
import type { CardApproval } from "./types";
import { parse } from "./validate";

export type PendingApproval = {
  cardId: string;
  boardId: string;
  boardTitle: string;
  cardTitle: string;
  requestedByName: string;
  requestedAt: string;
};

const id100 = z.string().min(1).max(100);

async function note(
  who: { username: string; displayName: string },
  card: { id: string; title: string },
  board: { id: string; title: string },
  action: string,
  text: string,
) {
  const { audit } = await import("./server/audit.server");
  await audit({
    actor: who.username,
    actorName: who.displayName,
    category: "card",
    action,
    boardId: board.id,
    boardTitle: board.title,
    cardId: card.id,
    cardTitle: card.title,
    summary: text,
  });
}

function activity(card: { activities?: { id: string; at: string; by: string; text: string }[] }, by: string, text: string) {
  if (!Array.isArray(card.activities)) card.activities = [];
  card.activities.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), by, text });
  if (card.activities.length > 300) card.activities.length = 300;
}

/** Ask one person to approve a card. */
export const requestApproval = createServerFn({ method: "POST" })
  .middleware([requireBoardAction("edit_card"), workspaceWriteLock])
  .validator(parse(z.object({ cardId: id100, approverUsername: z.string().trim().toLowerCase().min(1).max(64) })))
  .handler(async ({ data, context }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const sql = await getSql();
    const u = await sql<{ username: string; display_name: string }>`select username, display_name from login_users where username = ${data.approverUsername}`;
    if (!u[0]) return { ok: false, error: "کاربر پیدا نشد." };
    if (u[0].username === context.user.username) return { ok: false, error: "برای تأیید خودتان نمی‌توانید درخواست بدهید." };
    const { readWorkspaceRaw, writeWorkspaceRaw, findCard } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const hit = ws ? findCard(ws, data.cardId) : null;
    if (!ws || !hit) return { ok: false, error: "کارت پیدا نشد." };
    await (await import("./server/board-roles.server")).assertBoardWritable(context.user, hit.board.id);
    if (hit.card.approval?.status === "pending") return { ok: false, error: "این کارت همین حالا منتظر تأیید است." };

    const approval: CardApproval = {
      status: "pending",
      requestedByUsername: context.user.username,
      requestedByName: context.user.displayName,
      approverUsername: u[0].username,
      approverName: u[0].display_name,
      requestedAt: new Date().toISOString(),
    };
    hit.card.approval = approval;
    activity(hit.card, context.user.displayName, `از «${u[0].display_name}» درخواست تأیید کرد`);
    await writeWorkspaceRaw(ws);
    await note(context.user, hit.card, hit.board, "approval.request", `برای کارت «${hit.card.title}» از «${u[0].display_name}» درخواست تأیید کرد`);
    const { notifyUser } = await import("./server/notify.server");
    await notifyUser({
      username: u[0].username,
      kind: "approval",
      title: `درخواست تأیید: ${hit.card.title}`,
      body: `از ${context.user.displayName}`,
      href: `/b/${hit.board.id}`,
    });
    return { ok: true };
  });

/** The approver answers. */
export const decideApproval = createServerFn({ method: "POST" })
  .middleware([authMiddleware, workspaceWriteLock])
  .validator(parse(z.object({ cardId: id100, decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(500).optional() })))
  .handler(async ({ data, context }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { readWorkspaceRaw, writeWorkspaceRaw, findCard } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const hit = ws ? findCard(ws, data.cardId) : null;
    const a = hit?.card.approval;
    if (!ws || !hit || !a || a.status !== "pending") return { ok: false, error: "درخواستی برای تأیید وجود ندارد." };
    if (a.approverUsername !== context.user.username && !context.user.isAdmin) return { ok: false, error: "فقط تأییدکننده می‌تواند جواب بدهد." };

    a.status = data.decision;
    a.decidedAt = new Date().toISOString();
    a.note = data.note || undefined;
    const word = data.decision === "approved" ? "تأیید کرد" : "رد کرد";
    activity(hit.card, context.user.displayName, `کارت را ${word}${data.note ? `: ${data.note}` : ""}`);
    await writeWorkspaceRaw(ws);
    await note(context.user, hit.card, hit.board, `approval.${data.decision}`, `کارت «${hit.card.title}» را ${word}`);
    const { notifyUser } = await import("./server/notify.server");
    await notifyUser({
      username: a.requestedByUsername,
      kind: "approval",
      title: `کارت «${hit.card.title}» ${data.decision === "approved" ? "تأیید شد" : "رد شد"}`,
      body: data.note ?? "",
      href: `/b/${hit.board.id}`,
    });
    return { ok: true };
  });

/** The requester (or an admin) withdraws a pending request. */
export const cancelApproval = createServerFn({ method: "POST" })
  .middleware([authMiddleware, workspaceWriteLock])
  .validator(parse(z.object({ cardId: id100 })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { readWorkspaceRaw, writeWorkspaceRaw, findCard } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const hit = ws ? findCard(ws, data.cardId) : null;
    const a = hit?.card.approval;
    if (!ws || !hit || !a) return { ok: false };
    if (a.requestedByUsername !== context.user.username && !context.user.isAdmin) return { ok: false };
    hit.card.approval = null;
    activity(hit.card, context.user.displayName, "درخواست تأیید را پس گرفت");
    await writeWorkspaceRaw(ws);
    await note(context.user, hit.card, hit.board, "approval.cancel", `درخواست تأیید کارت «${hit.card.title}» را پس گرفت`);
    return { ok: true };
  });

/** Cards waiting for MY answer. */
export const listMyApprovals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PendingApproval[]> => {
    const { readWorkspaceRaw } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const out: PendingApproval[] = [];
    for (const b of ws?.boards ?? []) {
      for (const l of b.lists ?? []) {
        for (const c of l.cards ?? []) {
          const a = c.approval;
          if (c.archived || a?.status !== "pending" || a.approverUsername !== context.user.username) continue;
          out.push({ cardId: c.id, boardId: b.id, boardTitle: b.title, cardTitle: c.title, requestedByName: a.requestedByName, requestedAt: a.requestedAt });
        }
      }
    }
    return out.sort((x, y) => x.requestedAt.localeCompare(y.requestedAt));
  });
