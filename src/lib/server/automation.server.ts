import { getSql } from "../db";
import type { AutoAction, AutoTrigger } from "../automation";
import type { Board, Card, List, Person } from "../types";
import { nid } from "../utils";
import { audit } from "./audit.server";
import { notifyUser } from "./notify.server";

type Ws = { people: Person[]; boards: Board[] };

export type AutoEvent = {
  type: AutoTrigger["type"];
  boardId: string;
  cardId: string;
  /** the column the card is in now (moved / created) */
  listId?: string;
  /** who caused it; null for the scheduler */
  actor: { username: string; displayName: string } | null;
};

type RuleRow = { id: string; name: string; trigger: AutoTrigger; actions: AutoAction[] };

const MAX_ACTIVITIES = 300;

/** Checks that every list / label / person a rule points at really exists on that board. */
export async function checkRuleReferences(
  boardId: string,
  trigger: AutoTrigger,
  actions: AutoAction[],
): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ data: unknown }>`select data from workspace_state where id = 'main'`;
  const raw = rows[0]?.data;
  const ws = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<Ws> | null;
  const board = ws?.boards?.find((b) => b.id === boardId);
  if (!board) return "تخته پیدا نشد.";
  const listIds = new Set((board.lists ?? []).map((l) => l.id));
  const labelIds = new Set((board.labels ?? []).map((l) => l.id));
  const peopleIds = new Set((ws?.people ?? []).map((p) => p.id));
  if ((trigger.type === "card_moved" || trigger.type === "card_created") && trigger.listId && !listIds.has(trigger.listId)) {
    return "ستونِ شرط پیدا نشد.";
  }
  for (const a of actions) {
    if (a.type === "move_to_list" && !listIds.has(a.listId)) return "ستونِ مقصد پیدا نشد.";
    if (a.type === "add_label" && !labelIds.has(a.labelId)) return "برچسب پیدا نشد.";
    if (a.type === "assign" && !peopleIds.has(a.personId)) return "فرد پیدا نشد.";
    if (a.type === "notify" && a.to === "user") {
      if (!a.username) return "کاربرِ گیرنده را انتخاب کنید.";
      const u = await sql<{ username: string }>`select username from login_users where username = ${a.username}`;
      if (u.length === 0) return "کاربرِ گیرنده پیدا نشد.";
    }
  }
  return null;
}

function matches(t: AutoTrigger, ev: AutoEvent): boolean {
  if (t.type !== ev.type) return false;
  if (t.type === "card_moved") return t.listId === ev.listId;
  if (t.type === "card_created") return !t.listId || t.listId === ev.listId;
  return true;
}

function locate(board: Board, cardId: string): { list: List; card: Card } | null {
  for (const list of board.lists ?? []) {
    const card = (list.cards ?? []).find((c) => c.id === cardId);
    if (card) return { list, card };
  }
  return null;
}

const DEFAULT_TITLE: Record<AutoTrigger["type"], string> = {
  card_moved: "کارت «{card}» به ستون «{list}» رفت",
  card_created: "کارت «{card}» ساخته شد",
  overdue: "کارت «{card}» از مهلتش گذشته است",
};

/**
 * Runs the enabled rules of a board that match `ev`. Changes the workspace IN MEMORY (the caller saves it
 * afterwards, inside the workspace lock) and sends the notifications. Actions done by a rule never trigger
 * other rules, so rules cannot loop. Never throws. Returns true when the workspace was changed.
 */
