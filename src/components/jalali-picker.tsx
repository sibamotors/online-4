import { useEffect, useMemo, useState } from "react";
import {
  calDaysInMonth,
  calFirstColumn,
  calFromIso,
  calMonths,
  calNum,
  calToday,
  calToIso,
  calWeekdays,
} from "@/lib/jalali";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
  allowClear?: boolean;
};

/** Date picker; shows the Persian calendar in Persian and the Gregorian calendar in English (value is always `YYYY-MM-DD`). */
export function JalaliPicker(props: Props) {
  const { lang } = useTranslation();
  return <PickerInner key={lang} {...props} />;
}

function PickerInner({ value, onChange, allowClear = true }: Props) {
  const { lang } = useTranslation();
  const english = lang === "en";
  const selected = calFromIso(value);
  const [todayY, todayM, todayD] = calToday();
  const [viewY, setViewY] = useState(selected?.[0] ?? todayY);
  const [viewM, setViewM] = useState(selected?.[1] ?? todayM);

  useEffect(() => {
    if (selected) {
      setViewY(selected[0]);
      setViewM(selected[1]);
    }
  }, [value]);

  const cells = useMemo(() => {
    const firstWeekday = calFirstColumn(viewY, viewM);
    const dim = calDaysInMonth(viewY, viewM);
    const out: { day: number | null; iso: string | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push({ day: null, iso: null });
    for (let d = 1; d <= dim; d++) {
      out.push({ day: d, iso: calToIso(viewY, viewM, d) });
    }
    return out;
  }, [viewY, viewM]);

  function shiftMonth(delta: number) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewY(y);
    setViewM(m);
  }

  return (
    <div className="w-[280px] rounded-xl border border-border k-elevated p-3">
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(english ? -1 : 1)} aria-label={english ? "Previous month" : "ماه بعد"}>
          ‹
        </Button>
        <div className="flex items-center gap-1 text-sm font-medium">
          <select
            aria-label={english ? "Month" : "ماه"}
            className="h-8 rounded-md border border-transparent bg-transparent px-1 hover:border-border focus:border-accent"
            value={viewM}
            onChange={(e) => setViewM(Number(e.target.value))}
          >
            {calMonths().map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            aria-label={english ? "Year" : "سال"}
            className="h-8 rounded-md border border-transparent bg-transparent px-1 tabular-nums hover:border-border focus:border-accent"
            value={viewY}
            onChange={(e) => setViewY(Number(e.target.value))}
          >
            {Array.from({ length: 21 }, (_, i) => Math.min(todayY - 5, viewY) + i)
              .concat(viewY > todayY + 15 ? [viewY] : [])
              .filter((y, i, a) => a.indexOf(y) === i)
              .map((y) => (
                <option key={y} value={y}>
                  {calNum(y)}
                </option>
              ))}
          </select>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(english ? 1 : -1)} aria-label={english ? "Next month" : "ماه قبل"}>
          ›
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-subtle">
        {calWeekdays().map((w) => (
          <div key={w} className="py-1">
            {w.slice(0, 1)}
          </div>
        ))}
        {cells.map((c, i) => {
          const isSel = Boolean(c.iso && c.iso === value);
          const isToday = c.day === todayD && viewM === todayM && viewY === todayY;
          return (
            <button
              key={i}
              type="button"
              disabled={!c.day}
              onClick={() => c.iso && onChange(c.iso)}
              className={cn(
                "grid h-8 place-items-center rounded-sm text-[13px] tabular-nums",
                !c.day && "opacity-0",
                isSel && "bg-accent text-accent-fg",
                !isSel && c.day && "hover:bg-accent-soft",
                isToday && !isSel && "ring-1 ring-accent/50",
              )}
            >
              {c.day ?? ""}
            </button>
          );
        })}
      </div>
      {allowClear && (
        <button
          type="button"
          className="mt-2 w-full text-center text-[12px] text-muted hover:text-fg"
          onClick={() => onChange(null)}
        >
          {english ? "Clear date" : "پاک کردن تاریخ"}
        </button>
      )}
    </div>
  );
}
