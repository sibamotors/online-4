import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { adminMiddleware, authMiddleware } from "./session-middleware";
import { nid } from "./utils";
import { parse } from "./validate";

export type KeyResultInput = {
  id: string;
  title: string;
  /** "cards": progress follows the linked cards; "manual": current ÷ target */
  kind: "cards" | "manual";
  target?: number;
  current?: number;
  cardIds?: string[];
};

export type KeyResult = KeyResultInput & {
  progress: number;
  cards: { id: string; title: string; boardId: string; progress: number }[];
};

export type Objective = {
  id: string;
  title: string;
  period: string;
  ownerUsername: string;
  ownerName: string;
  progress: number;
  keyResults: KeyResult[];
};

export type ProjectStatus = {
  id: string;
  name: string;
  description: string;
  boardIds: string[];
  /** green: nothing late · yellow: a few late · red: many late */
  status: "green" | "yellow" | "red";
  open: number;
  overdue: number;
  done: number;
  total: number;
  boards: { id: string; title: string; open: number; overdue: number }[];
};

export type GoalsData = {
  objectives: Objective[];
  projects: ProjectStatus[];
  boards: { id: string; title: string }[];
};

const id100 = z.string().min(1).max(100);
const krSchema = z.object({
  id: id100,
  title: z.string().trim().min(1).max(200),
  kind: z.enum(["cards", "manual"]),
  target: z.number().min(0).max(1e9).optional(),
  current: z.number().min(0).max(1e9).optional(),
  cardIds: z.array(id100).max(50).optional(),
});
const objectiveSchema = z.object({
  id: z.string().max(100).optional(),
  title: z.string().trim().min(1).max(200),
  period: z.string().trim().max(40),
  krs: z.array(krSchema).min(1).max(10),
});

const tehranDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(d);
const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const getGoals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<GoalsData> => {
    const { readWorkspaceRaw } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const sql = await getSql();
    const today = tehranDay(new Date());

    // one pass over the cards: progress by id, and open / overdue per board
    const cards = new Map<string, { id: string; title: string; boardId: string; progress: number }>();
    const perBoard = new Map<string, { title: string; open: number; overdue: number }>();
    for (const b of ws?.boards ?? []) {
      const lists = b.lists ?? [];
      const row = { title: b.title, open: 0, overdue: 0 };
      lists.forEach((l, i) => {
        const done = i === lists.length - 1;
        for (const c of l.cards ?? []) {
          if (c.archived) continue;
          cards.set(c.id, { id: c.id, title: c.title, boardId: b.id, progress: done ? 100 : c.progress ?? 0 });
          if (!done) {
            row.open += 1;
            if (c.dueDate && String(c.dueDate).slice(0, 10) < today) row.overdue += 1;
          }
        }
      });
      perBoard.set(b.id, row);
    }

    const objRows = await sql<{ id: string; title: string; period: string; owner_username: string; display_name: string | null; krs: KeyResultInput[] }>`
      select o.id, o.title, o.period, o.owner_username, u.display_name, o.krs
      from app_objectives o left join login_users u on u.username = o.owner_username
      order by o.created_at desc
    `;
    const objectives: Objective[] = objRows.map((o) => {
      const keyResults: KeyResult[] = (Array.isArray(o.krs) ? o.krs : []).map((k) => {
        const linked = (k.cardIds ?? []).map((id) => cards.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
        const progress =
          k.kind === "cards"
            ? linked.length ? pct(linked.reduce((s, c) => s + c.progress, 0) / linked.length) : 0
            : k.target && k.target > 0 ? pct(((k.current ?? 0) / k.target) * 100) : 0;
        return { ...k, progress, cards: linked };
      });
      const progress = keyResults.length ? pct(keyResults.reduce((s, k) => s + k.progress, 0) / keyResults.length) : 0;
      return { id: o.id, title: o.title, period: o.period, ownerUsername: o.owner_username, ownerName: o.display_name ?? o.owner_username, progress, keyResults };
    });

    const projRows = await sql<{ id: string; name: string; description: string; board_ids: string[] }>`select id, name, description, board_ids from app_projects order by created_at`;
    const projects: ProjectStatus[] = projRows.map((p) => {
      const boards = (Array.isArray(p.board_ids) ? p.board_ids : []).map((id) => ({ id, ...(perBoard.get(id) ?? null) })).filter((b): b is { id: string; title: string; open: number; overdue: number } => Boolean(b.title));
      const open = boards.reduce((s, b) => s + b.open, 0);
      const overdue = boards.reduce((s, b) => s + b.overdue, 0);
      let total = 0;
      let done = 0;
      for (const c of cards.values()) {
        if (boards.some((b) => b.id === c.boardId)) {
          total += 1;
          if (c.progress === 100) done += 1;
        }
      }
      const status = overdue === 0 ? "green" : overdue / Math.max(open, 1) < 0.2 ? "yellow" : "red";
      return { id: p.id, name: p.name, description: p.description, boardIds: boards.map((b) => b.id), status, open, overdue, done, total, boards };
    });

    return { objectives, projects, boards: (ws?.boards ?? []).map((b) => ({ id: b.id, title: b.title })) };
  });

/** Cards of one board, for linking to a key result. */
export const listBoardCardsForGoals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ boardId: id100 })))
  .handler(async ({ data }): Promise<{ id: string; title: string }[]> => {
    const { readWorkspaceRaw } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const b = ws?.boards.find((x) => x.id === data.boardId);
    return (b?.lists ?? []).flatMap((l) => (l.cards ?? []).filter((c) => !c.archived).map((c) => ({ id: c.id, title: c.title })));
  });

export const saveObjective = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(objectiveSchema))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    for (const k of data.krs) {
      if (k.kind === "manual" && !(k.target && k.target > 0)) return { ok: false, error: `برای «${k.title}» مقدار هدف را بنویسید.` };
    }
    const sql = await getSql();
    const krs = JSON.stringify(data.krs);
    if (data.id) {
      const rows = await sql<{ id: string }>`
        update app_objectives set title = ${data.title}, period = ${data.period}, krs = ${krs}::jsonb
        where id = ${data.id} and (owner_username = ${context.user.username} or ${context.user.isAdmin}) returning id
      `;
      return rows.length ? { ok: true } : { ok: false, error: "فقط صاحب هدف یا مدیر می‌تواند ویرایش کند." };
    }
    await sql`insert into app_objectives (id, title, owner_username, period, krs) values (${nid()}, ${data.title}, ${context.user.username}, ${data.period}, ${krs}::jsonb)`;
    return { ok: true };
  });

export const deleteObjective = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`delete from app_objectives where id = ${data.id} and (owner_username = ${context.user.username} or ${context.user.isAdmin}) returning id`;
    return { ok: rows.length > 0 };
  });

export const saveProject = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: z.string().max(100).optional(), name: z.string().trim().min(1).max(120), description: z.string().trim().max(500), boardIds: z.array(id100).max(50) })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const ids = JSON.stringify(data.boardIds);
    if (data.id) {
      const rows = await sql<{ id: string }>`update app_projects set name = ${data.name}, description = ${data.description}, board_ids = ${ids}::jsonb where id = ${data.id} returning id`;
      return { ok: rows.length > 0 };
    }
    await sql`insert into app_projects (id, name, description, board_ids, created_by) values (${nid()}, ${data.name}, ${data.description}, ${ids}::jsonb, ${context.user.username})`;
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`delete from app_projects where id = ${data.id} returning id`;
    return { ok: rows.length > 0 };
  });
