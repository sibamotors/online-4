/** Locale-aware number and date formatting shared by the bilingual UI. */
export type UiLanguage = "fa" | "en";

export function numberLocale(lang: UiLanguage): string {
  return lang === "fa" ? "fa-IR" : "en-US";
}

export function formatNumber(value: number, lang: UiLanguage, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(numberLocale(lang), options).format(value);
}

export function dateLocale(lang: UiLanguage): string {
  // English UI uses Gregorian dates; Persian UI uses the Persian calendar.
  return lang === "fa" ? "fa-IR-u-ca-persian" : "en-US-u-ca-gregory";
}

export function formatDate(value: Date | string | number, lang: UiLanguage, options: Intl.DateTimeFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(dateLocale(lang), { year: "numeric", month: "short", day: "numeric", ...options }).format(date);
}

export function formatDateTime(value: Date | string | number, lang: UiLanguage, options: Intl.DateTimeFormatOptions = {}): string {
  return formatDate(value, lang, { hour: "2-digit", minute: "2-digit", ...options });
}
