import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./session-middleware";

export type Overview = {
  boards: { id: string; title: string; total: number; open: number; overdue: number; dueSoon: number; done: number }[];
  totals: { boards: number; open: number; overdue: number; dueSoon: number; doneThisWeek: number };
  people: {
    name: string;
    open: number;
    overdue: number;
    dueSoon: number;
    /** minutes logged since the start of this week (Saturday) */
    loggedWeekMin: number;
    /** estimated minutes still to do on their open cards (estimate minus time already logged) */
    plannedMin: number;
  }[];
  /** one person's weekly capacity in minutes */
  capacityMin: number;
  /** last 8 weeks, oldest first; `start` is the Saturday (yyyy-mm-dd) the week begins on */
  weeks: { start: string; created: number; completed: number }[];
};

type RawWs = {
  people?: { id: string; firstName?: string; lastName?: string; username?: string }[];
  boards?: {
    id: string;
    title: string;
    lists?: {
      cards?: {
        id: string;
        estimateMinutes?: number | null;
        archived?: boolean;
        dueDate?: string | null;
        createdAt?: string;
        enteredListAt?: string | null;
        memberIds?: string[];
      }[];
    }[];
  }[];
};

const tehranDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(d);

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The Saturday on or before `day` (the Iranian week starts on Saturday). */
function weekStart(day: string): string {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday … 6 = Saturday
  return addDays(day, -((dow + 1) % 7));
}

const day10 = (iso?: string | null) => (iso ? tehranDay(new Date(iso)) : null);

/**
 * One page for managers: every board's status, who carries how much, and the weekly trend.
 * The last column of a board counts as "finished".
 */
export const getOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<Overview> => {
    const sql = await getSql();
    const rows = await sql<{ data: unknown }>`select data from workspace_state where id = 'main'`;
    const raw = rows[0]?.data;
    const ws = ((typeof raw === "string" ? JSON.parse(raw) : raw) ?? {}) as RawWs;

    const today = tehranDay(new Date());
    const soonEnd = addDays(today, 7);
    const weekAgo = addDays(today, -7);
    const names = new Map((ws.people ?? []).map((p) => [p.id, `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()]));

    const thisWeek = weekStart(today);
    const weeks = Array.from({ length: 8 }, (_, i) => ({ start: addDays(thisWeek, (i - 7) * 7), created: 0, completed: 0 }));
    const weekIndex = (day: string | null) => (day ? weeks.findIndex((w) => day >= w.start && day < addDays(w.start, 7)) : -1);

    // time already logged: per person this week, and per card overall
    const weekRows = await sql<{ username: string; m: number }>`
      select username, sum(minutes)::int as m from app_time_entries where work_date >= ${thisWeek} group by username
    `;
    const cardRows = await sql<{ card_id: string; m: number }>`select card_id, sum(minutes)::int as m from app_time_entries group by card_id`;
    const loggedWeek = new Map(weekRows.map((r) => [r.username, r.m]));
    const loggedByCard = new Map(cardRows.map((r) => [r.card_id, r.m]));
    type Load = Overview["people"][number];
    const load = new Map<string, Load>();
    const boards: Overview["boards"] = [];
    const totals = { boards: 0, open: 0, overdue: 0, dueSoon: 0, doneThisWeek: 0 };

    for (const b of ws.boards ?? []) {
      const lists = b.lists ?? [];
      const row = { id: b.id, title: b.title, total: 0, open: 0, overdue: 0, dueSoon: 0, done: 0 };
      lists.forEach((l, li) => {
        const isDone = li === lists.length - 1;
        for (const c of l.cards ?? []) {
          if (c.archived) continue;
          row.total += 1;
          const created = weekIndex(day10(c.createdAt));
          if (created >= 0) weeks[created]!.created += 1;
          if (isDone) {
            row.done += 1;
            const finished = day10(c.enteredListAt);
            const w = weekIndex(finished);
            if (w >= 0) weeks[w]!.completed += 1;
            if (finished && finished >= weekAgo) totals.doneThisWeek += 1;
            continue;
          }
          row.open += 1;
          const due = c.dueDate ? String(c.dueDate).slice(0, 10) : null;
          const late = Boolean(due && due < today);
          const soon = Boolean(due && due >= today && due <= soonEnd);
          if (late) row.overdue += 1;
          if (soon) row.dueSoon += 1;
          for (const pid of c.memberIds ?? []) {
            const name = names.get(pid);
            if (!name) continue;
            const p = load.get(pid) ?? { name, open: 0, overdue: 0, dueSoon: 0, loggedWeekMin: 0, plannedMin: 0 };
            p.open += 1;
            if (late) p.overdue += 1;
            if (soon) p.dueSoon += 1;
            if (typeof c.estimateMinutes === "number" && c.estimateMinutes > 0) {
              const left = Math.max(c.estimateMinutes - (loggedByCard.get(c.id) ?? 0), 0);
              p.plannedMin += Math.round(left / Math.max((c.memberIds ?? []).length, 1));
            }
            load.set(pid, p);
          }
        }
      });
      boards.push(row);
      totals.boards += 1;
      totals.open += row.open;
      totals.overdue += row.overdue;
      totals.dueSoon += row.dueSoon;
    }

    // everybody who logged time this week shows up, even without open cards
    for (const p of ws.people ?? []) {
      const logged = p.username ? loggedWeek.get(p.username.toLowerCase()) ?? 0 : 0;
      const name = names.get(p.id);
      if (!name) continue;
      const entry = load.get(p.id) ?? (logged > 0 ? { name, open: 0, overdue: 0, dueSoon: 0, loggedWeekMin: 0, plannedMin: 0 } : null);
      if (!entry) continue;
      entry.loggedWeekMin = logged;
      load.set(p.id, entry);
    }

    const capacityHours = Number(process.env.WEEKLY_CAPACITY_HOURS);
    return {
      boards,
      totals,
      weeks,
      capacityMin: Math.round((Number.isFinite(capacityHours) && capacityHours > 0 ? capacityHours : 44) * 60),
      people: [...load.values()].sort((a, b) => b.open - a.open || b.overdue - a.overdue).slice(0, 30),
    };
  });
