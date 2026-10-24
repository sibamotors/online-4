import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PRIORITY_LABEL } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { isOverdue, isoToJalaaliStr } from "@/lib/jalali";
import { personName } from "@/lib/names";
import type { Board, Card } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";

type SortKey = "title" | "list" | "priority" | "due" | "progress";
type GroupBy = "none" | "list" | "assignee" | "priority";

const PRIORITY_RANK: Record<string, number> = { high: 0, med: 1, low: 2 };
const selectCls = "h-9 rounded-lg border border-border bg-surface px-2 text-sm";

type Row = { card: Card; listTitle: string; done: boolean; people: string[] };

/** All cards of a board as a sortable, groupable table (the alternative to the kanban view). */
export function TableView({ board, onOpenCard }: { board: Board; onOpenCard?: (id: string) => void }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<GroupBy>("list");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "due", dir: 1 });
  const [showDone, setShowDone] = useState(true);

  const rows = useMemo<Row[]>(() => {
    const doneId = board.lists[board.lists.length - 1]?.id;
    const out: Row[] = [];
    for (const l of board.lists) {
      for (const c of l.cards) {
        if (c.archived) continue;
        const people = [...new Set([...c.memberIds, ...(c.followerId ? [c.followerId] : [])])]
          .map((id) => board.people.find((p) => p.id === id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map((p) => personName(p));
        out.push({ card: c, listTitle: l.title, done: l.id === doneId, people });
      }
    }
    return out;
  }, [board]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (!showDone && r.done) return false;
      if (!needle) return true;
      return r.card.title.toLowerCase().includes(needle) || r.people.some((n) => n.toLowerCase().includes(needle));
    });
    const val = (r: Row): string | number => {
      switch (sort.key) {
        case "title":
          return r.card.title;
        case "list":
          return board.lists.findIndex((l) => l.id === r.card.listId);
        case "priority":
          return PRIORITY_RANK[r.card.priority] ?? 1;
        case "progress":
          return r.card.progress;
        default:
          return r.card.dueDate ? String(r.card.dueDate).slice(0, 10) : "9999-99-99"; // no date goes last
      }
    };
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fa");
      return c * sort.dir;
    });
  }, [rows, q, showDone, sort, board.lists]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of visible) {
      const keys =
        group === "list"
          ? [r.listTitle]
          : group === "priority"
            ? [PRIORITY_LABEL[r.card.priority as keyof typeof PRIORITY_LABEL] ?? r.card.priority]
            : group === "assignee"
              ? r.people.length > 0
                ? r.people
                : [L("بدون مسئول", "Unassigned")]
              : [""];
      for (const k of keys) map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()];
  }, [visible, group, lang]);

  const th = (key: SortKey, label: string, cls = "") => (
    <th className={cn("px-2 py-2 text-start font-medium", cls)}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-fg"
        onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <h1 className="me-2 text-lg font-semibold">{L("جدول", "Table")}</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute start-2 top-2.5 size-4 text-muted" />
          <Input className="h-9 w-56 ps-8" placeholder={L("جستجو در عنوان و افراد", "Search titles and people")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          {L("گروه‌بندی", "Group by")}
          <select className={selectCls} value={group} onChange={(e) => setGroup(e.target.value as GroupBy)}>
            <option value="list">{L("ستون", "Column")}</option>
            <option value="assignee">{L("مسئول", "Assignee")}</option>
            <option value="priority">{L("اولویت", "Priority")}</option>
            <option value="none">{L("بدون گروه", "None")}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[12px]">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          {L("نمایش تمام‌شده‌ها", "Show finished")}
        </label>
        <span className="ms-auto text-[12px] text-muted">
          {visible.length} {L("کارت", "cards")}
        </span>
      </div>

      <div className="k-scroll min-h-0 flex-1 overflow-auto px-4 pb-24">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{L("کارتی پیدا نشد.", "No cards found.")}</p>
        ) : (
          groups.map(([name, list]) => (
            <section key={name || "all"} className="mb-5">
              {group !== "none" && (
                <h2 className="mb-1 text-[13px] font-semibold">
                  {name} <span className="font-normal text-muted">({list.length})</span>
                </h2>
              )}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-surface-2 text-[12px] text-muted">
                    <tr>
                      {th("title", L("عنوان", "Title"), "w-[34%]")}
                      {th("list", L("ستون", "Column"))}
                      {th("priority", L("اولویت", "Priority"))}
                      <th className="px-2 py-2 text-start font-medium">{L("مسئول", "Assignee")}</th>
                      {th("due", L("مهلت", "Due"))}
                      {th("progress", L("پیشرفت", "Progress"))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => {
                      const late = isOverdue(r.card.dueDate, r.done);
                      return (
                        <tr
                          key={`${name}-${r.card.id}`}
                          className="cursor-pointer border-t border-border hover:bg-accent-soft/40"
                          onClick={() => onOpenCard?.(r.card.id)}
                        >
                          <td className={cn("px-2 py-2 font-medium", r.done && "text-muted line-through")}>{r.card.title}</td>
                          <td className="px-2 py-2 text-muted">{r.listTitle}</td>
                          <td className="px-2 py-2">{PRIORITY_LABEL[r.card.priority as keyof typeof PRIORITY_LABEL] ?? r.card.priority}</td>
                          <td className="px-2 py-2 text-[12px] text-muted">{r.people.join("، ") || "—"}</td>
                          <td className={cn("px-2 py-2 tabular-nums", late && "font-semibold text-danger")}>
                            {r.card.dueDate ? isoToJalaaliStr(r.card.dueDate) : "—"}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                                <div className="h-full rounded-full bg-accent" style={{ width: `${r.card.progress}%` }} />
                              </div>
                              <span className="text-[11px] tabular-nums text-muted">{r.card.progress}٪</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
