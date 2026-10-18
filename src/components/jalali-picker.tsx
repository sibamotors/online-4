import { useEffect, useMemo, useState } from "react";
import {
  daysInJalaaliMonth,
  isoToJalaali,
  jalaaliToIso,
  JMONTHS,
  todayJalaali,
  weekdayOfJalaali,
  WEEKDAY_NAMES,
} from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { gregorianMonthDays, gregorianMonthWeekdayOffset, gregorianToIso, isoToGregorianParts } from "@/lib/calendar-picker";
import { Button } from "./ui/button";
import { useTranslation } from "@/lib/i18n";

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
  allowClear?: boolean;
};

const GREGORIAN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const GREGORIAN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;


export function JalaliPicker({ value, onChange, allowClear = true }: Props) {
  const { lang, t } = useTranslation();
  const isEnglish = lang === "en";
  const selectedJalali = isoToJalaali(value);
  const selectedGregorian = isoToGregorianParts(value);
  const [todayJY, todayJM, todayJD] = todayJalaali();
  const now = new Date();
  const todayGY = now.getFullYear();
  const todayGM = now.getMonth() + 1;
  const todayGD = now.getDate();
  const [viewY, setViewY] = useState(() => (isEnglish ? selectedGregorian?.[0] : selectedJalali?.[0]) ?? (isEnglish ? todayGY : todayJY));
  const [viewM, setViewM] = useState(() => (isEnglish ? selectedGregorian?.[1] : selectedJalali?.[1]) ?? (isEnglish ? todayGM : todayJM));

  useEffect(() => {
    const selected = isEnglish ? selectedGregorian : selectedJalali;
    if (selected) {
      setViewY(selected[0]);
      setViewM(selected[1]);
    } else {
      setViewY(isEnglish ? todayGY : todayJY);
      setViewM(isEnglish ? todayGM : todayJM);
    }
  }, [value, lang]);

  const cells = useMemo(() => {
    const out: { day: number | null; iso: string | null }[] = [];
    if (isEnglish) {
      const firstWeekday = gregorianMonthWeekdayOffset(viewY, viewM);
      const dim = gregorianMonthDays(viewY, viewM);
      for (let i = 0; i < firstWeekday; i++) out.push({ day: null, iso: null });
      for (let d = 1; d <= dim; d++) out.push({ day: d, iso: gregorianToIso(viewY, viewM, d) });
    } else {
      const firstWeekday = weekdayOfJalaali(viewY, viewM, 1);
      const dim = daysInJalaaliMonth(viewY, viewM);
      for (let i = 0; i < firstWeekday; i++) out.push({ day: null, iso: null });
      for (let d = 1; d <= dim; d++) out.push({ day: d, iso: jalaaliToIso(viewY, viewM, d) });
    }
    return out;
  }, [viewY, viewM, isEnglish]);

  function shiftMonth(delta: number) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewY(y);
    setViewM(m);
  }

  const monthNames: readonly string[] = isEnglish ? GREGORIAN_MONTHS : JMONTHS;
  const weekdays: readonly string[] = isEnglish ? GREGORIAN_WEEKDAYS : WEEKDAY_NAMES;
  const todayY = isEnglish ? todayGY : todayJY;
  const todayM = isEnglish ? todayGM : todayJM;
  const todayD = isEnglish ? todayGD : todayJD;

  return (
    <div className="w-[280px] rounded-xl border border-border k-elevated p-3" lang={lang} dir={isEnglish ? "ltr" : "rtl"}>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(isEnglish ? -1 : 1)} aria-label={t(isEnglish ? "ماه قبل" : "ماه بعد")}>
          {"‹"}
        </Button>
        <div className="flex items-center gap-1 text-sm font-medium">
          <select
            aria-label={t("ماه")}
            className="h-8 rounded-md border border-transparent bg-transparent px-1 hover:border-border focus:border-accent"
            value={viewM}
            onChange={(e) => setViewM(Number(e.target.value))}
          >
            {monthNames.map((m, i) => (
              <option key={m} value={i + 1}>{isEnglish ? m : t(m)}</option>
            ))}
          </select>
          <select
            aria-label={t("سال")}
            className="h-8 rounded-md border border-transparent bg-transparent px-1 tabular-nums hover:border-border focus:border-accent"
            value={viewY}
            onChange={(e) => setViewY(Number(e.target.value))}
          >
            {Array.from({ length: 41 }, (_, i) => Math.min(todayY - 10, viewY) + i)
              .concat(viewY > todayY + 30 ? [viewY] : [])
              .filter((y, i, a) => a.indexOf(y) === i)
              .map((y) => <option key={y} value={y}>{y.toLocaleString(isEnglish ? "en-US" : "fa-IR", { useGrouping: false })}</option>)}
          </select>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(isEnglish ? 1 : -1)} aria-label={t(isEnglish ? "ماه بعد" : "ماه قبل")}>
          {"›"}
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-subtle">
        {weekdays.map((w) => <div key={w} className="py-1">{isEnglish ? w : t(w).slice(0, 1)}</div>)}
        {cells.map((c, i) => {
          const isSel = Boolean(c.iso && c.iso === value?.slice(0, 10));
          const isToday = c.day === todayD && viewM === todayM && viewY === todayY;
          return (
            <button
              key={i}
              type="button"
              disabled={!c.day}
              onClick={() => c.iso && onChange(c.iso)}
              aria-label={c.iso ?? undefined}
              aria-pressed={isSel}
              className={cn(
                "grid h-8 place-items-center rounded-sm text-[13px] tabular-nums",
                !c.day && "opacity-0",
                isSel && "bg-accent text-accent-fg",
                !isSel && c.day && "hover:bg-accent-soft",
                isToday && !isSel && "ring-1 ring-accent/50",
              )}
            >
              {c.day == null ? "" : c.day.toLocaleString(isEnglish ? "en-US" : "fa-IR", { useGrouping: false })}
            </button>
          );
        })}
      </div>
      {allowClear && (
        <button type="button" className="mt-2 w-full text-center text-[12px] text-muted hover:text-fg" onClick={() => onChange(null)}>
          {t("پاک کردن تاریخ")}
        </button>
      )}
    </div>
  );
}
