import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { adminMiddleware, authMiddleware, workspaceWriteLock } from "./session-middleware";
import { nid } from "./utils";
import { parse } from "./validate";

export type RequestFieldType = "text" | "longtext" | "number" | "date" | "select";

export type RequestField = {
  id: string;
  label: string;
  type: RequestFieldType;
  required: boolean;
  /** only for "select" */
  options?: string[];
  /** only for "date": use this date as the card's due date */
  asDue?: boolean;
};

export type RequestForm = {
  id: string;
  title: string;
  description: string;
  boardId: string;
  boardTitle: string;
  listId: string;
  fields: RequestField[];
  defaultPriority: "high" | "med" | "low";
  assigneePersonIds: string[];
  enabled: boolean;
};

export type MyRequest = {
  id: string;
  formTitle: string;
  boardId: string;
  cardId: string;
  cardTitle: string | null;
  /** name of the column the card is in now */
  status: string | null;
  done: boolean;
  createdAt: string;
};

const id100 = z.string().min(1).max(100);

const fieldSchema = z.object({
  id: id100,
  label: z.string().trim().min(1).max(100),
  type: z.enum(["text", "longtext", "number", "date", "select"]),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  asDue: z.boolean().optional(),
});

const formSchema = z.object({
  id: z.string().max(100).optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
  boardId: id100,
  listId: id100,
  fields: z.array(fieldSchema).min(1).max(20),
  defaultPriority: z.enum(["high", "med", "low"]),
  assigneePersonIds: z.array(id100).max(20),
  enabled: z.boolean(),
});

type FormRow = {
  id: string;
  title: string;
  description: string;
  board_id: string;
  list_id: string;
  fields: RequestField[];
  default_priority: "high" | "med" | "low";
  assignee_person_ids: string[];
  enabled: boolean;
};

async function loadForms(onlyEnabled: boolean): Promise<RequestForm[]> {
  const sql = await getSql();
  const rows = await sql<FormRow>`
    select id, title, description, board_id, list_id, fields, default_priority, assignee_person_ids, enabled
    from app_request_forms
    where (${!onlyEnabled} or enabled)
    order by created_at
  `;
  const { readWorkspaceRaw } = await import("./server/workspace-raw.server");
  const ws = await readWorkspaceRaw();
  const out: RequestForm[] = [];
  for (const r of rows) {
    const board = ws?.boards.find((b) => b.id === r.board_id);
    if (!board && onlyEnabled) continue; // the board is gone, so nothing could be created
    out.push({
      id: r.id,
      title: r.title,
      description: r.description,
      boardId: r.board_id,
      boardTitle: board?.title ?? "—",
      listId: r.list_id,
      fields: Array.isArray(r.fields) ? r.fields : [],
      defaultPriority: r.default_priority,
      assigneePersonIds: Array.isArray(r.assignee_person_ids) ? r.assignee_person_ids : [],
      enabled: r.enabled,
    });
  }
  return out;
}

/** Forms anyone may fill in. */
export const listRequestForms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<RequestForm[]> => loadForms(true));

/** All forms, including switched-off ones (admin screen). */
export const listRequestFormsAdmin = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<RequestForm[]> => loadForms(false));