export async function runAutomations(ws: Ws, ev: AutoEvent): Promise<boolean> {
  try {
    const sql = await getSql();
    const all = await sql<RuleRow>`
      select id, name, trigger, actions from app_automation_rules where board_id = ${ev.boardId} and enabled
    `;
    const rules = all.filter((r) => r.trigger && matches(r.trigger, ev) && Array.isArray(r.actions));
    if (rules.length === 0) return false;
    const board = ws.boards.find((b) => b.id === ev.boardId);
    if (!board) return false;
    let at = locate(board, ev.cardId);
    if (!at) return false;
    let changed = false;

    for (const rule of rules) {
      const done: string[] = [];
      const outbox: { username: string; title: string }[] = [];
      for (const a of rule.actions) {
        const card = at.card;
        if (a.type === "assign") {
          const p = ws.people.find((x) => x.id === a.personId);
          if (p && !card.memberIds.includes(p.id)) {
            card.memberIds.push(p.id);
            done.push(`«${p.firstName} ${p.lastName}» اختصاص داده شد`);
          }
        } else if (a.type === "set_priority") {
          if (card.priority !== a.priority) {
            card.priority = a.priority;
            done.push(`اولویت ${a.priority === "high" ? "بالا" : a.priority === "med" ? "متوسط" : "پایین"} شد`);
          }
        } else if (a.type === "add_label") {
          const lb = (board.labels ?? []).find((x) => x.id === a.labelId);
          if (lb && !card.labelIds.includes(lb.id)) {
            card.labelIds.push(lb.id);
            done.push(`برچسب «${lb.name}» اضافه شد`);
          }
        } else if (a.type === "set_progress") {
          if (card.progress !== a.progress) {
            card.progress = a.progress;
            done.push(`پیشرفت ${a.progress}٪ شد`);
          }
        } else if (a.type === "move_to_list") {
          const dest = (board.lists ?? []).find((l) => l.id === a.listId);
          if (dest && dest.id !== at.list.id) {
            at.list.cards = at.list.cards.filter((c) => c.id !== card.id);
            card.listId = dest.id;
            card.enteredListAt = new Date().toISOString();
            dest.cards.push(card);
            at = { list: dest, card };
            done.push(`به ستون «${dest.title}» منتقل شد`);
          }
        } else if (a.type === "notify") {
          const people = new Map(ws.people.map((p) => [p.id, p]));
          let names: string[] = [];
          if (a.to === "user" && a.username) names = [a.username];
          else if (a.to === "follower") names = card.followerId ? [people.get(card.followerId)?.username ?? ""] : [];
          else names = [...card.memberIds, ...(card.followerId ? [card.followerId] : [])].map((id) => people.get(id)?.username ?? "");
          const template = a.message?.trim() || DEFAULT_TITLE[ev.type];
          const title = template
            .replaceAll("{card}", card.title)
            .replaceAll("{board}", board.title)
            .replaceAll("{list}", at.list.title);
          const unique = [...new Set(names.map((n) => n.toLowerCase()).filter(Boolean))];
          for (const username of unique) {
            if (ev.actor && username === ev.actor.username) continue; // no need to tell people about their own action
            outbox.push({ username, title });
          }
          if (unique.length > 0) done.push("اعلان ارسال شد");
        }
      }

      if (done.length === 0) continue;
      const card = at.card;
      if (!Array.isArray(card.activities)) card.activities = [];
      card.activities.unshift({
        id: nid(),
        at: new Date().toISOString(),
        by: "اتوماسیون",
        text: `قانون «${rule.name}»: ${done.join("، ")}`,
      });
      if (card.activities.length > MAX_ACTIVITIES) card.activities.length = MAX_ACTIVITIES;
      changed = true;

      await audit({
        actor: ev.actor?.username ?? "system",
        actorName: ev.actor?.displayName ?? "اتوماسیون",
        category: "card",
        action: "automation.run",
        boardId: board.id,
        boardTitle: board.title,
        cardId: card.id,
        cardTitle: card.title,
        summary: `قانون خودکار «${rule.name}» اجرا شد: ${done.join("، ")}`,
      });
      for (const n of outbox) {
        await notifyUser({ username: n.username, kind: "automation", title: n.title, href: `/b/${board.id}` });
      }
      await sql`update app_automation_rules set run_count = run_count + 1, last_run_at = now() where id = ${rule.id}`;
    }
    return changed;
  } catch (err) {
    console.error("[automation] failed:", err instanceof Error ? err.message : "unknown error");
    return false;
  }
}
