import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { authMiddleware } from "./session-middleware";
import { nid } from "./utils";
import { parse } from "./validate";

export type SearchKind = "card" | "comment" | "checklist" | "message" | "report";

export type SearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  snippet: string;
  boardId?: string;
  boardTitle?: string;
  cardId?: string;
  /** where the hit belongs: a card on a board, the messages page or the reports page */
  target: "card" | "messages" | "reports";
};

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filters: { kinds?: SearchKind[]; boardId?: string; mine?: boolean };
};

const KINDS = ["card", "comment", "checklist", "message", "report"] as const;
const filtersSchema = z.object({
  kinds: z.array(z.enum(KINDS)).max(5).optional(),
  boardId: z.string().max(100).optional(),
  mine: z.boolean().optional(),
});

/** A short piece of `text` around the first match of `needle`. */
function around(text: string, needle: string): string {
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return text.slice(0, 120);
  const start = Math.max(0, i - 40);
  return `${start > 0 ? "…" : ""}${text.slice(start, i + needle.length + 80)}${i + needle.length + 80 < text.length ? "…" : ""}`;
}

const MAX_HITS = 80;

/**
 * One search box for everything the person may see: cards (title, notes, checklists, comments),
 * their own direct and group messages, and the work reports they sent or received.
 */
export const searchAll = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ q: z.string().trim().min(2).max(100), filters: filtersSchema.optional() })))
  .handler(async ({ data, context }): Promise<SearchHit[]> => {
    const q = data.q;
    const want = new Set<SearchKind>(data.filters?.kinds?.length ? data.filters.kinds : KINDS);
    const hits: SearchHit[] = [];
    const me = context.user.username;

    if (want.has("card") || want.has("comment") || want.has("checklist")) {
      const { readWorkspaceRaw } = await import("./server/workspace-raw.server");
      const ws = await readWorkspaceRaw();
      const myPerson = ws?.people.find((p) => p.username?.toLowerCase() === me)?.id;
      const needle = q.toLowerCase();
      const has = (s: unknown) => typeof s === "string" && s.toLowerCase().includes(needle);
      for (const b of ws?.boards ?? []) {
        if (data.filters?.boardId && b.id !== data.filters.boardId) continue;
        for (const l of b.lists ?? []) {
          for (const c of l.cards ?? []) {
            if (c.archived) continue;
            if (data.filters?.mine && !(myPerson && ((c.memberIds ?? []).includes(myPerson) || c.followerId === myPerson))) continue;
            const base = { boardId: b.id, boardTitle: b.title, cardId: c.id, target: "card" as const };
            if (want.has("card") && (has(c.title) || has(c.notes))) {
              hits.push({ kind: "card", id: c.id, title: c.title, snippet: has(c.title) ? l.title : around(c.notes ?? "", q), ...base });
            }
            if (want.has("checklist")) {
              for (const ch of c.checklists ?? []) {
                const item = (ch.items ?? []).find((it) => has(it.title));
                if (item) hits.push({ kind: "checklist", id: `${c.id}:${ch.id}`, title: c.title, snippet: `${ch.title}: ${item.title}`, ...base });
              }
            }
            if (want.has("comment")) {
              const cm = (c.comments ?? []).find((x) => has(x.body));
              if (cm) hits.push({ kind: "comment", id: `${c.id}:${cm.id}`, title: c.title, snippet: `${cm.author}: ${around(cm.body, q)}`, ...base });
            }
          }
        }
      }
    }

    const sql = await getSql();
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;

    if (want.has("message") && !data.filters?.boardId && !data.filters?.mine) {
      const dm = await sql<{ id: string; from_username: string; body: string }>`
        select id, from_username, body from app_messages
        where (from_username = ${me} or to_username = ${me}) and deleted_at is null
          and body not like '\\_\\_FILEID\\_\\_:%' and body ilike ${like}
        order by created_at desc limit 15
      `;
      for (const m of dm) hits.push({ kind: "message", id: m.id, title: `پیام ${m.from_username === me ? "ارسالی" : `از ${m.from_username}`}`, snippet: around(m.body, q), target: "messages" });
      const gm = await sql<{ id: string; from_username: string; body: string; name: string }>`
        select m.id, m.from_username, m.body, g.name
        from app_group_messages m
        join app_group_members mem on mem.group_id = m.group_id and mem.username = ${me}
        join app_groups g on g.id = m.group_id
        where m.deleted_at is null and m.body not like '\\_\\_FILEID\\_\\_:%' and m.body ilike ${like}
        order by m.created_at desc limit 15
      `;
      for (const m of gm) hits.push({ kind: "message", id: m.id, title: `گروه «${m.name}»`, snippet: `${m.from_username}: ${around(m.body, q)}`, target: "messages" });
    }

    if (want.has("report") && !data.filters?.boardId && !data.filters?.mine) {
      const rep = await sql<{ id: string; subject: string; body: string; from_username: string; to_username: string }>`
        select id, subject, body, from_username, to_username from app_work_reports
        where (from_username = ${me} or to_username = ${me}) and (subject ilike ${like} or body ilike ${like})
        order by created_at desc limit 15
      `;
      for (const r of rep) hits.push({ kind: "report", id: r.id, title: r.subject || "گزارش", snippet: around(r.body || r.subject, q), target: "reports" });
    }

    // title matches first, then the rest in the order found
    const rank = (h: SearchHit) => (h.title.toLowerCase().includes(q.toLowerCase()) ? 0 : 1);
    return hits.sort((a, b) => rank(a) - rank(b)).slice(0, MAX_HITS);
  });

export const listSavedSearches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SavedSearch[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; name: string; query: string; filters: SavedSearch["filters"] }>`
      select id, name, query, filters from app_saved_searches where username = ${context.user.username} order by created_at
    `;
    return rows.map((r) => ({ id: r.id, name: r.name, query: r.query, filters: r.filters ?? {} }));
  });

export const saveSearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ name: z.string().trim().min(1).max(60), query: z.string().trim().min(2).max(100), filters: filtersSchema })))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const sql = await getSql();
    const n = await sql<{ n: number }>`select count(*)::int as n from app_saved_searches where username = ${context.user.username}`;
    if ((n[0]?.n ?? 0) >= 30) return { ok: false, error: "حداکثر ۳۰ جستجوی ذخیره‌شده مجاز است." };
    await sql`
      insert into app_saved_searches (id, username, name, query, filters)
      values (${nid()}, ${context.user.username}, ${data.name}, ${data.query}, ${JSON.stringify(data.filters)}::jsonb)
    `;
    return { ok: true };
  });

export const deleteSavedSearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ id: z.string().min(1).max(100) })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`delete from app_saved_searches where id = ${data.id} and username = ${context.user.username} returning id`;
    return { ok: rows.length > 0 };
  });
