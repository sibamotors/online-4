import { getSql } from "../db";
import { isoToJalaaliStr } from "../jalali";
import { baleConfigured, sendBaleMessage, startBalePolling } from "./bale.server";
import { pushConfigured } from "./push.server";
import { notifyUser } from "./notify.server";

/**
 * Background work that lives inside the (single) app process:
 *  - the Bale bot poller (link codes)
 *  - due-date reminders sent to Bale
 * Started once, the first time the database is used after a start.
 */
const g = globalThis as typeof globalThis & { __backgroundStarted__?: boolean };

const REMINDER_EVERY_MS = 10 * 60 * 1000;

export function startBackground(): void {
  if (g.__backgroundStarted__) return;
  g.__backgroundStarted__ = true;
  startBalePolling(); // does nothing without a bot token
  setTimeout(() => void runJobs(), 30_000);
  setInterval(() => void runJobs(), REMINDER_EVERY_MS).unref?.();
}

async function runJobs(): Promise<void> {
  for (const [name, job] of [
    ["reminders", runDueReminders],
    ["digests", runDigests],
    ["overdue-automation", runOverdueAutomations],
    ["scrum-snapshots", runScrumSnapshots],
  ] as const) {
    try {
      await job();
    } catch (err) {
      console.error(`[${name}] failed:`, err instanceof Error ? err.message : "unknown error");
    }
  }
}

/** Current date (yyyy-mm-dd) and hour in Tehran, regardless of the server's time zone. */
function tehranNow(): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type Ws = {
  people?: { id: string; username?: string }[];
  boards?: {
    id: string;
    lists?: {
      cards?: {
        id: string;
        title?: string;
        dueDate?: string | null;
        archived?: boolean;
        memberIds?: string[];
        followerId?: string | null;
      }[];
    }[];
  }[];
};

/**
 * Once per card, person and due date: "due today / tomorrow" and "overdue" (only in the daytime, Tehran time).
 * Cards in the last column count as finished and are skipped.
 */
async function runDueReminders(): Promise<void> {
  if (!baleConfigured() && !pushConfigured()) return; // the in-app bell already shows due dates on its own
  const now = tehranNow();
  if (now.hour < 8 || now.hour >= 20) return;
  const today = now.day;
  const tomorrow = addDays(today, 1);
  const oldest = addDays(today, -30); // do not dig up very old overdue cards

  const sql = await getSql();
  const rows = await sql<{ data: unknown }>`select data from workspace_state where id = 'main'`;
  const raw = rows[0]?.data;
  const ws = (typeof raw === "string" ? JSON.parse(raw) : raw) as Ws | null;
  if (!ws?.boards) return;
  const usernameOf = new Map((ws.people ?? []).filter((p) => p.username).map((p) => [p.id, p.username!.toLowerCase()]));

  type Item = { cardId: string; title: string; boardId: string; username: string; kind: "due_soon" | "overdue"; due: string };
  const items: Item[] = [];
  for (const b of ws.boards) {
    const lists = b.lists ?? [];
    lists.forEach((l, i) => {
      if (i === lists.length - 1) return; // finished column
      for (const c of l.cards ?? []) {
        if (c.archived || !c.dueDate) continue;
        const due = String(c.dueDate).slice(0, 10);
        let kind: Item["kind"] | null = null;
        if (due === today || due === tomorrow) kind = "due_soon";
        else if (due < today && due >= oldest) kind = "overdue";
        if (!kind) continue;
        const people = new Set([...(c.memberIds ?? []), ...(c.followerId ? [c.followerId] : [])]);
        for (const pid of people) {
          const username = usernameOf.get(pid);
          if (username) items.push({ cardId: c.id, title: c.title ?? "", boardId: b.id, username, kind, due });
        }
      }
    });
  }

  for (const it of items) {
    const first = await sql<{ card_id: string }>`
      insert into app_reminder_log (card_id, username, kind, due_date)
      values (${it.cardId}, ${it.username}, ${it.kind}, ${it.due})
      on conflict do nothing
      returning card_id
    `;
    if (first.length === 0) continue; // already reminded
    const title =
      it.kind === "overdue"
        ? `کارت «${it.title}» از مهلتش گذشته است`
        : `مهلت کارت «${it.title}» ${it.due === today ? "امروز" : "فردا"} است`;
    // the in-app bell already shows due dates by itself, so these go to Bale only
    await notifyUser({ username: it.username, kind: "reminder", title, href: `/b/${it.boardId}`, inApp: false });
  }

  await sql`delete from app_reminder_log where sent_at < now() - interval '60 days'`;
}

