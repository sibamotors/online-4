import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { authMiddleware, requireBoardAction, workspaceWriteLock } from "./session-middleware";
import { nid } from "./utils";
import { parse } from "./validate";

export type TimeEntry = {
  id: string;
  username: string;
  displayName: string;
  workDate: string;
  minutes: number;
  note: string;
  createdAt: string;
};

export type CardTime = {
  entries: TimeEntry[];
  totalMinutes: number;
  estimateMinutes: number | null;
};

const tehranDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(d);
const id100 = z.string().min(1).max(100);

/** Time logged on one card, and its estimate. */
export const listCardTime = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ cardId: id100 })))
  .handler(async ({ data }): Promise<CardTime> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; username: string; display_name: string | null; work_date: string; minutes: number; note: string; created_at: string }>`
      select t.id, t.username, u.display_name, t.work_date, t.minutes, t.note, t.created_at
      from app_time_entries t left join login_users u on u.username = t.username
      where t.card_id = ${data.cardId}
      order by t.work_date desc, t.created_at desc
      limit 200
    `;
    const total = await sql<{ m: number }>`select coalesce(sum(minutes), 0)::int as m from app_time_entries where card_id = ${data.cardId}`;
    const { readWorkspaceRaw, findCard } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const hit = ws ? findCard(ws, data.cardId) : null;
    return {
      entries: rows.map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name ?? r.username,
        workDate: r.work_date,
        minutes: r.minutes,
        note: r.note,
        createdAt: r.created_at,
      })),
      totalMinutes: total[0]?.m ?? 0,
      estimateMinutes: typeof hit?.card.estimateMinutes === "number" ? hit.card.estimateMinutes : null,
    };
  });

/** "I worked N minutes on this card" — only for myself. */
export const logTime = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      z.object({
        cardId: id100,
        minutes: z.number().int().min(1).max(1440),
        workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        note: z.string().trim().max(300).optional(),
      }),
    ),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const today = tehranDay(new Date());
    const day = data.workDate ?? today;
    if (day > today) return { ok: false, error: "برای روزهای آینده نمی‌شود زمان ثبت کرد." };
    const oldest = new Date(`${today}T00:00:00Z`);
    oldest.setUTCDate(oldest.getUTCDate() - 60);
    if (day < oldest.toISOString().slice(0, 10)) return { ok: false, error: "ثبت زمان فقط برای ۶۰ روز اخیر ممکن است." };

    const { readWorkspaceRaw, findCard } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const hit = ws ? findCard(ws, data.cardId) : null;
    if (!hit) return { ok: false, error: "کارت پیدا نشد." };

    const sql = await getSql();
    const sum = await sql<{ m: number }>`
      select coalesce(sum(minutes), 0)::int as m from app_time_entries where username = ${context.user.username} and work_date = ${day}
    `;
    if ((sum[0]?.m ?? 0) + data.minutes > 1440) return { ok: false, error: "جمع زمانِ ثبت‌شده در یک روز از ۲۴ ساعت بیشتر می‌شود." };

    await sql`
      insert into app_time_entries (id, username, card_id, board_id, card_title, work_date, minutes, note)
      values (${nid()}, ${context.user.username}, ${data.cardId}, ${hit.board.id}, ${hit.card.title.slice(0, 200)}, ${day}, ${data.minutes}, ${data.note ?? ""})
    `;
    return { ok: true };
  });

export const deleteTimeEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from app_time_entries where id = ${data.id} and (username = ${context.user.username} or ${context.user.isAdmin}) returning id
    `;
    return { ok: rows.length > 0 };
  });

/** The planned effort of a card (minutes), or null to clear it. */
export const setCardEstimate = createServerFn({ method: "POST" })
  .middleware([requireBoardAction("edit_card"), workspaceWriteLock])
  .validator(parse(z.object({ cardId: id100, minutes: z.number().int().min(1).max(100_000).nullable() })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { readWorkspaceRaw, writeWorkspaceRaw, findCard } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const hit = ws ? findCard(ws, data.cardId) : null;
    if (!ws || !hit) return { ok: false };
    await (await import("./server/board-roles.server")).assertBoardWritable(context.user, hit.board.id);
    hit.card.estimateMinutes = data.minutes;
    await writeWorkspaceRaw(ws);
    return { ok: true };
  });
