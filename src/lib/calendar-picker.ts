/** Gregorian calendar helpers used by the English date picker. Values remain ISO dates. */
export function isoToGregorianParts(iso: string | null | undefined): [number, number, number] | null {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(y, m - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null;
  return [y, m, d];
}

export function gregorianToIso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Sunday-based weekday offset for a Gregorian month (0 = Sunday). */
export function gregorianMonthWeekdayOffset(y: number, m: number): number {
  return new Date(y, m - 1, 1).getDay();
}

/** Number of days in a Gregorian month, including leap-year February. */
export function gregorianMonthDays(y: number, m: number): number {
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new RangeError("Month must be between 1 and 12");
  return new Date(y, m, 0).getDate();
}