/**
 * "Card became overdue" rules. Runs for boards that have such a rule; each card is handled once per due date
 * (remembered in the card itself). Runs inside the workspace lock, like every other workspace change.
 */
async function runOverdueAutomations(): Promise<void> {
  const sql = await getSql();
  const boardRows = await sql<{ board_id: string }>`
    select distinct board_id from app_automation_rules where enabled and trigger->>'type' = 'overdue'
  `;
  if (boardRows.length === 0) return;
  const now = tehranNow();
  if (now.hour < 6 || now.hour >= 22) return;
  const today = now.day;
  const oldest = addDays(today, -30);
  const { withWorkspaceLock } = await import("./lock.server");
  const { runAutomations } = await import("./automation.server");

  await withWorkspaceLock(async () => {
    const rows = await sql<{ data: unknown }>`select data from workspace_state where id = 'main'`;
    const raw = rows[0]?.data;
    const ws = (typeof raw === "string" ? JSON.parse(raw) : raw) as {
      people: never[];
      boards: import("../types").Board[];
    } | null;
    if (!ws?.boards) return;
    let changed = false;
    for (const { board_id } of boardRows) {
      const board = ws.boards.find((b) => b.id === board_id);
      if (!board) continue;
      const lists = board.lists ?? [];
      for (let i = 0; i < lists.length - 1; i += 1) {
        // the last column means "finished"
        for (const card of [...(lists[i]!.cards ?? [])]) {
          if (card.archived || !card.dueDate) continue;
          const due = String(card.dueDate).slice(0, 10);
          if (due >= today || due < oldest || card.overdueFlaggedFor === due) continue;
          card.overdueFlaggedFor = due;
          changed = true;
          await runAutomations(ws as never, {
            type: "overdue",
            boardId: board.id,
            cardId: card.id,
            listId: lists[i]!.id,
            actor: null,
          });
        }
      }
    }
    if (changed) {
      await sql`
        insert into workspace_state (id, data, updated_at)
        values ('main', ${JSON.stringify(ws)}::jsonb, now())
        on conflict (id) do update set data = excluded.data, updated_at = now()
      `;
      (await import("./events.server")).publishChange();
    }
  });
}

/**
 * Morning summary in Bale for people who asked for it: how many open cards, how many are late or due soon,
 * and the most urgent few. "daily" every morning, "weekly" on Saturday. Sent at most once per person and day.
 */
