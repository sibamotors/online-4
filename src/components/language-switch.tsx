import { cn } from "@/lib/utils";
import { useTranslation, type Lang } from "@/lib/i18n";

/** Explicit Persian / English choice. Kept out of the auto-translator. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useTranslation();
  const btn = (id: Lang, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setLang(id)}
      aria-pressed={lang === id}
      className={cn(
        "h-8 rounded-full px-3 text-[12.5px] font-semibold transition",
        lang === id ? "bg-accent text-white shadow-sm" : "text-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
  return (
    <div
      data-i18n-skip
      role="group"
      aria-label={lang === "en" ? "Language" : "زبان"}
      dir="ltr"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/80 bg-bg-elevated/80 p-0.5 shadow-sm backdrop-blur-md",
        className,
      )}
    >
      {btn("fa", "فارسی")}
      {btn("en", "English")}
    </div>
  );
}
