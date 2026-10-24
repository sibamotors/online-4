import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "@/lib/i18n";
import type { Board, Card } from "@/lib/types";
import { asIsoDate, calFromIso, calMonths, isOverdue, isoToday } from "@/lib/jalali";
import { personById, personName } from "@/lib/names";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const PX = 22; // width of one day
const LABEL_W = 240;
const HEAD = 48;
const ROW = 40;

function toDate(iso: string): Date {
  const day = asIsoDate(iso);
  if (!day) return new Date(NaN);
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DatePatch = { startDate?: string; dueDate?: string };
type DragMode = "move" | "start" | "end";
type Drag = { id: string; mode: DragMode; startX: number; delta: number };

export function GanttView({
  board,
  onOpenCard,
  onChangeDates,
}: {
  board: Board;
  onOpenCard?: (id: string) => void;
  /** Called after a bar was dragged; only the dates that changed are included. */
  onChangeDates?: (cardId: string, patch: DatePatch) => void;
}) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const [showCritical, setShowCritical] = useState(true);
  const [drag, setDrag] = useState<Drag | null>(null);
  const moved = useRef(false);

  const rows = useMemo(() => {
    const cards: Card[] = board.lists.flatMap((l) => l.cards.map((c) => ({ ...c, listId: l.id })));
    const dated = cards.filter((c) => asIsoDate(c.startDate) || asIsoDate(c.dueDate));
    return dated.sort((a, b) =>
      (asIsoDate(a.startDate) || asIsoDate(a.dueDate) || "").localeCompare(
        asIsoDate(b.startDate) || asIsoDate(b.dueDate) || "",
      ),
    );
  }, [board]);

  const doneId = board.lists[board.lists.length - 1]?.id;

  const range = useMemo(() => {
    if (rows.length === 0) return null;
    const dates: string[] = [];
    for (const c of rows) {
      const s = asIsoDate(c.startDate);
      const d = asIsoDate(c.dueDate);
      if (s) dates.push(s);
      if (d) dates.push(d);
    }
    dates.push(isoToday());
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    const start = toDate(min);
    start.setDate(start.getDate() - 2);
    const end = toDate(max);
    end.setDate(end.getDate() + 3);
    const days = Math.min(Math.max(Math.round((end.getTime() - start.getTime()) / DAY), 1), 400);
    if (!Number.isFinite(days)) return null;
    return { start, days };
  }, [rows]);

  /** Position of every bar in days from the start of the chart (before any drag). */
  const geo = useMemo(() => {
    if (!range) return [];
    return rows.map((c) => {
      const sIso = asIsoDate(c.startDate) || asIsoDate(c.dueDate) || asIsoDate(c.createdAt) || isoToday();
      const eIso = asIsoDate(c.dueDate) || asIsoDate(c.startDate) || sIso;
      const x1 = Math.round((toDate(sIso).getTime() - range.start.getTime()) / DAY);
      const x2 = Math.max(Math.round((toDate(eIso).getTime() - range.start.getTime()) / DAY), x1);
      return { x1, x2 };
    });
  }, [rows, range]);

  /** "Card B comes after card A": arrows from A's end to B's start. */
  const edges = useMemo(() => {
    const index = new Map(rows.map((c, i) => [c.id, i]));
    const out: { from: number; to: number }[] = [];
    rows.forEach((c, to) => {
      for (const pid of c.dependsOnIds ?? []) {
        const from = index.get(pid);
        if (from !== undefined && from !== to) out.push({ from, to });
      }
    });
    return out;
  }, [rows]);

  /** Critical path = the longest chain of unfinished, dependent cards (by total days). */
  const critical = useMemo(() => {
    const nodes = new Set<number>();
    const links = new Set<string>();
    if (edges.length === 0) return { nodes, links };
    const preds: number[][] = rows.map(() => []);
    for (const e of edges) preds[e.to]!.push(e.from);
    const done = rows.map((c) => c.listId === doneId);
    const memo = new Map<number, { len: number; prev: number | null }>();
    const visiting = new Set<number>();
    const best = (i: number): { len: number; prev: number | null } => {
      const hit = memo.get(i);
      if (hit) return hit;
      const dur = (geo[i]?.x2 ?? 0) - (geo[i]?.x1 ?? 0) + 1;
      if (visiting.has(i)) return { len: dur, prev: null }; // cycle guard
      visiting.add(i);
      let bestLen = 0;
      let bestPrev: number | null = null;
      for (const p of preds[i]!) {
        if (done[p!]) continue;
        const r = best(p!);
        if (r.len > bestLen) {
          bestLen = r.len;
          bestPrev = p!;
        }
      }
      visiting.delete(i);
      const res = { len: dur + bestLen, prev: bestPrev };
      memo.set(i, res);
      return res;
    };
    let end = -1;
    let endLen = 0;
    rows.forEach((_, i) => {
      if (done[i]) return;
      const r = best(i);
      if (r.len > endLen) {
        endLen = r.len;
        end = i;
      }
    });
    const chain: number[] = [];
    let cur: number | null = end >= 0 ? end : null;
    while (cur !== null && chain.length <= rows.length) {
      chain.push(cur);
      cur = memo.get(cur)?.prev ?? null;
    }
    if (chain.length >= 2) {
      chain.forEach((i) => nodes.add(i));
      for (let k = 0; k < chain.length - 1; k += 1) links.add(`${chain[k + 1]}>${chain[k]}`);
    }
    return { nodes, links };
  }, [edges, rows, geo, doneId]);

  if (!range || rows.length === 0) {
    return (
      <div className="grid h-[50vh] place-items-center px-6 text-center">
        <div className="max-w-sm space-y-1">
          <h1 className="text-lg font-semibold text-fg">{L("گانت چارت", "Gantt chart")}</h1>
          <p className="text-sm text-muted">
            {L(
              "کاری با تاریخ شروع یا مهلت ثبت نشده. از جزئیات کارت تاریخ شمسی بگذارید.",
              "No card has a start date or due date yet. Set one in the card details.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const chartW = range.days * PX;
  const today = toDate(isoToday());
  const todayOff = Math.round((today.getTime() - range.start.getTime()) / DAY);

  /** Where bar `i` is drawn right now (follows the pointer while it is being dragged). */
  function span(i: number): { x1: number; x2: number } {
    const g = geo[i]!;
    const c = rows[i]!;
    if (!drag || drag.id !== c.id) return g;
    if (drag.mode === "move") return { x1: g.x1 + drag.delta, x2: g.x2 + drag.delta };
    if (drag.mode === "start") return { x1: Math.min(g.x1 + drag.delta, g.x2), x2: g.x2 };
    return { x1: g.x1, x2: Math.max(g.x2 + drag.delta, g.x1) };
  }

  const dayIso = (x: number) => {
    const d = new Date(range.start);
    d.setDate(d.getDate() + x);
    return fmt(d);
  };

  function down(e: ReactPointerEvent<HTMLElement>, c: Card, mode: DragMode) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = false;
    setDrag({ id: c.id, mode, startX: e.clientX, delta: 0 });
  }
  function move(e: ReactPointerEvent<HTMLElement>) {
    if (!drag) return;
    const delta = Math.round((e.clientX - drag.startX) / PX);
    if (Math.abs(e.clientX - drag.startX) > 3) moved.current = true;
    if (delta !== drag.delta) setDrag({ ...drag, delta });
  }
  function up(e: ReactPointerEvent<HTMLElement>, i: number) {
    if (!drag) return;
    const c = rows[i]!;
    const final = span(i);
    const mode = drag.mode;
    const changed = drag.delta !== 0;
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!changed) {
      if (!moved.current) onOpenCard?.(c.id);
      return;
    }
    const patch: DatePatch = {};
    if (asIsoDate(c.startDate) || mode === "start") patch.startDate = dayIso(final.x1);
    if (asIsoDate(c.dueDate) || mode === "end") patch.dueDate = dayIso(final.x2);
    onChangeDates?.(c.id, patch);
  }

  const months: { x: number; label: string }[] = [];
  const ticks: { x: number; label: string }[] = [];
  let lastLabelX = -999;
  for (let i = 0; i <= range.days; i++) {
    const d = new Date(range.start);
    d.setDate(d.getDate() + i);
    const j = calFromIso(fmt(d));
    if (!j) continue;
    const isMonthStart = j[2] === 1;
    if (isMonthStart || i === 0) {
      if (!(i - lastLabelX < 4 && !isMonthStart)) {
        months.push({ x: i, label: `${calMonths()[j[1] - 1]} ${j[0]}` });
        lastLabelX = i;
      }
    }
    if (j[2] === 1 || j[2] === 8 || j[2] === 15 || j[2] === 22) {
      ticks.push({ x: i, label: String(j[2]) });
    }
  }

  const violated = new Set<number>();
  const arrows = edges.map((e) => {
    const a = span(e.from);
    const b = span(e.to);
    const fx = (a.x2 + 1) * PX - 2;
    const tx = b.x1 * PX + 2;
    const fy = e.from * ROW + ROW / 2;
    const ty = e.to * ROW + ROW / 2;
    const bad = b.x1 <= a.x2; // starts before the card it depends on is finished
    if (bad) violated.add(e.to);
    const isCritical = showCritical && critical.links.has(`${e.from}>${e.to}`);
    const xm = fx + 8;
    return { key: `${e.from}-${e.to}`, d: `M${fx},${fy} H${xm} V${ty} H${tx}`, tx, ty, bad, isCritical };
  });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">{L("گانت چارت", "Gantt chart")}</h1>
          <p className="text-[13px] text-muted">
            {L(
              `${rows.length} کار زمان‌بندی‌شده · خط رنگی امروز است · قرمز یعنی عقب‌افتاده`,
              `${rows.length} scheduled cards · the colored line is today · red means overdue`,
            )}
          </p>
          <p className="text-[12px] text-subtle">
            {L(
              "نوار را بکشید تا تاریخ‌ها جابه‌جا شوند؛ لبه‌ی نوار را بکشید تا شروع یا پایان عوض شود. پیکان‌ها وابستگی‌اند و حاشیه‌ی قرمز یعنی کار قبل از تمام‌شدنِ پیش‌نیازش شروع شده.",
              "Drag a bar to move its dates; drag an edge to change the start or the end. Arrows are dependencies, a red outline means the card starts before its prerequisite is done.",
            )}
          </p>
        </div>
        {edges.length > 0 && (
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={showCritical} onChange={(e) => setShowCritical(e.target.checked)} />
            {L("نمایش مسیر بحرانی", "Show critical path")}
          </label>
        )}
      </div>
      <div className="k-scroll min-h-0 flex-1 overflow-auto px-4 pb-8" dir="ltr">
        <div className="relative select-none" style={{ minWidth: LABEL_W + chartW + 24 }}>
          <div className="sticky top-0 z-10 flex h-12 items-end border-b border-border k-glass">
            <div className="sticky left-0 z-20 h-12 shrink-0 k-glass" style={{ width: LABEL_W }} />
            <div className="relative h-12" style={{ width: chartW }}>
              {months.map((m) => (
                <div
                  key={`${m.label}-${m.x}`}
                  className="absolute top-1 whitespace-nowrap text-[11px] font-medium text-muted"
                  style={{ left: m.x * PX }}
                >
                  {m.label}
                </div>
              ))}
              {ticks.map((t) => (
                <div key={`t-${t.x}`} className="absolute bottom-0.5 text-[10px] tabular-nums text-subtle" style={{ left: t.x * PX }}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {todayOff >= 0 && todayOff <= range.days && (
            <>
              <div className="pointer-events-none absolute bottom-0 z-[1] w-px bg-accent" style={{ top: HEAD, left: LABEL_W + todayOff * PX }} />
              <div
                className="pointer-events-none absolute top-1 z-[3] rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-fg"
                style={{ left: LABEL_W + todayOff * PX + 4 }}
              >
                {L("امروز", "Today")}
              </div>
            </>
          )}

          {rows.map((c, i) => {
            const { x1, x2 } = span(i);
            const done = c.listId === doneId;
            const overdue = isOverdue(c.dueDate, done);
            const label = board.labels.find((l) => c.labelIds.includes(l.id));
            const priColor = c.priority === "high" ? "#e11d48" : c.priority === "low" ? "#16a34a" : "#2563eb";
            const color = overdue ? "#e11d48" : done ? "#94a3b8" : label?.color || priColor;
            const owner = personById(board.people, c.memberIds[0] ?? c.followerId);
            const width = Math.max((x2 - x1 + 1) * PX - 4, 12);
            const isCrit = showCritical && critical.nodes.has(i);
            const dragging = drag?.id === c.id;
            return (
              <div key={c.id} className="flex h-10 w-full items-center border-b border-border/60 hover:bg-accent-soft/40">
                <button
                  type="button"
                  onClick={() => onOpenCard?.(c.id)}
                  className="sticky left-0 z-[2] h-10 truncate bg-bg/90 px-2 text-right text-[12px] text-fg backdrop-blur-sm"
                  style={{ width: LABEL_W }}
                  dir="rtl"
                >
                  <div className="truncate font-medium">{c.title}</div>
                  {owner && <div className="truncate text-[10px] text-subtle">{personName(owner)}</div>}
                </button>
                <div className="relative h-10" style={{ width: chartW }}>
                  <div
                    title={c.title}
                    onPointerDown={(e) => down(e, c, "move")}
                    onPointerMove={move}
                    onPointerUp={(e) => up(e, i)}
                    onPointerCancel={() => setDrag(null)}
                    className={cn(
                      "absolute top-2 h-6 overflow-hidden rounded-md px-1.5 text-[10px] leading-6 text-white shadow-sm ring-1 ring-black/5",
                      dragging ? "cursor-grabbing" : "cursor-grab",
                      violated.has(i) && "outline outline-2 outline-red-500",
                      isCrit && !violated.has(i) && "outline outline-2 outline-amber-400",
                    )}
                    style={{ left: x1 * PX, width, background: color, opacity: done ? 0.45 : 0.92, touchAction: "none" }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-black/15"
                      onPointerDown={(e) => down(e, c, "start")}
                    />
                    <span className="pointer-events-none">{width > 48 ? c.title : ""}</span>
                    <span
                      className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-black/15"
                      onPointerDown={(e) => down(e, c, "end")}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <svg
            className="pointer-events-none absolute z-[2]"
            style={{ left: LABEL_W, top: HEAD }}
            width={chartW}
            height={rows.length * ROW}
            aria-hidden="true"
          >
            {arrows.map((a) => {
              const stroke = a.bad ? "#ef4444" : a.isCritical ? "#fbbf24" : "var(--k-muted)";
              return (
                <g key={a.key}>
                  <path d={a.d} fill="none" stroke={stroke} strokeWidth={a.isCritical || a.bad ? 2 : 1.25} />
                  <polygon points={`${a.tx},${a.ty} ${a.tx - 6},${a.ty - 3.5} ${a.tx - 6},${a.ty + 3.5}`} fill={stroke} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