export const saveRequestForm = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(formSchema))
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const { readWorkspaceRaw } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const board = ws?.boards.find((b) => b.id === data.boardId);
    if (!ws || !board) return { ok: false, error: "تخته پیدا نشد." };
    if (!(board.lists ?? []).some((l) => l.id === data.listId)) return { ok: false, error: "ستون مقصد پیدا نشد." };
    const peopleIds = new Set(ws.people.map((p) => p.id));
    if (data.assigneePersonIds.some((id) => !peopleIds.has(id))) return { ok: false, error: "یکی از افراد پیدا نشد." };
    for (const f of data.fields) {
      if (f.type === "select" && (!f.options || f.options.length < 2)) return { ok: false, error: `برای «${f.label}» حداقل دو گزینه بنویسید.` };
    }
    if (data.fields.filter((f) => f.asDue).length > 1) return { ok: false, error: "فقط یک فیلد تاریخ می‌تواند مهلت کارت باشد." };

    const sql = await getSql();
    const fields = JSON.stringify(data.fields);
    const assignees = JSON.stringify(data.assigneePersonIds);
    const { audit } = await import("./server/audit.server");
    if (data.id) {
      const rows = await sql<{ id: string }>`
        update app_request_forms
        set title = ${data.title}, description = ${data.description}, board_id = ${data.boardId}, list_id = ${data.listId},
            fields = ${fields}::jsonb, default_priority = ${data.defaultPriority},
            assignee_person_ids = ${assignees}::jsonb, enabled = ${data.enabled}
        where id = ${data.id} returning id
      `;
      if (rows.length === 0) return { ok: false, error: "فرم پیدا نشد." };
      await audit({ actor: context.user.username, actorName: context.user.displayName, category: "system", action: "form.update", boardId: data.boardId, summary: `فرم درخواست «${data.title}» را ویرایش کرد` });
      return { ok: true, id: data.id };
    }
    const id = nid();
    await sql`
      insert into app_request_forms (id, title, description, board_id, list_id, fields, default_priority, assignee_person_ids, enabled, created_by)
      values (${id}, ${data.title}, ${data.description}, ${data.boardId}, ${data.listId}, ${fields}::jsonb, ${data.defaultPriority}, ${assignees}::jsonb, ${data.enabled}, ${context.user.username})
    `;
    await audit({ actor: context.user.username, actorName: context.user.displayName, category: "system", action: "form.create", boardId: data.boardId, summary: `فرم درخواست «${data.title}» را ساخت` });
    return { ok: true, id };
  });

export const deleteRequestForm = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ title: string }>`delete from app_request_forms where id = ${data.id} returning title`;
    if (!rows[0]) return { ok: false };
    const { audit } = await import("./server/audit.server");
    await audit({ actor: context.user.username, actorName: context.user.displayName, category: "system", action: "form.delete", summary: `فرم درخواست «${rows[0].title}» را حذف کرد` });
    return { ok: true };
  });

const MAX_PER_HOUR = 30;

