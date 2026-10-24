const G_D_M = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/**
 * Which calendar the screen shows: Persian (Jalali) in Persian mode, Gregorian in English mode.
 * Dates are always STORED as Gregorian `YYYY-MM-DD`; this only changes how they are shown and picked.
 * The language provider sets it, so every date shown anywhere follows the language.
 */
let calMode: "jalali" | "gregorian" = "jalali";
export function setCalendarMode(mode: "jalali" | "gregorian"): void {
  calMode = mode;
}
export const isGregorianMode = (): boolean => calMode === "gregorian";

export const GMONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const G_WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
// English calendars start the week on Monday
const G_WEEK_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const JMONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export const WEEKDAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

/** Normalize pg dates / ISO timestamps to canonical `YYYY-MM-DD`. */
export function asIsoDate(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

export function toJalaali(gy: number, gm: number, gd: number): [number, number, number] {
  let jy: number;
  if (gy <= 1600) {
    jy = 0;
    gy -= 621;
  } else {
    jy = 979;
    gy -= 1600;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    G_D_M[gm - 1]!;
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy <= 979) {
    gy = 621;
  } else {
    gy = 1600;
    jy -= 979;
  }
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const isLeapG = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const salA = [0, 31, isLeapG ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  for (gm = 1; gm <= 12; gm++) {
    const v = salA[gm]!;
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

export function isLeapJalaaliYear(jy: number): boolean {
  const g1 = toGregorian(jy, 1, 1);
  const g2 = toGregorian(jy + 1, 1, 1);
  const d1 = Date.UTC(g1[0], g1[1] - 1, g1[2]);
  const d2 = Date.UTC(g2[0], g2[1] - 1, g2[2]);
  return (d2 - d1) / 86400000 === 366;
}

export function daysInJalaaliMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

export function todayJalaali(): [number, number, number] {
  const t = new Date();
  return toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

export function isoToday(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function jalaaliToIso(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = toGregorian(jy, jm, jd);
  return `${String(gy).padStart(4, "0")}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function isoToJalaali(iso: string | Date | null | undefined): [number, number, number] | null {
  const day = asIsoDate(iso);
  if (!day) return null;
  const [gy, gm, gd] = day.split("-").map(Number);
  if (!gy || !gm || !gd) return null;
  return toJalaali(gy, gm, gd);
}

export function isoToJalaaliStr(iso: string | Date | null | undefined): string {
  if (calMode === "gregorian") return asIsoDate(iso) ?? "";
  const j = isoToJalaali(iso);
  if (!j) return "";
  return `${j[0]}/${String(j[1]).padStart(2, "0")}/${String(j[2]).padStart(2, "0")}`;
}

export function isoToJalaaliLong(iso: string | Date | null | undefined): string {
  if (calMode === "gregorian") {
    const day = asIsoDate(iso);
    if (!day) return "";
    const [gy, gm, gd] = day.split("-").map(Number) as [number, number, number];
    return `${G_WEEKDAYS_LONG[new Date(gy, gm - 1, gd).getDay()]} ${gd} ${GMONTHS[gm - 1]} ${gy}`;
  }
  const j = isoToJalaali(iso);
  if (!j) return "";
  const [jy, jm, jd] = j;
  const [gy, gm, gd] = toGregorian(jy, jm, jd);
  const jsDay = new Date(gy, gm - 1, gd).getDay();
  const weekday = WEEKDAY_NAMES[(jsDay + 1) % 7]!;
  return `${weekday} ${jd} ${JMONTHS[jm - 1]} ${jy}`;
}

export function weekdayOfJalaali(jy: number, jm: number, jd: number): number {
  const [gy, gm, gd] = toGregorian(jy, jm, jd);
  const jsDay = new Date(gy, gm - 1, gd).getDay();
  return (jsDay + 1) % 7;
}

export function isOverdue(due: string | Date | null | undefined, done: boolean): boolean {
  const day = asIsoDate(due);
  if (!day || done) return false;
  return day < isoToday();
}

export function addDaysIso(iso: string, days: number): string {
  const day = asIsoDate(iso) ?? iso;
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function formatRelativeFa(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return isoToJalaaliStr(iso);
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (calMode === "gregorian") {
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} h ago`;
    const dd = Math.round(h / 24);
    if (dd === 1) return "yesterday";
    if (dd < 7) return `${dd} days ago`;
    return isoToJalaaliStr(iso);
  }
  if (min < 1) return "همین حالا";
  if (min < 60) return `${min} دقیقه پیش`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ساعت پیش`;
  const day = Math.round(hr / 24);
  if (day === 1) return "دیروز";
  if (day < 7) return `${day} روز پیش`;
  return isoToJalaaliStr(iso);
}

export function formatTimeFa(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}


/** `YYYY-MM-DD` of a timestamp in the viewer's LOCAL time zone (asIsoDate uses UTC, which is a day off late in the evening in Iran). */
export function localDayIso(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "1405/07/21 14:35" in local time. */
export function formatDateTimeFa(iso: string | null | undefined): string {
  const day = localDayIso(iso);
  if (!day) return "";
  return `${isoToJalaaliStr(day)} ${formatTimeFa(iso)}`;
}

/** "امروز" / "دیروز" / "شنبه ۲۱ مهر ۱۴۰۵" for chat date separators. */
export function dayLabelFa(iso: string | null | undefined): string {
  const day = localDayIso(iso);
  if (!day) return "";
  const today = localDayIso(new Date());
  const english = calMode === "gregorian";
  if (day === today) return english ? "Today" : "امروز";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (day === localDayIso(y)) return english ? "Yesterday" : "دیروز";
  return isoToJalaaliLong(day);
}

// ---- calendar grid helpers that follow the active calendar (Jalali or Gregorian) ----

const pad2 = (n: number) => String(n).padStart(2, "0");

export const calMonths = (): readonly string[] => (calMode === "gregorian" ? GMONTHS : JMONTHS);

/** Column titles of a month grid, in the order the week is drawn. */
export const calWeekdays = (): readonly string[] => (calMode === "gregorian" ? G_WEEK_MON_FIRST : WEEKDAY_NAMES);

/** Today as [year, month, day] in the active calendar. */
export function calToday(): [number, number, number] {
  const t = new Date();
  return calMode === "gregorian" ? [t.getFullYear(), t.getMonth() + 1, t.getDate()] : todayJalaali();
}

export function calDaysInMonth(y: number, m: number): number {
  return calMode === "gregorian" ? new Date(y, m, 0).getDate() : daysInJalaaliMonth(y, m);
}

/** Column (0-6) of the 1st of the month: Saturday-first for Jalali, Monday-first for Gregorian. */
export function calFirstColumn(y: number, m: number): number {
  return calMode === "gregorian" ? (new Date(y, m - 1, 1).getDay() + 6) % 7 : weekdayOfJalaali(y, m, 1);
}

export function calToIso(y: number, m: number, d: number): string {
  return calMode === "gregorian" ? `${String(y).padStart(4, "0")}-${pad2(m)}-${pad2(d)}` : jalaaliToIso(y, m, d);
}

export function calFromIso(iso: string | Date | null | undefined): [number, number, number] | null {
  if (calMode !== "gregorian") return isoToJalaali(iso);
  const day = asIsoDate(iso);
  if (!day) return null;
  const [y, m, d] = day.split("-").map(Number);
  return y && m && d ? [y, m, d] : null;
}

/** A number in the digits of the active language (۱۲ in Persian, 12 in English). */
export const calNum = (n: number): string => (calMode === "gregorian" ? String(n) : n.toLocaleString("fa-IR", { useGrouping: false }));
