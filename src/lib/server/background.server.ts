import { getSql } from "../db";
import { baleConfigured, startBalePolling } from "./bale.server";
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
  if (!baleConfigured()) return;
  startBalePolling();
  setTimeout(() => void safeReminders(), 30_000);
  setInterval(() => void safeReminders(), REMINDER_EVERY_MS).unref?.();
}

async function safeReminders(): Promise<void> {
  try {
    await runDueReminders();
  } catch (err) {
    console.error("[reminders] failed:", err instanceof Error ? err.message : "unknown error");
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
