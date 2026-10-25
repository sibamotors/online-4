import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteAutomationRule,
  listAutomationRules,
  saveAutomationRule,
  setAutomationEnabled,
  type AutoAction,
  type AutoTrigger,
  type AutomationRule,
} from "@/lib/automation";
import { useTranslation } from "@/lib/i18n";
import { getBoard, listBoards } from "@/lib/local-db";
import { listLocalUsers } from "@/lib/local-users";
import type { Board } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

const selectCls = "h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm";

type Draft = { id?: string; name: string; enabled: boolean; trigger: AutoTrigger; actions: AutoAction[] };

export function AutomationPanel() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const qc = useQueryClient();
  const [boardId, setBoardId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const boardsQ = useQuery({ queryKey: ["boards"], queryFn: () => listBoards() });
  useEffect(() => {
    if (!boardId && boardsQ.data?.[0]) setBoardId(boardsQ.data[0].id);
  }, [boardId, boardsQ.data]);

  const boardQ = useQuery({
    queryKey: ["automation-board", boardId],
    queryFn: () => getBoard({ data: { boardId } }),
    enabled: Boolean(boardId),
  });
  const rulesQ = useQuery({
    queryKey: ["automation-rules", boardId],
    queryFn: () => listAutomationRules({ data: { boardId } }),
    enabled: Boolean(boardId),
  });
  const usersQ = useQuery({ queryKey: ["local-users"], queryFn: () => listLocalUsers() });

  const board = boardQ.data ?? null;
  const reload = () => void qc.invalidateQueries({ queryKey: ["automation-rules", boardId] });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => setAutomationEnabled({ data: v }),
    onSuccess: reload,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAutomationRule({ data: { id } }),
    onSuccess: reload,
  });

  function newDraft(): Draft {
    const first = board?.lists[0]?.id ?? "";
    return {
      name: "",
      enabled: true,
      trigger: { type: "card_moved", listId: first },
      actions: [{ type: "notify", to: "assignees", message: "" }],
    };
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border p-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="size-4 text-accent" />
          {L("قوانین خودکار", "Automation rules")}
        </p>
        <p className="mt-1 text-[12px] text-muted">
          {L(
            "«وقتی این اتفاق افتاد، این کار را انجام بده». قانون‌ها فقط روی همان تخته اجرا می‌شوند و کارهایی که یک قانون انجام می‌دهد، قانون دیگری را راه نمی‌اندازد.",
            "“When this happens, do that.” Rules only run on their own board, and what a rule does never triggers another rule.",
          )}
        </p>
        <select className={`${selectCls} mt-3`} value={boardId} onChange={(e) => setBoardId(e.target.value)}>
          {(boardsQ.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      {(rulesQ.data ?? []).map((r) => (
        <div key={r.id} className="rounded-xl border border-border p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="mt-1 text-[12px] text-muted">
                {L("وقتی", "When")} {describeTrigger(r.trigger, board, L)} {L("← انجام بده:", "→ do:")}{" "}
                {r.actions.map((a) => describeAction(a, board, usersQ.data ?? [], L)).join(L("، ", ", "))}
              </p>
              <p className="mt-1 text-[11px] text-subtle">
                {L("تعداد اجرا", "Runs")}: {r.runCount}
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-[12px]">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => toggleMut.mutate({ id: r.id, enabled: e.target.checked })}
              />
              {L("فعال", "On")}
            </label>
            <Button
              size="sm"
              variant="ghost"
              aria-label={L("ویرایش", "Edit")}
              onClick={() => setDraft({ id: r.id, name: r.name, enabled: r.enabled, trigger: r.trigger, actions: r.actions })}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              aria-label={L("حذف", "Delete")}
              onClick={() => {
                if (window.confirm(L(`قانون «${r.name}» حذف شود؟`, `Delete the rule “${r.name}”?`))) deleteMut.mutate(r.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      {rulesQ.data?.length === 0 && (
        <p className="py-4 text-center text-[13px] text-muted">{L("هنوز قانونی برای این تخته نیست.", "No rules for this board yet.")}</p>
      )}

      <Button disabled={!board} onClick={() => setDraft(newDraft())}>
        <Plus className="size-4" />
        {L("قانون جدید", "New rule")}
      </Button>

      {draft && board && (
        <RuleEditor
          key={draft.id ?? "new"}
          boardId={boardId}
          board={board}
          draft={draft}
          users={(usersQ.data ?? []).map((u) => ({ username: u.username, name: u.displayName }))}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

type Lx = (fa: string, en: string) => string;

function describeTrigger(t: AutoTrigger, board: Board | null, L: Lx): string {
  const listName = (id?: string) => board?.lists.find((l) => l.id === id)?.title ?? "؟";
  if (t.type === "card_moved") return L(`کارتی به ستون «${listName(t.listId)}» رفت`, `a card moves to “${listName(t.listId)}”`);
  if (t.type === "card_created") {
    return t.listId
      ? L(`کارتی در ستون «${listName(t.listId)}» ساخته شد`, `a card is created in “${listName(t.listId)}”`)
      : L("کارتی ساخته شد", "a card is created");
  }
  return L("کارتی از مهلتش گذشت", "a card becomes overdue");
}

const PRIORITY_FA = { high: "بالا", med: "متوسط", low: "پایین" } as const;

function describeAction(a: AutoAction, board: Board | null, users: { username: string; displayName: string }[], L: Lx): string {
  if (a.type === "notify") {
    const who =
      a.to === "assignees"
        ? L("اعضا و مسئول کارت", "the card's members")
        : a.to === "follower"
          ? L("مسئول کارت", "the card's owner")
          : (users.find((u) => u.username === a.username)?.displayName ?? a.username ?? "؟");
    return L(`اعلان به ${who}`, `notify ${who}`);
  }
  if (a.type === "assign") {
    const p = board?.people.find((x) => x.id === a.personId);
    return L(`اختصاص به ${p ? `${p.firstName} ${p.lastName}` : "؟"}`, `assign ${p ? `${p.firstName} ${p.lastName}` : "?"}`);
  }
  if (a.type === "set_priority") return L(`اولویت ${PRIORITY_FA[a.priority]}`, `priority ${a.priority}`);
  if (a.type === "add_label") {
    return L(`برچسب «${board?.labels.find((l) => l.id === a.labelId)?.name ?? "؟"}»`, `label “${board?.labels.find((l) => l.id === a.labelId)?.name ?? "?"}”`);
  }
  if (a.type === "set_progress") return L(`پیشرفت ${a.progress}٪`, `progress ${a.progress}%`);
  const list = board?.lists.find((l) => l.id === a.listId)?.title ?? "؟";
  return L(`انتقال به «${list}»`, `move to “${list}”`);
}

function RuleEditor(props: {
  boardId: string;
  board: Board;
  draft: Draft;
  users: { username: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useTranslation();
  const L: Lx = (fa, en) => (lang === "en" ? en : fa);
  const { board } = props;
  const [d, setD] = useState<Draft>(props.draft);

  const saveMut = useMutation({
    mutationFn: () => saveAutomationRule({ data: { ...d, boardId: props.boardId } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(L("ذخیره شد.", "Saved."));
        props.onSaved();
      } else {
        toast.error(r.error);
      }
    },
    onError: () => toast.error(L("ذخیره نشد؛ ورودی‌ها را بررسی کنید.", "Could not save; check the fields.")),
  });

  const setAction = (i: number, a: AutoAction) => setD({ ...d, actions: d.actions.map((x, j) => (j === i ? a : x)) });
  const firstList = board.lists[0]?.id ?? "";

  function blankAction(type: AutoAction["type"]): AutoAction {
    switch (type) {
      case "notify":
        return { type, to: "assignees", message: "" };
      case "assign":
        return { type, personId: board.people[0]?.id ?? "" };
      case "set_priority":
        return { type, priority: "high" };
      case "add_label":
        return { type, labelId: board.labels[0]?.id ?? "" };
      case "set_progress":
        return { type, progress: 100 };
      default:
        return { type: "move_to_list", listId: firstList };
    }
  }

  const triggerType = d.trigger.type;
  return (
    <Dialog open onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle>{d.id ? L("ویرایش قانون", "Edit rule") : L("قانون جدید", "New rule")}</DialogTitle>

        <div className="mt-3 space-y-3">
          <label className="block text-[12px] text-muted">
            {L("نام قانون", "Rule name")}
            <Input className="mt-1" value={d.name} maxLength={100} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </label>

          <div>
            <p className="text-[12px] font-semibold">{L("وقتی…", "When…")}</p>
            <select
              className={`${selectCls} mt-1`}
              value={triggerType}
              onChange={(e) => {
                const t = e.target.value;
                setD({
                  ...d,
                  trigger:
                    t === "card_moved" ? { type: "card_moved", listId: firstList } : t === "card_created" ? { type: "card_created" } : { type: "overdue" },
                });
              }}
            >
              <option value="card_moved">{L("کارتی به ستونی منتقل شد", "a card moves to a column")}</option>
              <option value="card_created">{L("کارتی ساخته شد", "a card is created")}</option>
              <option value="overdue">{L("کارتی از مهلتش گذشت", "a card becomes overdue")}</option>
            </select>
            {d.trigger.type === "card_moved" && (
              <select
                className={`${selectCls} mt-2`}
                value={d.trigger.listId}
                onChange={(e) => setD({ ...d, trigger: { type: "card_moved", listId: e.target.value } })}
              >
                {board.lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            )}
            {d.trigger.type === "card_created" && (
              <select
                className={`${selectCls} mt-2`}
                value={d.trigger.listId ?? ""}
                onChange={(e) => setD({ ...d, trigger: { type: "card_created", listId: e.target.value || undefined } })}
              >
                <option value="">{L("در هر ستونی", "in any column")}</option>
                {board.lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            )}
            {triggerType === "overdue" && (
              <p className="mt-1 text-[11px] text-subtle">
                {L(
                  "برای کارت‌های غیر از آخرین ستون (تمام‌شده) و فقط یک بار برای هر مهلت.",
                  "For cards outside the last (finished) column, once per due date.",
                )}
              </p>
            )}
          </div>

          <div>
            <p className="text-[12px] font-semibold">{L("آنگاه…", "Then…")}</p>
            <div className="mt-1 space-y-2">
              {d.actions.map((a, i) => (
                <div key={i} className="rounded-lg border border-border p-2">
                  <div className="flex gap-2">
                    <select
                      className={selectCls}
                      value={a.type}
                      onChange={(e) => setAction(i, blankAction(e.target.value as AutoAction["type"]))}
                    >
                      <option value="notify">{L("ارسال اعلان", "Send a notification")}</option>
                      <option value="assign">{L("اختصاص به یک نفر", "Assign a person")}</option>
                      <option value="set_priority">{L("تغییر اولویت", "Set priority")}</option>
                      <option value="add_label">{L("افزودن برچسب", "Add a label")}</option>
                      <option value="set_progress">{L("تنظیم پیشرفت", "Set progress")}</option>
                      <option value="move_to_list">{L("انتقال به ستون", "Move to a column")}</option>
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={L("حذف این مرحله", "Remove this step")}
                      disabled={d.actions.length === 1}
                      onClick={() => setD({ ...d, actions: d.actions.filter((_, j) => j !== i) })}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  {a.type === "notify" && (
                    <div className="mt-2 space-y-2">
                      <select
                        className={selectCls}
                        value={a.to === "user" ? `user:${a.username ?? ""}` : a.to}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.startsWith("user:")) setAction(i, { ...a, to: "user", username: v.slice(5) });
                          else setAction(i, { type: "notify", to: v as "assignees" | "follower", message: a.message });
                        }}
                      >
                        <option value="assignees">{L("اعضا و مسئول کارت", "The card's members")}</option>
                        <option value="follower">{L("فقط مسئول کارت", "Only the card's owner")}</option>
                        {props.users.map((u) => (
                          <option key={u.username} value={`user:${u.username}`}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={a.message ?? ""}
                        maxLength={200}
                        placeholder={L("متن اعلان (اختیاری؛ {card} نام کارت و {list} نام ستون)", "Message (optional; {card} = card name, {list} = column)")}
                        onChange={(e) => setAction(i, { ...a, message: e.target.value })}
                      />
                    </div>
                  )}
                  {a.type === "assign" && (
                    <select className={`${selectCls} mt-2`} value={a.personId} onChange={(e) => setAction(i, { type: "assign", personId: e.target.value })}>
                      {board.people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  )}
                  {a.type === "set_priority" && (
                    <select
                      className={`${selectCls} mt-2`}
                      value={a.priority}
                      onChange={(e) => setAction(i, { type: "set_priority", priority: e.target.value as "high" | "med" | "low" })}
                    >
                      <option value="high">{L("بالا", "High")}</option>
                      <option value="med">{L("متوسط", "Medium")}</option>
                      <option value="low">{L("پایین", "Low")}</option>
                    </select>
                  )}
                  {a.type === "add_label" && (
                    <select className={`${selectCls} mt-2`} value={a.labelId} onChange={(e) => setAction(i, { type: "add_label", labelId: e.target.value })}>
                      {board.labels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {a.type === "set_progress" && (
                    <label className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="w-24"
                        value={a.progress}
                        onChange={(e) => setAction(i, { type: "set_progress", progress: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) })}
                      />
                      %
                    </label>
                  )}
                  {a.type === "move_to_list" && (
                    <select className={`${selectCls} mt-2`} value={a.listId} onChange={(e) => setAction(i, { type: "move_to_list", listId: e.target.value })}>
                      {board.lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
            {d.actions.length < 8 && (
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => setD({ ...d, actions: [...d.actions, blankAction("notify")] })}>
                <Plus className="size-4" />
                {L("مرحله‌ی دیگر", "Another step")}
              </Button>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" disabled={saveMut.isPending || !d.name.trim()} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? L("در حال ذخیره…", "Saving…") : L("ذخیره", "Save")}
            </Button>
            <Button variant="secondary" onClick={props.onClose}>
              {L("انصراف", "Cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { AutomationRule };
