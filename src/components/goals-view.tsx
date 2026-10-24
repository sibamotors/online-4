import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteObjective,
  deleteProject,
  getGoals,
  listBoardCardsForGoals,
  saveObjective,
  saveProject,
  type KeyResultInput,
  type Objective,
  type ProjectStatus,
} from "@/lib/goals";
import { useTranslation } from "@/lib/i18n";
import { useLocalSession } from "@/lib/local-session";
import { cn, nid } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

const selectCls = "h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm";
const RAG = { green: "bg-success", yellow: "bg-warning", red: "bg-danger" } as const;

/** Goals (objectives and key results linked to cards) and projects (groups of boards with a status colour). */
export function GoalsView() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const [tab, setTab] = useState<"goals" | "projects">("goals");
  const q = useQuery({ queryKey: ["goals"], queryFn: () => getGoals(), refetchInterval: 60_000 });
  const data = q.data;
  const tabCls = (on: boolean) => cn("h-9 flex-1 rounded-lg text-[13px] font-medium", on ? "bg-bg-elevated text-fg shadow-sm" : "text-muted");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 pb-24">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{L("اهداف و پروژه‌ها", "Goals and projects")}</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          {L("هدف‌ها از روی کارت‌های واقعی پیشرفت می‌گیرند؛ پروژه چند تخته را با یک رنگ وضعیت کنار هم نشان می‌دهد.", "Goals take their progress from real cards; a project shows several boards with one status colour.")}
        </p>
      </header>
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        <button type="button" className={tabCls(tab === "goals")} onClick={() => setTab("goals")}>
          {L("اهداف", "Goals")}
        </button>
        <button type="button" className={tabCls(tab === "projects")} onClick={() => setTab("projects")}>
          {L("پروژه‌ها", "Projects")}
        </button>
      </div>
      {!data ? (
        <p className="py-8 text-center text-sm text-muted">{L("در حال بارگذاری…", "Loading…")}</p>
      ) : tab === "goals" ? (
        <GoalsTab objectives={data.objectives} boards={data.boards} />
      ) : (
        <ProjectsTab projects={data.projects} boards={data.boards} />
      )}
    </div>
  );
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full bg-accent", className)} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 text-[11px] tabular-nums text-muted">{value}٪</span>
    </div>
  );
}

