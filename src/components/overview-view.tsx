import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "@/lib/i18n";
import { isoToJalaaliStr } from "@/lib/jalali";
import { getOverview } from "@/lib/overview";
import { cn } from "@/lib/utils";

const TOOLTIP_STYLE = {
  background: "var(--k-bg-elevated)",
  border: "1px solid var(--k-border)",
  borderRadius: 8,
  color: "var(--k-fg)",
  fontSize: 12,
};

/** Everything a manager wants on one page: all boards, who is loaded, and the weekly trend. */
export function OverviewView() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const q = useQuery({ queryKey: ["overview"], queryFn: () => getOverview(), refetchInterval: 60_000 });
  const data = q.data;

  if (!data) {
    return <p className="p-8 text-center text-sm text-muted">{q.isError ? L("بارگذاری نشد.", "Could not load.") : L("در حال بارگذاری…", "Loading…")}</p>;
  }

  const { totals } = data;
  const maxLoad = Math.max(1, ...data.people.map((p) => p.open));
  const hrs = (min: number) => (min / 60).toFixed(min % 60 === 0 ? 0 : 1);
  const timePeople = data.people.filter((p) => p.loggedWeekMin > 0 || p.plannedMin > 0);
  const trend = data.weeks.map((w) => ({
    name: isoToJalaaliStr(w.start).slice(5),
    [L("ساخته‌شده", "Created")]: w.created,
    [L("تمام‌شده", "Completed")]: w.completed,
  }));

  return (
    <div className="k-scroll mx-auto flex max-w-6xl flex-col gap-4 overflow-y-auto px-4 py-5 pb-24">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{L("نمای کلی", "Overview")}</h1>
        <p className="mt-0.5 text-[13px] text-muted">{L("وضعیت همه‌ی تخته‌ها در یک صفحه", "All boards on one page")}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label={L("تخته", "Boards")} value={totals.boards} />
        <Stat label={L("کار باز", "Open")} value={totals.open} />
        <Stat label={L("دیرکرد", "Overdue")} value={totals.overdue} tone={totals.overdue > 0 ? "danger" : undefined} />
        <Stat label={L("سررسید تا ۷ روز", "Due in 7 days")} value={totals.dueSoon} tone={totals.dueSoon > 0 ? "warning" : undefined} />
        <Stat label={L("تمام‌شده در ۷ روز اخیر", "Done in last 7 days")} value={totals.doneThisWeek} tone="success" />
      </div>

      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-1 text-sm font-semibold">{L("روند هفتگی (۸ هفته‌ی اخیر)", "Weekly trend (last 8 weeks)")}</h2>
        <p className="mb-3 text-[11px] text-subtle">
          {L("هفته از شنبه شروع می‌شود. «تمام‌شده» فقط کارت‌هایی را می‌شمارد که اکنون در ستون پایانی‌اند.", "Weeks start on Saturday. “Completed” counts cards currently in the final column.")}
        </p>
        <div dir="ltr" className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--k-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--k-muted)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--k-muted)" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--k-accent-soft)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={L("ساخته‌شده", "Created")} fill="var(--k-accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey={L("تمام‌شده", "Completed")} fill="var(--k-success, #16a34a)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">{L("تخته‌ها", "Boards")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[12px] text-muted">
              <tr>
                <th className="py-2 text-start font-medium">{L("تخته", "Board")}</th>
                <th className="px-2 py-2 text-center font-medium">{L("باز", "Open")}</th>
                <th className="px-2 py-2 text-center font-medium">{L("دیرکرد", "Overdue")}</th>
                <th className="px-2 py-2 text-center font-medium">{L("۷ روز", "7 days")}</th>
                <th className="px-2 py-2 text-center font-medium">{L("تمام", "Done")}</th>
                <th className="w-32 py-2 text-start font-medium">{L("پیشرفت", "Progress")}</th>
              </tr>
            </thead>
            <tbody>
              {data.boards.map((b) => {
                const pct = b.total ? Math.round((b.done / b.total) * 100) : 0;
                return (
                  <tr key={b.id} className="border-t border-border">
                    <td className="py-2.5">
                      <Link to="/b/$boardId" params={{ boardId: b.id }} className="font-medium hover:text-accent">
                        {b.title}
                      </Link>
                    </td>
                    <td className="px-2 text-center tabular-nums">{b.open}</td>
                    <td className={cn("px-2 text-center tabular-nums", b.overdue > 0 && "font-semibold text-danger")}>{b.overdue}</td>
                    <td className="px-2 text-center tabular-nums">{b.dueSoon}</td>
                    <td className="px-2 text-center tabular-nums">{b.done}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-9 text-[11px] tabular-nums text-muted">{pct}٪</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-1 text-sm font-semibold">{L("بار کاری افراد", "Workload per person")}</h2>
        <p className="mb-3 text-[11px] text-subtle">{L("کارهای بازِ هر نفر در همه‌ی تخته‌ها؛ بخش قرمز دیرکردهاست.", "Open cards per person across all boards; the red part is overdue.")}</p>
        {data.people.length === 0 ? (
          <p className="text-[13px] text-muted">{L("هنوز کاری به کسی اختصاص داده نشده.", "Nothing is assigned yet.")}</p>
        ) : (
          <div className="space-y-2">
            {data.people.map((p) => (
              <div key={p.name} className="flex items-center gap-3 text-[13px]">
                <span className="w-36 shrink-0 truncate">{p.name}</span>
                <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-danger" style={{ width: `${(p.overdue / maxLoad) * 100}%` }} />
                  <div className="h-full bg-accent" style={{ width: `${((p.open - p.overdue) / maxLoad) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-end tabular-nums text-muted">
                  {p.open}
                  {p.overdue > 0 && <span className="text-danger"> · {p.overdue} {L("دیرکرد", "late")}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-1 text-sm font-semibold">{L("زمان و ظرفیت هفته", "Time and capacity this week")}</h2>
        <p className="mb-3 text-[11px] text-subtle">
          {L(
            `ظرفیت هر نفر ${hrs(data.capacityMin)} ساعت در هفته. «ثبت‌شده» زمانی است که از شنبه ثبت شده؛ «مانده» برآوردِ کارهای بازِ او منهای زمانِ ثبت‌شده است (فقط کارت‌هایی که برآورد دارند).`,
            `Each person's capacity is ${hrs(data.capacityMin)} h per week. “Logged” is the time recorded since Saturday; “left” is the estimate of their open cards minus time already logged (only cards that have an estimate).`,
          )}
        </p>
        {timePeople.length === 0 ? (
          <p className="text-[13px] text-muted">
            {L("هنوز زمانی ثبت نشده و کاری برآورد نشده. از پنجره‌ی هر کارت «زمان و برآورد» را پر کنید.", "No time logged and nothing estimated yet. Fill in “Time and estimate” in a card.")}
          </p>
        ) : (
          <div className="space-y-2">
            {timePeople.map((p) => {
              const loggedPct = Math.min((p.loggedWeekMin / data.capacityMin) * 100, 100);
              const leftPct = Math.min((p.plannedMin / data.capacityMin) * 100, 100 - loggedPct);
              const over = p.loggedWeekMin + p.plannedMin > data.capacityMin;
              return (
                <div key={p.name} className="flex items-center gap-3 text-[13px]">
                  <span className="w-36 shrink-0 truncate">{p.name}</span>
                  <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-accent" style={{ width: `${loggedPct}%` }} />
                    <div className={cn("h-full", over ? "bg-danger" : "bg-accent/40")} style={{ width: `${leftPct}%` }} />
                  </div>
                  <span className={cn("w-40 shrink-0 text-end text-[12px] tabular-nums", over ? "text-danger" : "text-muted")}>
                    {hrs(p.loggedWeekMin)} {L("ثبت‌شده", "logged")} · {hrs(p.plannedMin)} {L("مانده", "left")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warning" | "success" }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}
