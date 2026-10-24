import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocalSession } from "@/lib/local-session";
import { useTranslation } from "@/lib/i18n";
import { isoToJalaaliStr } from "@/lib/jalali";
import { deleteTimeEntry, listCardTime, logTime, setCardEstimate } from "@/lib/time";
import type { Card } from "@/lib/types";
import { JalaliPicker } from "./jalali-picker";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const hours = (min: number) => (min / 60).toFixed(min % 60 === 0 ? 0 : 1);

/** Estimate and logged time of one card, inside the card window. */
export function CardTimePanel({ card }: { card: Card }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const { user, isAdmin } = useLocalSession();
  const qc = useQueryClient();
  const [h, setH] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [est, setEst] = useState("");

  const q = useQuery({ queryKey: ["card-time", card.id], queryFn: () => listCardTime({ data: { cardId: card.id } }) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["card-time", card.id] });
    void qc.invalidateQueries({ queryKey: ["overview"] });
  };

  const logMut = useMutation({
    mutationFn: (minutes: number) => logTime({ data: { cardId: card.id, minutes, workDate: date ?? undefined, note: note.trim() || undefined } }),
    onSuccess: (r) => {
      if (r.ok) {
        setH("");
        setNote("");
        refresh();
      } else toast.error(r.error);
    },
    onError: () => toast.error(L("ثبت نشد.", "Could not save.")),
  });
  const delMut = useMutation({ mutationFn: (id: string) => deleteTimeEntry({ data: { id } }), onSuccess: refresh });
  const estMut = useMutation({
    mutationFn: (minutes: number | null) => setCardEstimate({ data: { cardId: card.id, minutes } }),
    onSuccess: () => {
      refresh();
      void qc.invalidateQueries({ queryKey: ["board"] });
    },
    onError: () => toast.error(L("اجازه‌ی تغییر برآورد را ندارید.", "You are not allowed to change the estimate.")),
  });

  const data = q.data;
  const estimate = data?.estimateMinutes ?? card.estimateMinutes ?? null;
  const total = data?.totalMinutes ?? 0;

  function submit() {
    const value = Number(h.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value > 24) {
      toast.error(L("مدت را به ساعت و بین ۰ تا ۲۴ بنویسید (مثلاً ۱٫۵).", "Enter hours between 0 and 24 (for example 1.5)."));
      return;
    }
    logMut.mutate(Math.round(value * 60));
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          {L("ثبت‌شده", "Logged")}: <b className="tabular-nums">{hours(total)}</b> {L("ساعت", "h")}
        </span>
        <span className="flex items-center gap-1.5">
          {L("برآورد", "Estimate")}:
          <Input
            className="h-8 w-20"
            inputMode="decimal"
            placeholder={estimate ? hours(estimate) : "—"}
            value={est}
            onChange={(e) => setEst(e.target.value)}
            onBlur={() => {
              const v = Number(est.replace(",", "."));
              if (est.trim() === "") return;
              if (Number.isFinite(v) && v > 0) estMut.mutate(Math.round(v * 60));
              setEst("");
            }}
          />
          {L("ساعت", "h")}
        </span>
        {estimate ? (
          <span className={total > estimate ? "text-danger" : "text-muted"}>
            {total > estimate
              ? L(`${hours(total - estimate)} ساعت بیش از برآورد`, `${hours(total - estimate)} h over the estimate`)
              : L(`${hours(estimate - total)} ساعت مانده`, `${hours(estimate - total)} h left`)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[12px] text-muted">
          {L("مدت (ساعت)", "Hours")}
          <Input className="mt-1 h-9 w-24" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} />
        </label>
        <label className="min-w-40 flex-1 text-[12px] text-muted">
          {L("توضیح (اختیاری)", "Note (optional)")}
          <Input className="mt-1 h-9" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <Button size="sm" disabled={logMut.isPending || !h.trim()} onClick={submit}>
          {L("ثبت زمان", "Log time")}
        </Button>
      </div>
      <details className="text-[12px] text-muted">
        <summary className="cursor-pointer">
          {date ? `${L("تاریخ", "Date")}: ${isoToJalaaliStr(date)}` : L("برای روز دیگر ثبت کنم", "Log for another day")}
        </summary>
        <div className="mt-2">
          <JalaliPicker value={date} onChange={setDate} />
        </div>
      </details>

      {data && data.entries.length > 0 && (
        <ul className="divide-y divide-border">
          {data.entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-1.5 text-[12px]">
              <span className="w-20 shrink-0 tabular-nums text-muted">{isoToJalaaliStr(e.workDate)}</span>
              <span className="w-14 shrink-0 tabular-nums">
                {hours(e.minutes)} {L("ساعت", "h")}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {e.displayName}
                {e.note ? <span className="text-muted"> — {e.note}</span> : null}
              </span>
              {(e.username === user?.username || isAdmin) && (
                <button type="button" className="text-subtle hover:text-danger" aria-label={L("حذف", "Delete")} onClick={() => delMut.mutate(e.id)}>
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