function GoalsTab({ objectives, boards }: { objectives: Objective[]; boards: { id: string; title: string }[] }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const { user, isAdmin } = useLocalSession();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<{ id?: string; title: string; period: string; krs: KeyResultInput[] } | null>(null);
  const del = useMutation({ mutationFn: (id: string) => deleteObjective({ data: { id } }), onSuccess: () => void qc.invalidateQueries({ queryKey: ["goals"] }) });

  return (
    <div className="space-y-3">
      {objectives.map((o) => {
        const mine = o.ownerUsername === user?.username || isAdmin;
        return (
          <div key={o.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{o.title}</p>
                <p className="text-[11px] text-subtle">
                  {o.ownerName}
                  {o.period ? ` · ${o.period}` : ""}
                </p>
              </div>
              {mine && (
                <>
                  <Button size="sm" variant="ghost" aria-label={L("ویرایش", "Edit")} onClick={() => setEdit({ id: o.id, title: o.title, period: o.period, krs: o.keyResults.map(({ progress: _p, cards: _c, ...k }) => k) })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" aria-label={L("حذف", "Delete")} onClick={() => window.confirm(L(`هدف «${o.title}» حذف شود؟`, `Delete “${o.title}”?`)) && del.mutate(o.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="mt-2">
              <Bar value={o.progress} />
            </div>
            <ul className="mt-3 space-y-2">
              {o.keyResults.map((k) => (
                <li key={k.id} className="text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span>{k.title}</span>
                    <span className="text-[11px] text-muted">
                      {k.kind === "manual" ? `${k.current ?? 0} / ${k.target ?? 0}` : `${k.cards.length} ${L("کارت", "cards")}`}
                    </span>
                  </div>
                  <Bar value={k.progress} className="bg-accent/70" />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {objectives.length === 0 && <p className="py-6 text-center text-[13px] text-muted">{L("هنوز هدفی ثبت نشده.", "No goals yet.")}</p>}
      <Button onClick={() => setEdit({ title: "", period: "", krs: [{ id: nid(), title: "", kind: "cards", cardIds: [] }] })}>
        <Plus className="size-4" />
        {L("هدف جدید", "New goal")}
      </Button>
      {edit && (
        <ObjectiveEditor
          key={edit.id ?? "new"}
          draft={edit}
          boards={boards}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            void qc.invalidateQueries({ queryKey: ["goals"] });
          }}
        />
      )}
    </div>
  );
}

function ObjectiveEditor(props: {
  draft: { id?: string; title: string; period: string; krs: KeyResultInput[] };
  boards: { id: string; title: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const [d, setD] = useState(props.draft);
  const save = useMutation({
    mutationFn: () => saveObjective({ data: d }),
    onSuccess: (r) => (r.ok ? props.onSaved() : toast.error(r.error ?? L("ذخیره نشد.", "Could not save."))),
    onError: () => toast.error(L("ذخیره نشد؛ ورودی‌ها را بررسی کنید.", "Could not save; check the fields.")),
  });
  const setKr = (i: number, patch: Partial<KeyResultInput>) => setD({ ...d, krs: d.krs.map((k, j) => (j === i ? { ...k, ...patch } : k)) });

  return (
    <Dialog open onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle>{d.id ? L("ویرایش هدف", "Edit goal") : L("هدف جدید", "New goal")}</DialogTitle>
        <div className="mt-3 space-y-3">
          <Input value={d.title} maxLength={200} placeholder={L("هدف (مثلاً «کاهش توقف خط به‌خاطر کمبود قطعه»)", "Goal")} onChange={(e) => setD({ ...d, title: e.target.value })} />
          <Input value={d.period} maxLength={40} placeholder={L("دوره (مثلاً «پاییز ۱۴۰۵»)", "Period (optional)")} onChange={(e) => setD({ ...d, period: e.target.value })} />
          <p className="text-[12px] font-semibold">{L("نتایج کلیدی", "Key results")}</p>
          {d.krs.map((k, i) => (
            <div key={k.id} className="space-y-2 rounded-lg border border-border p-2">
              <div className="flex gap-2">
                <Input value={k.title} maxLength={200} placeholder={L("نتیجه‌ی کلیدی", "Key result")} onChange={(e) => setKr(i, { title: e.target.value })} />
                <Button size="sm" variant="ghost" disabled={d.krs.length === 1} aria-label={L("حذف", "Remove")} onClick={() => setD({ ...d, krs: d.krs.filter((_, j) => j !== i) })}>
                  <X className="size-4" />
                </Button>
              </div>
              <select className={selectCls} value={k.kind} onChange={(e) => setKr(i, e.target.value === "cards" ? { kind: "cards", cardIds: [] } : { kind: "manual", target: 100, current: 0 })}>
                <option value="cards">{L("پیشرفت از روی کارت‌های انتخابی", "Progress from chosen cards")}</option>
                <option value="manual">{L("عدد دستی (جاری ÷ هدف)", "Manual number (current ÷ target)")}</option>
              </select>
              {k.kind === "manual" ? (
                <div className="flex items-center gap-2 text-[12px] text-muted">
                  {L("جاری", "Current")}
                  <Input type="number" className="w-24" value={k.current ?? 0} onChange={(e) => setKr(i, { current: Number(e.target.value) || 0 })} />
                  {L("هدف", "Target")}
                  <Input type="number" className="w-24" value={k.target ?? 0} onChange={(e) => setKr(i, { target: Number(e.target.value) || 0 })} />
                </div>
              ) : (
                <CardPicker boards={props.boards} value={k.cardIds ?? []} onChange={(ids) => setKr(i, { cardIds: ids })} />
              )}
            </div>
          ))}
          {d.krs.length < 10 && (
            <Button size="sm" variant="secondary" onClick={() => setD({ ...d, krs: [...d.krs, { id: nid(), title: "", kind: "cards", cardIds: [] }] })}>
              <Plus className="size-4" />
              {L("نتیجه‌ی کلیدی دیگر", "Another key result")}
            </Button>
          )}
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" disabled={save.isPending || !d.title.trim() || d.krs.some((k) => !k.title.trim())} onClick={() => save.mutate()}>
              {L("ذخیره", "Save")}
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

function CardPicker({ boards, value, onChange }: { boards: { id: string; title: string }[]; value: string[]; onChange: (ids: string[]) => void }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const cardsQ = useQuery({ queryKey: ["goal-cards", boardId], queryFn: () => listBoardCardsForGoals({ data: { boardId } }), enabled: Boolean(boardId) });
  return (
    <div className="space-y-1">
      <select className={selectCls} value={boardId} onChange={(e) => setBoardId(e.target.value)}>
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title}
          </option>
        ))}
      </select>
      <div className="k-scroll max-h-36 overflow-y-auto rounded-lg border border-border p-1">
        {(cardsQ.data ?? []).map((c) => (
          <label key={c.id} className="flex items-center gap-2 px-1 py-0.5 text-[12px]">
            <input type="checkbox" checked={value.includes(c.id)} onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((x) => x !== c.id))} />
            <span className="truncate">{c.title}</span>
          </label>
        ))}
      </div>
      <p className="text-[11px] text-subtle">
        {value.length} {L("کارت انتخاب شده (از همه‌ی تخته‌ها)", "cards selected (across boards)")}
      </p>
    </div>
  );
}

function ProjectsTab({ projects, boards }: { projects: ProjectStatus[]; boards: { id: string; title: string }[] }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const { isAdmin } = useLocalSession();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<{ id?: string; name: string; description: string; boardIds: string[] } | null>(null);
  const reload = () => void qc.invalidateQueries({ queryKey: ["goals"] });
  const save = useMutation({
    mutationFn: () => saveProject({ data: edit! }),
    onSuccess: () => {
      setEdit(null);
      reload();
    },
    onError: () => toast.error(L("ذخیره نشد.", "Could not save.")),
  });
  const del = useMutation({ mutationFn: (id: string) => deleteProject({ data: { id } }), onSuccess: reload });

  return (
    <div className="space-y-3">
      {projects.map((p) => {
        const pctDone = p.total ? Math.round((p.done / p.total) * 100) : 0;
        return (
          <div key={p.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start gap-2">
              <span className={cn("mt-1 size-3 shrink-0 rounded-full", RAG[p.status])} title={p.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.name}</p>
                {p.description && <p className="text-[12px] text-muted">{p.description}</p>}
              </div>
              {isAdmin && (
                <>
                  <Button size="sm" variant="ghost" aria-label={L("ویرایش", "Edit")} onClick={() => setEdit({ id: p.id, name: p.name, description: p.description, boardIds: p.boardIds })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" aria-label={L("حذف", "Delete")} onClick={() => window.confirm(L(`پروژه «${p.name}» حذف شود؟`, `Delete “${p.name}”?`)) && del.mutate(p.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="mt-2">
              <Bar value={pctDone} />
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {p.open} {L("کار باز", "open")} · <span className={p.overdue > 0 ? "text-danger" : ""}>{p.overdue} {L("دیرکرد", "overdue")}</span> · {p.done}/{p.total} {L("تمام‌شده", "done")}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {p.boards.map((b) => (
                <li key={b.id} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px]">
                  {b.title} · {b.open}
                  {b.overdue > 0 && <span className="text-danger"> ({b.overdue})</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {projects.length === 0 && (
        <p className="py-6 text-center text-[13px] text-muted">
          {L("هنوز پروژه‌ای تعریف نشده.", "No projects yet.")} {isAdmin ? "" : L("مدیر سامانه می‌تواند بسازد.", "An administrator can create them.")}
        </p>
      )}
      <p className="text-[11px] text-subtle">
        {L("رنگ: سبز = بدون دیرکرد · زرد = کمتر از ۲۰٪ کارهای باز دیرکرد · قرمز = ۲۰٪ یا بیشتر.", "Colour: green = nothing late · yellow = under 20% of open cards late · red = 20% or more.")}
      </p>
      {isAdmin && (
        <Button onClick={() => setEdit({ name: "", description: "", boardIds: [] })}>
          <Plus className="size-4" />
          {L("پروژه‌ی جدید", "New project")}
        </Button>
      )}
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogTitle>{edit.id ? L("ویرایش پروژه", "Edit project") : L("پروژه‌ی جدید", "New project")}</DialogTitle>
            <div className="mt-3 space-y-3">
              <Input value={edit.name} maxLength={120} placeholder={L("نام پروژه", "Project name")} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <Input value={edit.description} maxLength={500} placeholder={L("توضیح (اختیاری)", "Description (optional)")} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <p className="text-[12px] font-semibold">{L("تخته‌های این پروژه", "Boards in this project")}</p>
              <div className="space-y-1">
                {boards.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={edit.boardIds.includes(b.id)}
                      onChange={(e) => setEdit({ ...edit, boardIds: e.target.checked ? [...edit.boardIds, b.id] : edit.boardIds.filter((x) => x !== b.id) })}
                    />
                    {b.title}
                  </label>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" disabled={save.isPending || !edit.name.trim()} onClick={() => save.mutate()}>
                  {L("ذخیره", "Save")}
                </Button>
                <Button variant="secondary" onClick={() => setEdit(null)}>
                  {L("انصراف", "Cancel")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