async function runDigests(): Promise<void> {
  if (!baleConfigured()) return;
  const now = tehranNow();
  if (now.hour < 8 || now.hour >= 10) return;
  const today = now.day;
  const isSaturday = new Date(`${today}T00:00:00Z`).getUTCDay() === 6;
  const soonEnd = addDays(today, 7);

  const sql = await getSql();
  const users = await sql<{ username: string; display_name: string; bale_chat_id: string; bale_digest: "daily" | "weekly" }>`
    select username, display_name, bale_chat_id, bale_digest from login_users
    where bale_chat_id is not null and bale_notify and bale_digest <> 'off'
  `;
  if (users.length === 0) return;
  const rows = await sql<{ data: unknown }>`select data from workspace_state where id = 'main'`;
  const raw = rows[0]?.data;
  const ws = (typeof raw === "string" ? JSON.parse(raw) : raw) as Ws | null;
  if (!ws?.boards) return;
  const personByUsername = new Map((ws.people ?? []).filter((p) => p.username).map((p) => [p.username!.toLowerCase(), p.id]));
  const appUrl = process.env.APP_URL?.trim().replace(/\/+$/, "");

  for (const u of users) {
    if (u.bale_digest === "weekly" && !isSaturday) continue;
    const pid = personByUsername.get(u.username);
    if (!pid) continue;

    const mine: { title: string; due: string | null }[] = [];
    for (const b of ws.boards) {
      const lists = b.lists ?? [];
      lists.forEach((l, i) => {
        if (i === lists.length - 1) return; // finished column
        for (const c of l.cards ?? []) {
          if (c.archived || !(c.memberIds ?? []).includes(pid)) continue;
          mine.push({ title: c.title ?? "", due: c.dueDate ? String(c.dueDate).slice(0, 10) : null });
        }
      });
    }
    if (mine.length === 0) continue;

    const first = await sql<{ username: string }>`
      insert into app_reminder_log (card_id, username, kind, due_date) values ('-', ${u.username}, 'digest', ${today})
      on conflict do nothing returning username
    `;
    if (first.length === 0) continue; // already sent today

    const late = mine.filter((c) => c.due && c.due < today);
    const soon = mine.filter((c) => c.due && c.due >= today && c.due <= soonEnd);
    const urgent = [...late, ...soon].sort((a, b) => (a.due ?? "").localeCompare(b.due ?? "")).slice(0, 5);
    const lines = [
      u.bale_digest === "weekly" ? `خلاصه‌ی هفته — ${u.display_name}` : `صبح بخیر ${u.display_name}`,
      `کارهای باز شما: ${mine.length}`,
      `دیرکرد: ${late.length} · سررسید تا ۷ روز: ${soon.length}`,
      ...urgent.map((c) => `• ${c.title} (${isoToJalaaliStr(c.due)})`),
      appUrl ? `${appUrl}/my` : "",
    ].filter(Boolean);
    await sendBaleMessage(u.bale_chat_id, lines.join("\n"));
  }
}

/**
 * Burndown data for active sprints is recorded here every few minutes (it used to be recorded only when
 * somebody opened the scrum page, which left gaps in the chart). "Finished" = the card is in the board's last column.
 */
async function runScrumSnapshots(): Promise<void> {
  const sql = await getSql();
  const sprints = await sql<{ id: string; board_id: string }>`select id, board_id from app_scrum_sprints where status = 'active'`;
  if (sprints.length === 0) return;
  const rows = await sql<{ data: unknown }>`select data from workspace_state where id = 'main'`;
  const raw = rows[0]?.data;
  const ws = (typeof raw === "string" ? JSON.parse(raw) : raw) as Ws | null;
  if (!ws?.boards) return;
  const day = new Date().toISOString().slice(0, 10); // same day key as the scrum page uses

  for (const sp of sprints) {
    const board = ws.boards.find((b) => b.id === sp.board_id);
    if (!board) continue;
    const lists = board.lists ?? [];
    const done = new Set<string>();
    lists.forEach((l, i) => {
      if (i !== lists.length - 1) return;
      for (const c of l.cards ?? []) done.add(c.id);
    });
    const cards = await sql<{ card_id: string; points: number | null }>`select card_id, points from app_scrum_cards where sprint_id = ${sp.id}`;
    const total = cards.reduce((n, c) => n + (c.points ?? 0), 0);
    const remaining = cards.filter((c) => !done.has(c.card_id)).reduce((n, c) => n + (c.points ?? 0), 0);
    await sql`
      insert into app_scrum_snapshots (sprint_id, day, remaining, total)
      values (${sp.id}, ${day}::date, ${remaining}, ${total})
      on conflict (sprint_id, day) do update set remaining = excluded.remaining, total = excluded.total
    `;
  }
}
