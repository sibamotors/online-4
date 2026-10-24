import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { setCalendarMode } from "@/lib/jalali";
import { PHRASES } from "@/lib/i18n-dict";
import { applyTemplates, latinDigits, replaceCalendarTokens, translateCalendar } from "@/lib/i18n-patterns";

export type Lang = "fa" | "en";
const STORAGE_KEY = "sibamotor-lang";

const dict = new Map<string, string>();
for (const [k, v] of Object.entries(PHRASES)) dict.set(normKey(k), v);

export function normKey(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Translate a Persian UI string. Unknown text is returned unchanged. */
export function translatePhrase(raw: string, lang: Lang): string {
  if (lang !== "en" || !raw) return raw;
  if (!/[\u0600-\u06FF]/.test(raw)) return raw;
  const lead = raw.match(/^\s*/)?.[0] ?? "";
  const trailLen = raw.match(/\s*$/)?.[0].length ?? 0;
  const end = trailLen ? raw.length - trailLen : raw.length;
  const core = raw.slice(lead.length, end);
  const key = normKey(core);
  const exact = dict.get(key);
  const trail = trailLen ? raw.slice(end) : "";
  if (exact) return lead + latinDigits(exact) + trail;
  const templ = applyTemplates(key);
  if (templ) return lead + replaceCalendarTokens(templ) + trail;
  const cal = translateCalendar(key);
  if (cal) return lead + cal + trail;
  // Digits-only counts (۱۲ / ۱۲٫۵٪) still follow the active language.
  if (/^[0-9۰-۹٬،,.\s%٪+\-–—:/()]+$/.test(key)) return lead + latinDigits(key) + trail;
  return raw;
}

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (fa: string) => string;
};

const LanguageContext = createContext<LangContextType>({
  lang: "fa",
  setLang: () => {},
  t: (s) => s,
});

function applyDocumentLang(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  document.documentElement.dataset.lang = lang;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fa");
  // every date on screen follows the language: Persian calendar in Persian, Gregorian in English
  setCalendarMode(lang === "en" ? "gregorian" : "jalali");

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    applyDocumentLang(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useLayoutEffect(() => {
    let saved: Lang = "fa";
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "en" || v === "fa") saved = v;
    } catch {
      /* ignore */
    }
    setLangState(saved);
    applyDocumentLang(saved);
  }, []);

  const t = useCallback((fa: string) => translatePhrase(fa, lang), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}
