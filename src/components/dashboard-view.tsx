import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, Lightbulb, Link2, Shield } from "lucide-react";
import type { Board, Card } from "@/lib/types";
import { addDaysIso, isOverdue, isoToday } from "@/lib/jalali";
import { personName } from "@/lib/names";
import { calculateKanbanFlowMetrics } from "@/lib/kanban-metrics";
import { cn, downloadText } from "@/lib/utils";
import { Button } from "./ui/button";
import { useTranslation } from "@/lib/i18n";

/** One look for every chart tooltip. */
const TOOLTIP_STYLE = {
  background: "var(--k-bg-elevated)",
  border: "1px solid var(--k-border)",
  borderRadius: 8,
  color: "var(--k-fg)",
  fontSize: 12,
};

const PRI_COLORS = {
  high: "var(--k-danger, #e11d48)",
  med: "var(--k-warning, #d97706)",
  low: "var(--k-success, #16a34a)",
};

export function DashboardView({
  board,
  onOpenCard,
}: {
  board: Board;
  onOpenCard?: (id: string) => void;
}) {
  const { t, lang } = useTranslation();
  const cards: Card[] = board.lists.flatMap((l) => l.cards);
  const doneId = board.lists[board.lists.length - 1]?.id;
  const [personId, setPersonId] = useState<string>("all");
  const [labelId, setLabelId] = useState<string>("all");
  const [onlyActive, setOnlyActive] = useState(true);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (onlyActive && c.archived) return false;
      if (personId !== "all" && c.memberIds.indexOf(personId) < 0 && c.followerId !== personId) return false;
      if (labelId !== "all" && !c.labelIds.includes(labelId)) return false;
      return true;
    });
  }, [cards, personId, labelId, onlyActive]);

  // A card is considered Done only when it reaches the board's final column.
  // Progress=100 alone is not a workflow transition, so it must not release dependencies.
  const doneSet = useMemo(() => new Set(cards.filter((c) => doneId !== undefined && c.listId === doneId).map((c) => c.id)), [cards, doneId]);
  const flowMetrics = useMemo(
    () => calculateKanbanFlowMetrics(filtered, board.lists, isoToday()),
    [filtered, board.lists],
  );

  const kpi = useMemo(() => {
    const active = filtered.filter((c) => !c.archived);
    const open = active.filter((c) => c.listId !== doneId);
    const done = active.filter((c) => c.listId === doneId).length;
    const overdue = open.filter((c) => isOverdue(c.dueDate, false)).length;
    const today = isoToday();
    const week = addDaysIso(today, 7);
    const dueSoon = open.filter((c) => {
      if (!c.dueDate) return false;
      const d = c.dueDate.slice(0, 10);
      return d >= today && d <= week;
    }).length;
    const dueToday = open.filter((c) => c.dueDate?.slice(0, 10) === today).length;
    const avg = open.length
      ? Math.round(open.reduce((s, c) => s + (c.progress ?? 0), 0) / open.length)
      : 0;
    const unassigned = open.filter((c) => c.memberIds.length === 0).length;
    const highPri = open.filter((c) => c.priority === "high").length;
    const archived = cards.filter((c) => c.archived).length;
    const blocked = open.filter((c) =>
      (c.dependsOnIds ?? []).some((id) => !doneSet.has(id)),
    ).length;
    let checkTotal = 0;
    let checkDone = 0;
    for (const c of active) {
      for (const ch of c.checklists ?? []) {
        checkTotal += ch.items.length;
        checkDone += ch.items.filter((i) => i.done).length;
      }
    }
    const total = active.length;
    const completionRate = total ? Math.round((done / total) * 100) : 0;
    // Health score 0-100: penalize overdue, blocked, unassigned, reward completion
    let health = 70;
    health += Math.min(20, completionRate * 0.2);
    health -= Math.min(25, overdue * 4);
    health -= Math.min(15, blocked * 3);
    health -= Math.min(10, unassigned * 2);
    health = Math.max(0, Math.min(100, Math.round(health)));
    return {
      total,
      open: open.length,
      done,
      overdue,
      dueSoon,
      dueToday,
      avg,
      unassigned,
      highPri,
      archived,
      blocked,
      checkTotal,
      checkDone,
      completionRate,
      health,
    };
  }, [board, filtered, doneId, cards, doneSet]);

  const listRows = useMemo(
    () =>
      board.lists.map((l) => ({
        name: l.title,
        value: filtered.filter((c) => c.listId === l.id && !c.archived).length,
      })),
    [board.lists, filtered],
  );

  const catRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filtered) {
      if (c.archived) continue;
      if (c.labelIds.length === 0) counts.set("_", (counts.get("_") ?? 0) + 1);
      for (const id of c.labelIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, value]) => {
        const lab = board.labels.find((l) => l.id === id);
        return { name: lab?.name ?? t("no_label"), value, fill: lab?.color ?? "var(--k-subtle)" };
      })
      .sort((a, b) => b.value - a.value);
  }, [board.labels, filtered, lang]);

  const priRows = useMemo(
    () =>
      (["high", "med", "low"] as const).map((p) => ({
        name: priorityLabel(p, lang),
        key: p,
        value: filtered.filter((c) => !c.archived && c.priority === p && c.listId !== doneId).length,
        fill: PRI_COLORS[p],
      })),
    [filtered, doneId, lang],
  );

  const priTotal = priRows.reduce((sum, r) => sum + r.value, 0);

  const dueCalendar = useMemo(() => {
    const today = isoToday();
    const days: { iso: string; label: string; count: number; overdueish: boolean }[] = [];
    for (let i = 0; i < 14; i++) {
      const iso = addDaysIso(today, i);
      const count = filtered.filter(
        (c) => !c.archived && c.listId !== doneId && c.dueDate?.slice(0, 10) === iso,
      ).length;
      days.push({
        iso,
        label: formatDashboardDate(iso, lang) || iso,
        count,
        overdueish: i === 0,
      });
    }
    return days;
  }, [filtered, doneId, lang]);

  const activityRows = useMemo(() => {
    const today = isoToday();
    const map = new Map<string, number>();
    for (let i = 13; i >= 0; i--) map.set(addDaysIso(today, -i), 0);
    for (const c of filtered) {
      for (const a of c.activities ?? []) {
        const d = a.at?.slice(0, 10);
        if (d && map.has(d)) map.set(d, (map.get(d) ?? 0) + 1);
      }
    }
    return [...map.entries()].map(([iso, value]) => ({
      name: formatDashboardDate(iso, lang) || iso.slice(5),
      value,
    }));
  }, [filtered, doneId, lang]);

  const execRows = useMemo(() => personStats(filtered, board, doneId, "exec", t("unknown")), [board, filtered, doneId, lang]);
  const followRows = useMemo(() => personStats(filtered, board, doneId, "follow", t("unknown")), [board, filtered, doneId]);

  const overdueCards = useMemo(
    () =>
      filtered
        .filter((c) => !c.archived && isOverdue(c.dueDate, c.listId === doneId))
        .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
    [filtered, doneId],
  );

  const dueSoonCards = useMemo(() => {
    const today = isoToday();
    const week = addDaysIso(today, 7);
    return filtered
      .filter((c) => {
        if (c.archived || !c.dueDate || c.listId === doneId) return false;
        const d = c.dueDate.slice(0, 10);
        return d >= today && d <= week;
      })
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [filtered, doneId]);

  const blockedCards = useMemo(
    () =>
      filtered.filter(
        (c) =>
          !c.archived &&
          c.listId !== doneId &&
          (c.dependsOnIds ?? []).some((id) => !doneSet.has(id)),
      ),
    [filtered, doneId, doneSet],
  );

  const riskCards = useMemo(
    () =>
      filtered
        .filter(
          (c) =>
            !c.archived &&
            c.listId !== doneId &&
            c.priority === "high" &&
            (isOverdue(c.dueDate, false) || (c.dependsOnIds ?? []).some((id) => !doneSet.has(id))),
        )
        .slice(0, 12),
    [filtered, doneId, doneSet],
  );

  const noDue = useMemo(
    () => filtered.filter((c) => !c.archived && !c.dueDate && c.listId !== doneId),
    [filtered, doneId],
  );

  /** Auto-written executive summary (plain rules on the numbers above — no AI involved). */
  const insights = useMemo(() => {
    const out: { tone: "danger" | "warning" | "success" | "info"; text: string }[] = [];
    if (kpi.overdue > 0) {
      const oldest = overdueCards[0];
      out.push({
        tone: "danger",
        text: lang === "fa" ? `${kpi.overdue} کار عقب‌افتاده است${oldest ? ` — قدیمی‌ترین: «${oldest.title}»` : ""}.` : `${kpi.overdue} overdue task(s)${oldest ? ` — oldest: “${oldest.title}”` : ""}.`,
      });
    }
    if (kpi.blocked > 0) out.push({ tone: "warning", text: lang === "fa" ? `${kpi.blocked} کار به‌خاطر وابستگی‌های ناتمام مسدود است.` : `${kpi.blocked} task(s) are blocked by unfinished dependencies.` });
    if (kpi.dueToday > 0) out.push({ tone: "warning", text: lang === "fa" ? `${kpi.dueToday} کار امروز سررسید دارد.` : `${kpi.dueToday} task(s) are due today.` });
    if (kpi.unassigned > 0) out.push({ tone: "warning", text: lang === "fa" ? `${kpi.unassigned} کار باز مسئول اجرا ندارد.` : `${kpi.unassigned} open task(s) have no assignee.` });
    const busiest = execRows[0];
    if (busiest && execRows.length > 1 && busiest.total >= 5) {
      out.push({ tone: "info", text: lang === "fa" ? `بیشترین بار کاری: ${busiest.name} با ${busiest.total} کار.` : `Highest workload: ${busiest.name} with ${busiest.total} tasks.` });
    }
    if (out.length === 0) out.push({ tone: "success", text: t("stable_status") });
    return out.slice(0, 5);
  }, [kpi, overdueCards, execRows, lang]);

  /** Every open/active card falls into exactly ONE bucket. */
  const statusParts = useMemo(() => {
    let done = 0;
    let overdue = 0;
    let blocked = 0;
    let active = 0;
    let idle = 0;
    for (const c of filtered) {
      if (c.archived) continue;
      if (c.listId === doneId) {
        done++;
      } else if (isOverdue(c.dueDate, false)) {
        overdue++;
      } else if ((c.dependsOnIds ?? []).some((id) => !doneSet.has(id))) {
        blocked++;
      } else if ((c.progress ?? 0) > 0) {
        active++;
      } else {
        idle++;
      }
    }
    return [
      { key: "done", label: t("done_status"), value: done, color: "var(--k-success, #16a34a)" },
      { key: "active", label: t("in_progress"), value: active, color: "var(--k-accent)" },
      { key: "idle", label: t("not_started"), value: idle, color: "var(--k-subtle, #94a3b8)" },
      { key: "blocked", label: t("blocked_dependency"), value: blocked, color: "var(--k-warning, #d97706)" },
      { key: "overdue", label: t("overdue"), value: overdue, color: "var(--k-danger, #e11d48)" },
    ];
  }, [filtered, doneId, doneSet, lang]);

  const activeRows = useMemo(() => filtered.filter((c) => !c.archived), [filtered]);

  function exportCsv() {
    const header = [
      t("title"),
      t("column"),
      t("priority"),
      t("progress"),
      t("deadline"),
      t("executive_owner"),
      t("follow_up"),
      t("archived"),
      t("dependency_export"),
    ];
    const lines = ["\uFEFF" + header.join(",")];
    for (const c of filtered) {
      const list = board.lists.find((l) => l.id === c.listId)?.title ?? "";
      const members = c.memberIds
        .map((id) => board.people.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => personName(p!))
        .join(" | ");
      const follower = board.people.find((p) => p.id === c.followerId);
      const deps = (c.dependsOnIds ?? [])
        .map((id) => cards.find((x) => x.id === id)?.title ?? id)
        .join(" | ");
      lines.push(
        [
          csv(c.title),
          csv(list),
          csv(priorityLabel(c.priority, lang)),
          String(c.progress ?? 0),
          csv(formatDashboardDate(c.dueDate, lang) || ""),
          csv(members),
          csv(follower ? personName(follower) : ""),
          c.archived ? t("yes") : t("no"),
          csv(deps),
        ].join(","),
      );
    }
    downloadText(
      `sibamotor-report-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n"),
      "text/csv;charset=utf-8",
    );
  }

  function exportJson() {
    const payload = {
      board: board.title,
      exportedAt: new Date().toISOString(),
      kpi,
      cards: filtered.map((c) => ({
        title: c.title,
        list: board.lists.find((l) => l.id === c.listId)?.title,
        priority: c.priority,
        progress: c.progress,
        dueDate: c.dueDate,
        archived: c.archived,
        members: c.memberIds.map((id) => {
          const p = board.people.find((x) => x.id === id);
          return p ? personName(p) : id;
        }),
        dependsOn: (c.dependsOnIds ?? []).map((id) => cards.find((x) => x.id === id)?.title ?? id),
      })),
    };
    downloadText(
      `sibamotor-report-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
  }

  if (cards.length === 0) {
    return (
      <div className="grid h-[50vh] place-items-center px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">{t("dashboard_title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("dashboard_empty")}</p>
        </div>
      </div>
    );
  }

  const healthTone =
    kpi.health >= 75 ? "success" : kpi.health >= 50 ? "warning" : "danger";
  const maxWipAge = Math.max(...flowMetrics.openAgeRows.map((row) => row.averageAgeDays ?? 0), 1);

  return (
    <div className="k-scroll mx-auto flex max-w-6xl flex-col gap-4 overflow-y-auto px-4 py-5 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-l from-fg to-muted bg-clip-text text-xl font-semibold tracking-tight text-transparent">{t("dashboard_title")}</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {board.title} · {t("flow_and_risk")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="size-4" />
            {t("csv_export")}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportJson}>
            <Download className="size-4" />
            {t("json_export")}
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 text-[12px] text-muted">
          {t("person_filter")}
          <select
            className="max-w-[10rem] bg-transparent text-[12px] text-fg outline-none"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="all">{t("all")}</option>
            {board.people.map((p) => (
              <option key={p.id} value={p.id}>
                {personName(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 text-[12px] text-muted">
          {t("label_filter")}
          <select
            className="max-w-[10rem] bg-transparent text-[12px] text-fg outline-none"
            value={labelId}
            onChange={(e) => setLabelId(e.target.value)}
          >
            <option value="all">{t("all")}</option>
            {board.labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setOnlyActive((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center rounded-full border px-3 text-[12px]",
            onlyActive
              ? "border-accent bg-accent-soft text-fg"
              : "border-border bg-surface-2 text-muted",
          )}
        >
          {onlyActive ? t("only_active") : t("include_archived")}
        </button>
        {(personId !== "all" || labelId !== "all") && (
          <button
            type="button"
            className="text-[12px] text-muted hover:text-fg"
            onClick={() => {
              setPersonId("all");
              setLabelId("all");
            }}
          >
            {t("clear_filter")}
          </button>
        )}
      </div>

      {/* Executive summary */}
      <section className="rounded-2xl border border-border k-glass p-4" aria-label={t("management_summary_aria")}>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="size-4 text-accent" />
          {t("executive_summary")}
        </h2>
        <ul className="space-y-1.5">
          {insights.map((i) => (
            <li key={i.text} className="flex items-start gap-2 text-[13px] leading-relaxed">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  i.tone === "danger" && "bg-danger",
                  i.tone === "warning" && "bg-warning",
                  i.tone === "success" && "bg-success",
                  i.tone === "info" && "bg-accent",
                )}
              />
              {i.text}
            </li>
          ))}
        </ul>
      </section>

      {/* Health + KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi
          label={t("health_index")}
          value={kpi.health}
          suffix="/100"
          tone={healthTone}
          icon={<Shield className="size-3.5" />}
        />
        <Kpi label={t("completion_rate")} value={kpi.completionRate} suffix={lang === "fa" ? "٪" : "%"} tone="success" />
        <Kpi label={t("open_tasks")} value={kpi.open} />
        <Kpi label={t("overdue")} value={kpi.overdue} tone="danger" />
        <Kpi label={t("blocked_dependency_short")} value={kpi.blocked} tone={kpi.blocked ? "warning" : undefined} />
        <Kpi label={t("due_today")} value={kpi.dueToday} tone={kpi.dueToday ? "warning" : undefined} />
        <Kpi label={t("due_7_days")} value={kpi.dueSoon} />
        <Kpi label={t("high_priority")} value={kpi.highPri} />
        <Kpi label={t("average_progress")} value={kpi.avg} suffix={lang === "fa" ? "٪" : "%"} />
        <Kpi
          label={t("median_create_to_done")}
          value={flowMetrics.medianCreateToDoneDays ?? "—"}
          suffix={flowMetrics.medianCreateToDoneDays === null ? "" : ` ${t("days_suffix")}`}
          title={t("overdue_lead_tooltip")}
        />
        <Kpi
          label={t("average_open_age")}
          value={flowMetrics.averageOpenAgeDays ?? "—"}
          suffix={flowMetrics.averageOpenAgeDays === null ? "" : ` ${t("days_suffix")}`}
          title={t("open_age_tooltip")}
        />
        <Kpi
          label={t("completed_7_days")}
          value={flowMetrics.completedLast7Days}
          title={t("completed_week_tooltip")}
        />
        <Kpi
          label={t("completed_30_days")}
          value={flowMetrics.completedLast30Days}
          title={t("completed_month_tooltip")}
        />
        <Kpi label={t("unassigned")} value={kpi.unassigned} />
        <Kpi
          label={t("checklist")}
          value={kpi.checkDone}
          suffix={kpi.checkTotal ? `/${kpi.checkTotal}` : ""}
        />
        <Kpi label={t("archived")} value={kpi.archived} />
      </div>

      {/* Status breakdown */}
      <section className="rounded-2xl border border-border k-glass p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("status_overall")}</h2>
        <StatusBar parts={statusParts} />
      </section>

      {/* Age of unfinished work by workflow state */}
      <section className="rounded-2xl border border-border k-glass p-4">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("age_by_column")}</h2>
          <span className="text-[11px] text-muted">
            {t("median_create_to_done_caption")} {flowMetrics.createToDoneSampleSize.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} {t("completed_card_count")}
          </span>
        </div>
        <p className="mb-3 text-[11px] leading-5 text-muted">
          {t("open_age_description")}
        </p>
        {flowMetrics.openAgeRows.length === 0 ? (
          <p className="text-[12px] text-muted">{t("flow_age_requires_column")}</p>
        ) : (
          <div className="space-y-3">
            {flowMetrics.openAgeRows.map((row) => (
                <div key={row.listId} className="grid grid-cols-[minmax(5rem,1fr)_minmax(5rem,2fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium" title={row.listTitle}>{row.listTitle}</p>
                    <p className="text-[10px] text-muted">{row.count.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} {t("open_task_count")}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${t("column_age_aria")} ${row.listTitle}: ${row.averageAgeDays ?? t("unknown")} ${t("days_suffix")}`}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((row.averageAgeDays ?? 0) / maxWipAge) * 100)}%` }} />
                  </div>
                  <div className="text-end text-[11px] tabular-nums">
                    <span className="font-semibold">{row.averageAgeDays === null ? "—" : row.averageAgeDays.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} {t("days_suffix")}</span>
                    {row.oldestCardId && row.oldestAgeDays !== null && (
                      <button
                        type="button"
                        className="mt-0.5 block max-w-48 truncate text-end text-muted underline-offset-2 hover:text-accent hover:underline"
                        onClick={() => onOpenCard?.(row.oldestCardId!)}
                        title={row.oldestCardTitle ?? undefined}
                      >
                        {lang === "fa" ? "قدیمی‌ترین" : "Oldest"}: {row.oldestAgeDays.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} {t("days_suffix")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* 14-day due strip */}
      <section className="rounded-2xl border border-border k-glass p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("due_calendar_title")}</h2>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {dueCalendar.map((d) => (
            <div
              key={d.iso}
              className={cn(
                "flex min-w-[3.25rem] flex-col items-center rounded-xl border px-1.5 py-2",
                d.count > 0 ? "border-accent bg-accent-soft" : "border-border bg-surface-2",
              )}
            >
              <span className="text-[10px] text-subtle">{d.label}</span>
              <span
                className={cn(
                  "mt-1 text-sm font-semibold tabular-nums",
                  d.count > 0 ? "text-fg" : "text-subtle",
                )}
              >
                {d.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Risk */}
      <section className="rounded-2xl border border-border k-glass p-4">
        <h2 className="mb-1 text-sm font-semibold">{t("activity_volume_title")}</h2>
        <p className="mb-3 text-[11px] text-muted">{t("activity_chart_note")}</p>
        <div className="h-44" dir="ltr" role="img" aria-label={t("activity_chart_aria")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityRows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--k-muted)" }} interval={2} />
              <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10, fill: "var(--k-muted)" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" fill="var(--k-accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {riskCards.length > 0 && (
        <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle className="size-4" />
            {t("high_priority_risks")}
          </h2>
          <ul className="space-y-1">
            {riskCards.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpenCard?.(c.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-start hover:bg-accent-soft"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {isOverdue(c.dueDate, false)
                      ? t("overdue")
                      : (c.dependsOnIds ?? []).length
                        ? t("blocked_dependency")
                        : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {overdueCards.length > 0 && (
          <CardList
            title={t("overdue")}
            tone="danger"
            items={overdueCards}
            onOpen={onOpenCard}
            right={(c) => formatDashboardDate(c.dueDate, lang) || ""}
          />
        )}
        {dueSoonCards.length > 0 && (
          <CardList
            title={t("due_within_7_days")}
            items={dueSoonCards}
            onOpen={onOpenCard}
            right={(c) => formatDashboardDate(c.dueDate, lang) || ""}
          />
        )}
        {blockedCards.length > 0 && (
          <CardList
            title={t("blocked_by_dependency")}
            tone="warning"
            items={blockedCards}
            onOpen={onOpenCard}
            right={() => (
              <span className="inline-flex items-center gap-1">
                <Link2 className="size-3" /> {t("dependency")}
              </span>
            )}
          />
        )}
        {noDue.length > 0 && (
          <CardList
            title={t("no_due_date")}
            items={noDue}
            onOpen={onOpenCard}
            right={(c) => `${c.progress}${lang === "fa" ? "٪" : "%"}`}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border k-glass p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("column_distribution_title")}</h2>
          <Bars rows={listRows.map((r) => ({ ...r, color: "var(--k-accent)" }))} />
        </section>

        <section className="rounded-2xl border border-border k-glass p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("open_priority_title")}</h2>
          {priRows.every((r) => r.value === 0) ? (
            <p className="py-8 text-center text-[13px] text-muted">{t("no_open_task_priority")}</p>
          ) : (
          <div className="flex items-center gap-4">
            <div className="h-40 w-40 shrink-0" dir="ltr" role="img" aria-label={t("priority_chart_aria")}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priRows.filter((r) => r.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={36}
                    outerRadius={64}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {priRows.map((e) => (
                      <Cell key={e.key} fill={e.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {priRows.map((r) => (
                <div key={r.key} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: r.fill }} />
                    {r.name}
                  </span>
                  <span className="tabular-nums font-medium">
                    {r.value.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
                    <span className="ms-1 text-[11px] font-normal text-muted">
                      ({priTotal ? Math.round((r.value / priTotal) * 100) : 0}{lang === "fa" ? "٪" : "%"})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border k-glass p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("tasks_by_label")}</h2>
        {catRows.length === 0 ? (
          <p className="text-[13px] text-muted">{t("no_labels")}</p>
        ) : (
          <div className="h-56" dir="ltr" role="img" aria-label={t("label_chart_aria")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={128}
                  tick={{ fontSize: 11, fill: "var(--k-muted)" }}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {catRows.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                  <LabelList dataKey="value" position="right" fontSize={11} fill="var(--k-muted)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <Perf title={t("execution_owner_performance")} rows={execRows} />
      <Perf title={t("follower_performance")} rows={followRows} />

      <section className="rounded-2xl border border-border k-glass p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("task_list_title")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-border text-[12px] text-subtle">
              <tr>
                <th className="px-2 py-2 text-start font-medium">{t("title")}</th>
                <th className="px-2 py-2 text-start font-medium">{t("column")}</th>
                <th className="px-2 py-2 text-start font-medium">{t("priority")}</th>
                <th className="px-2 py-2 text-start font-medium">{t("progress")}</th>
                <th className="px-2 py-2 text-start font-medium">{t("deadline")}</th>
                <th className="px-2 py-2 text-start font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {activeRows
                .slice(0, 80)
                .map((c) => {
                  const list = board.lists.find((l) => l.id === c.listId)?.title ?? "";
                  const blocked = (c.dependsOnIds ?? []).some((id) => !doneSet.has(id));
                  const overdue = isOverdue(c.dueDate, c.listId === doneId);
                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer border-b border-border/60 hover:bg-accent-soft"
                      onClick={() => onOpenCard?.(c.id)}
                    >
                      <td className="max-w-[14rem] truncate px-2 py-2 font-medium">{c.title}</td>
                      <td className="px-2 py-2 text-muted">{list}</td>
                      <td className="px-2 py-2">{priorityLabel(c.priority, lang)}</td>
                      <td className="px-2 py-2 tabular-nums">{c.progress}{lang === "fa" ? "٪" : "%"}</td>
                      <td
                        className={cn(
                          "px-2 py-2 tabular-nums",
                          overdue ? "text-danger" : "text-muted",
                        )}
                      >
                        {formatDashboardDate(c.dueDate, lang) || "—"}
                      </td>
                      <td className="px-2 py-2 text-[12px]">
                        {overdue ? (
                          <span className="text-danger">{t("task_overdue")}</span>
                        ) : blocked ? (
                          <span className="text-warning">{t("task_blocked")}</span>
                        ) : c.listId === doneId ? (
                          <span className="text-success">{t("task_done")}</span>
                        ) : (
                          <span className="text-muted">{t("task_current")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {activeRows.length > 80 && (
          <p className="mt-2 text-[12px] text-muted">
            {t("show_80_of")} {activeRows.length}; {t("csv_full_list")}
          </p>
        )}
      </section>
    </div>
  );
}

/** Quote CSV cells, and neutralise spreadsheet formulas (a title like "=HYPERLINK(...)" must stay text). */
function csv(s: string) {
  let v = s;
  if (/^[=+@\t\r]/.test(v) || /^-(?!\d)/.test(v)) v = `'${v}`;
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function StatusBar({
  parts,
}: {
  parts: { key: string; label: string; value: number; color: string }[];
}) {
  const { lang } = useTranslation();
  const numberLocale = lang === "fa" ? "fa-IR" : "en-US";
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={parts.map((p) => `${p.label}: ${p.value.toLocaleString(numberLocale)}`).join(lang === "fa" ? "، " : ", ")}
      >
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <div
                key={p.key}
                title={`${p.label}: ${p.value.toLocaleString(numberLocale)}`}
                style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
              />
            ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="size-2.5 rounded-full" style={{ background: p.color }} />
              {p.label}
            </span>
            <span className="tabular-nums font-medium">
              {p.value.toLocaleString(numberLocale)}
              <span className="ms-1 text-[11px] font-normal text-subtle">
                {total ? `${Math.round((p.value / total) * 100)}${lang === "fa" ? "٪" : "%"}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
  tone,
  icon,
  title,
}: {
  label: string;
  value: number | string;
  title?: string;
  suffix?: string;
  tone?: "success" | "danger" | "warning";
  icon?: React.ReactNode;
}) {
  const { lang } = useTranslation();
  const displayValue = typeof value === "number" ? value.toLocaleString(lang === "fa" ? "fa-IR" : "en-US") : value;
  return (
    <div
      title={title}
      className={cn(
        "rounded-2xl border px-3 py-3 shadow-sm",
        tone === "danger" && "border-danger/25 bg-danger/5",
        tone === "success" && "border-success/25 bg-success/5",
        tone === "warning" && "border-warning/25 bg-warning/5",
        !tone && "border-border k-glass",
      )}
    >
      <p className="flex items-center gap-1 text-[11px] text-muted">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
        )}
      >
        {displayValue}
        {suffix ? <span className="text-sm font-medium text-muted">{suffix}</span> : null}
      </p>
    </div>
  );
}

function CardList({
  title,
  items,
  onOpen,
  right,
  tone,
}: {
  title: string;
  items: Card[];
  onOpen?: (id: string) => void;
  right: (c: Card) => React.ReactNode;
  tone?: "danger" | "warning";
}) {
  return (
    <section className="rounded-2xl border border-border k-glass p-4">
      <h2
        className={cn(
          "mb-3 text-sm font-semibold",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
        )}
      >
        {title}{" "}
        <span className="text-[12px] font-normal text-muted">({items.length})</span>
      </h2>
      <ul className="k-scroll max-h-52 space-y-1 overflow-y-auto">
        {items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen?.(c.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-start hover:bg-accent-soft"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-muted">{right(c)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Bars({ rows }: { rows: { name: string; value: number; color: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-end text-[12px] text-muted">{r.name}</div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((r.value / max) * 100, r.value ? 4 : 0)}%`,
                background: r.color,
              }}
            />
          </div>
          <div className="w-8 tabular-nums text-[12px]">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function Perf({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; total: number; completed: number; overdue: number }[];
}) {
  const { t, lang } = useTranslation();
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <section className="rounded-2xl border border-border k-glass p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-3 text-[12px] text-subtle">{t("bar_length_legend")}</p>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted">{t("no_data")}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-3">
              <div className="w-36 shrink-0 truncate text-end text-[12px] text-muted">{r.name}</div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="relative h-full"
                  style={{ width: `${Math.max((r.total / max) * 100, 6)}%` }}
                >
                  <div className="absolute inset-0 bg-border-strong" />
                  <div
                    className="absolute inset-y-0 end-0 bg-success"
                    style={{ width: `${r.total ? (r.completed / r.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div
                className={cn(
                  "w-16 text-[12px] tabular-nums",
                  r.overdue ? "text-danger" : "text-fg",
                )}
              >
                {r.completed.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}/{r.total.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
                {r.overdue ? ` · ${r.overdue.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function personStats(cards: Card[], board: Board, doneId: string | undefined, role: "exec" | "follow", unknownLabel: string) {
  const map = new Map<string, { total: number; completed: number; overdue: number }>();
  for (const c of cards) {
    if (c.archived) continue;
    const ids = role === "exec" ? c.memberIds : c.followerId ? [c.followerId] : [];
    for (const id of ids) {
      const s = map.get(id) ?? { total: 0, completed: 0, overdue: 0 };
      s.total += 1;
      if (c.listId === doneId) s.completed += 1;
      if (isOverdue(c.dueDate, c.listId === doneId)) s.overdue += 1;
      map.set(id, s);
    }
  }
  return [...map.entries()]
    .map(([id, s]) => {
      const p = board.people.find((x) => x.id === id);
      return { name: p ? personName(p) : unknownLabel, ...s };
    })
    .sort((a, b) => b.total - a.total);
}



function priorityLabel(priority: "high" | "med" | "low", lang: "fa" | "en"): string {
  if (lang === "fa") return priority === "high" ? "بالا" : priority === "med" ? "متوسط" : "پایین";
  return priority === "high" ? "High" : priority === "med" ? "Medium" : "Low";
}

/** Format ISO dates with the active UI locale and the appropriate calendar. */
function formatDashboardDate(value: string | null | undefined, lang: "fa" | "en"): string {
  if (!value) return "";
  const day = value.slice(0, 10);
  const parsed = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-ca-persian" : "en-US-u-ca-gregory", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(parsed);
}
