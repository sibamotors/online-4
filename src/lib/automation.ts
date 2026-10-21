import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { adminMiddleware } from "./session-middleware";
import { nid } from "./utils";
import { parse } from "./validate";

/** When something happens… */
export type AutoTrigger =
  | { type: "card_moved"; listId: string }
  | { type: "card_created"; listId?: string }
  | { type: "overdue" };

/** …do this. */
export type AutoAction =
  | { type: "notify"; to: "assignees" | "follower" | "user"; username?: string; message?: string }
  | { type: "assign"; personId: string }
  | { type: "set_priority"; priority: "high" | "med" | "low" }
  | { type: "add_label"; labelId: string }
  | { type: "set_progress"; progress: number }
  | { type: "move_to_list"; listId: string };

export type AutomationRule = {
  id: string;
  boardId: string;
  name: string;
  enabled: boolean;
  trigger: AutoTrigger;
  actions: AutoAction[];
  runCount: number;
  lastRunAt: string | null;
};

const id100 = z.string().min(1).max(100);

const triggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("card_moved"), listId: id100 }),
  z.object({ type: z.literal("card_created"), listId: z.string().max(100).optional() }),
  z.object({ type: z.literal("overdue") }),
]);

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("notify"),
    to: z.enum(["assignees", "follower", "user"]),
    username: z.string().trim().toLowerCase().max(64).optional(),
    message: z.string().trim().max(200).optional(),
  }),
  z.object({ type: z.literal("assign"), personId: id100 }),
  z.object({ type: z.literal("set_priority"), priority: z.enum(["high", "med", "low"]) }),
  z.object({ type: z.literal("add_label"), labelId: id100 }),
  z.object({ type: z.literal("set_progress"), progress: z.number().int().min(0).max(100) }),
  z.object({ type: z.literal("move_to_list"), listId: id100 }),
]);

const ruleSchema = z.object({
  id: z.string().max(100).optional(),
  boardId: id100,
  name: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
  trigger: triggerSchema,
  actions: z.array(actionSchema).min(1).max(8),
});

type Row = {
  id: string;
  board_id: string;
  name: string;
  enabled: boolean;
  trigger: AutoTrigger;
  actions: AutoAction[];
  run_count: number;
  last_run_at: string | null;
};

const mapRow = (r: Row): AutomationRule => ({
  id: r.id,
  boardId: r.board_id,
  name: r.name,
  enabled: r.enabled,
  trigger: r.trigger,
  actions: Array.isArray(r.actions) ? r.actions : [],
  runCount: r.run_count,
  lastRunAt: r.last_run_at,
});

async function audit(
  user: { username: string; displayName: string },
  boardId: string,
  action: string,
  summary: string,
) {
  const { audit: write } = await import("./server/audit.server");
  await write({ actor: user.username, actorName: user.displayName, category: "board", action, boardId, summary });
}

export const listAutomationRules = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ boardId: id100 })))
  .handler(async ({ data }): Promise<AutomationRule[]> => {
    const sql = await getSql();
    const rows = await sql<Row>`
      select id, board_id, name, enabled, trigger, actions, run_count, last_run_at
      from app_automation_rules where board_id = ${data.boardId} order by created_at
    `;
    return rows.map(mapRow);
  });

export const saveAutomationRule = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(ruleSchema))
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const { checkRuleReferences } = await import("./server/automation.server");
    const problem = await checkRuleReferences(data.boardId, data.trigger, data.actions);
    if (problem) return { ok: false, error: problem };
    const sql = await getSql();
    const trigger = JSON.stringify(data.trigger);
    const actions = JSON.stringify(data.actions);
    if (data.id) {
      const rows = await sql<{ id: string }>`
        update app_automation_rules
        set name = ${data.name}, enabled = ${data.enabled}, trigger = ${trigger}::jsonb, actions = ${actions}::jsonb
        where id = ${data.id} and board_id = ${data.boardId}
        returning id
      `;
      if (rows.length === 0) return { ok: false, error: "قانون پیدا نشد." };
      await audit(context.user, data.boardId, "automation.update", `قانون خودکار «${data.name}» را ویرایش کرد`);
      return { ok: true, id: data.id };
    }
    const id = nid();
    await sql`
      insert into app_automation_rules (id, board_id, name, enabled, trigger, actions, created_by)
      values (${id}, ${data.boardId}, ${data.name}, ${data.enabled}, ${trigger}::jsonb, ${actions}::jsonb, ${context.user.username})
    `;
    await audit(context.user, data.boardId, "automation.create", `قانون خودکار «${data.name}» را ساخت`);
    return { ok: true, id };
  });

export const setAutomationEnabled = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: id100, enabled: z.boolean() })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ board_id: string; name: string }>`
      update app_automation_rules set enabled = ${data.enabled} where id = ${data.id} returning board_id, name
    `;
    if (!rows[0]) return { ok: false };
    await audit(
      context.user,
      rows[0].board_id,
      "automation.toggle",
      `قانون خودکار «${rows[0].name}» را ${data.enabled ? "فعال" : "غیرفعال"} کرد`,
    );
    return { ok: true };
  });

export const deleteAutomationRule = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ board_id: string; name: string }>`
      delete from app_automation_rules where id = ${data.id} returning board_id, name
    `;
    if (!rows[0]) return { ok: false };
    await audit(context.user, rows[0].board_id, "automation.delete", `قانون خودکار «${rows[0].name}» را حذف کرد`);
    return { ok: true };
  });