/** Fills in a form: checks the answers, creates the card, tells the people who handle it. */
export const submitRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware, workspaceWriteLock])
  .validator(parse(z.object({ formId: id100, values: z.record(z.string().max(100), z.string().max(2000)) })))
  .handler(async ({ data, context }): Promise<{ ok: true; cardTitle: string } | { ok: false; error: string }> => {
    const sql = await getSql();
    const rows = await sql<FormRow>`
      select id, title, description, board_id, list_id, fields, default_priority, assignee_person_ids, enabled
      from app_request_forms where id = ${data.formId}
    `;
    const form = rows[0];
    if (!form || !form.enabled) return { ok: false, error: "این فرم دیگر فعال نیست." };

    const recent = await sql<{ n: number }>`
      select count(*)::int as n from app_request_submissions
      where submitted_by = ${context.user.username} and created_at > now() - interval '1 hour'
    `;
    if ((recent[0]?.n ?? 0) >= MAX_PER_HOUR) return { ok: false, error: "تعداد درخواست‌های این ساعت زیاد شد؛ کمی بعد دوباره تلاش کنید." };

    // check every answer against its field
    const lines: string[] = [];
    let firstText = "";
    let dueDate: string | null = null;
    for (const f of Array.isArray(form.fields) ? form.fields : []) {
      const v = (data.values[f.id] ?? "").trim();
      if (!v) {
        if (f.required) return { ok: false, error: `«${f.label}» را پر کنید.` };
        continue;
      }
      if (f.type === "number" && !Number.isFinite(Number(v))) return { ok: false, error: `«${f.label}» باید عدد باشد.` };
      if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: `تاریخ «${f.label}» درست نیست.` };
      if (f.type === "select" && !(f.options ?? []).includes(v)) return { ok: false, error: `گزینه‌ی «${f.label}» معتبر نیست.` };
      if (f.type === "text" && v.length > 200) return { ok: false, error: `«${f.label}» خیلی طولانی است.` };
      if (f.type === "text" && !firstText) firstText = v;
      if (f.type === "date" && f.asDue) dueDate = v;
      lines.push(`${f.label}: ${v}`);
    }

    const { readWorkspaceRaw, writeWorkspaceRaw } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const board = ws?.boards.find((b) => b.id === form.board_id);
    const list = board?.lists?.find((l) => l.id === form.list_id);
    if (!ws || !board || !list) return { ok: false, error: "تخته یا ستونِ مقصد این فرم دیگر وجود ندارد." };

    const cardTitle = (firstText ? `${form.title}: ${firstText.slice(0, 80)}` : form.title).slice(0, 200);
    const memberIds = (Array.isArray(form.assignee_person_ids) ? form.assignee_person_ids : []).filter((id) => ws.people.some((p) => p.id === id));
    const last = list.cards[list.cards.length - 1];
    const id = nid();
    const card = {
      id,
      listId: list.id,
      boardId: board.id,
      title: cardTitle,
      notes: `${lines.join("\n")}\n\nثبت‌کننده: ${context.user.displayName}`.slice(0, 20_000),
      priority: form.default_priority,
      dueDate,
      startDate: null,
      coverColor: null,
      position: (last?.position ?? 0) + 1000,
      archived: false,
      followerId: null,
      memberIds,
      labelIds: [],
      progress: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      checklists: [],
      comments: [],
      activities: [{ id: nid(), at: new Date().toISOString(), by: context.user.displayName, text: `کارت از فرم «${form.title}» ثبت شد` }],
      dependsOnIds: [],
      enteredListAt: new Date().toISOString(),
    };
    list.cards.push(card);

    const { runAutomations } = await import("./server/automation.server");
    await runAutomations(ws, {
      type: "card_created",
      boardId: board.id,
      cardId: id,
      listId: list.id,
      actor: { username: context.user.username, displayName: context.user.displayName },
    });
    await writeWorkspaceRaw(ws);
    await sql`
      insert into app_request_submissions (id, form_id, form_title, submitted_by, board_id, card_id)
      values (${nid()}, ${form.id}, ${form.title}, ${context.user.username}, ${board.id}, ${id})
    `;

    const { audit } = await import("./server/audit.server");
    await audit({
      actor: context.user.username,
      actorName: context.user.displayName,
      category: "card",
      action: "card.create",
      boardId: board.id,
      boardTitle: board.title,
      cardId: id,
      cardTitle,
      summary: `درخواست جدید از فرم «${form.title}»`,
    });
    const { notifyUser } = await import("./server/notify.server");
    const handlers = new Set(ws.people.filter((p) => memberIds.includes(p.id) && p.username).map((p) => p.username!.toLowerCase()));
    for (const username of handlers) {
      if (username === context.user.username) continue;
      await notifyUser({ username, kind: "request", title: `درخواست جدید: ${cardTitle}`, body: `از ${context.user.displayName}`, href: `/b/${board.id}` });
    }
    return { ok: true, cardTitle };
  });

/** The requests I submitted, with where each card stands now. */
export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MyRequest[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; form_title: string; board_id: string; card_id: string; created_at: string }>`
      select id, form_title, board_id, card_id, created_at from app_request_submissions
      where submitted_by = ${context.user.username} order by created_at desc limit 100
    `;
    const { readWorkspaceRaw, findCard } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    return rows.map((r) => {
      const hit = ws ? findCard(ws, r.card_id) : null;
      const lists = hit?.board.lists ?? [];
      return {
        id: r.id,
        formTitle: r.form_title,
        boardId: r.board_id,
        cardId: r.card_id,
        cardTitle: hit?.card.title ?? null,
        status: hit?.list.title ?? null,
        done: Boolean(hit && lists.length > 0 && lists[lists.length - 1]!.id === hit.list.id),
        createdAt: r.created_at,
      };
    });
  });
