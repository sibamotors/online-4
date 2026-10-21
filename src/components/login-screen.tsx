import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Flame,
  History,
  KeyRound,
  LayoutGrid,
  Lock,
  MessageSquare,
  Palette,
  Shield,
  ShieldCheck,
  Target,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { useLocalSession } from "@/lib/local-session";
import { useTranslation } from "@/lib/i18n";
import { AppearancePanel } from "@/components/appearance-panel";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginScreen() {
  const { login, completePinLogin } = useLocalSession();
  const { lang } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [pinTicket, setPinTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    try {
      const last = localStorage.getItem("sibamotor-last-user");
      if (last) setUsername(last);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const isEn = lang === "en";

  const FEATURES = [
    {
      icon: LayoutGrid,
      title: isEn ? "Kanban board" : "تخته کانبان",
      desc: isEn ? "Columns, cards, checklists and links between tasks" : "ستون، کارت، چک‌لیست و وابستگی بین کارها",
    },
    {
      icon: Target,
      title: isEn ? "Scrum" : "اسکرام",
      desc: isEn ? "Sprints, backlog and story points" : "اسپرینت، بک‌لاگ و امتیاز کارها",
    },
    {
      icon: CalendarDays,
      title: isEn ? "Calendar and Gantt" : "تقویم و گانت",
      desc: isEn ? "Tasks and deadlines on a Jalali calendar and a timeline" : "کارها و مهلت‌ها روی تقویم شمسی و نمودار زمانی",
    },
    {
      icon: FileText,
      title: isEn ? "Work reports" : "گزارش کار",
      desc: isEn ? "Send a report to a manager and follow its status" : "ارسال گزارش به مدیر و پیگیری وضعیت آن",
    },
    {
      icon: MessageSquare,
      title: isEn ? "Messages" : "پیام‌ها",
      desc: isEn ? "Direct messages, groups and file sharing" : "پیام مستقیم، گروه و ارسال فایل",
    },
    {
      icon: History,
      title: isEn ? "Change history" : "سابقه تغییرات",
      desc: isEn ? "Who changed what, and when" : "اینکه چه کسی، چه زمانی، چه چیزی را تغییر داده",
    },
  ];

  const TRUST = [
    { icon: ShieldCheck, label: isEn ? "Secure session" : "نشست امن" },
    { icon: KeyRound, label: isEn ? "Optional PIN" : "پین اختیاری" },
    { icon: Activity, label: isEn ? "Activity log" : "ثبت رخدادها" },
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (pinTicket) {
        const res = await completePinLogin(pinTicket, pin);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        void navigate({ to: "/" });
        return;
      }

      const result = await login(username, password);
      if (!result.ok) {
        if (result.ticket) {
          setPinTicket(result.ticket);
          return;
        }
        setError(result.error);
        return;
      }
      try {
        if (remember)
          localStorage.setItem("sibamotor-last-user", username.trim());
        else localStorage.removeItem("sibamotor-last-user");
      } catch {
        /* ignore */
      }
      void navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--k-bg,#0b0d12)] text-fg" dir={isEn ? "ltr" : "rtl"}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="k-wallpaper absolute inset-0 opacity-80" />
        <div
          className="absolute -top-32 -start-24 size-[30rem] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 55%, transparent), transparent 70%)",
            animation: "floatA 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-40 -end-20 size-[34rem] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, #38bdf8 40%, transparent), transparent 70%)",
            animation: "floatB 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/3 start-1/2 size-72 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, #a78bfa 35%, transparent), transparent 70%)",
            animation: "floatC 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(var(--k-fg) 1px, transparent 1px), linear-gradient(90deg, var(--k-fg) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 24px) scale(1.08); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-32px, -20px) scale(1.05); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(-50%, 0); opacity: 0.15; }
          50% { transform: translate(-50%, 16px); opacity: 0.28; }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        .login-float { animation: loginFloat 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .login-float, .login-rise { animation: none; } }
        .login-rise { animation: riseIn 0.55s ease-out both; }
        .login-rise-delay-1 { animation-delay: 0.08s; }
        .login-rise-delay-2 { animation-delay: 0.16s; }
        .login-rise-delay-3 { animation-delay: 0.24s; }
      `}</style>

      {/* Top action buttons */}
      <div className="absolute end-4 top-4 z-20 flex items-center gap-2">
        <LanguageSwitch />
        <button
          type="button"
          onClick={() => setAppearanceOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border/80 bg-bg-elevated/70 px-3.5 text-[13px] font-medium text-muted backdrop-blur-md transition hover:border-border-strong hover:text-fg"
          aria-label="Appearance"
          title={isEn ? "Appearance" : "شخصی‌سازی ظاهر"}
        >
          <Palette className="size-4 text-accent" />
          <span className="hidden sm:inline">{isEn ? "Appearance" : "شخصی‌سازی ظاهر"}</span>
        </button>
      </div>

      <div className="relative z-10 mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-4 py-10 lg:grid-cols-12 lg:gap-12">
        <section className="hidden lg:col-span-7 lg:block">
          <div className="login-rise flex items-center gap-3.5">
            <LogoMark className="size-12 shadow-lg" />
            <div>
              <p className="text-xl font-bold tracking-tight">{APP_NAME}</p>
              <p className="mt-0.5 text-[12px] text-muted">{APP_TAGLINE}</p>
            </div>
          </div>

          <h1 className="login-rise login-rise-delay-1 mt-7 text-3xl font-bold leading-[1.3] tracking-tight xl:text-[40px]">
            {isEn ? "Advanced Project Planning," : "کار تیمی، برنامه‌ریزی دقیق"}
            <br />
            <span className="bg-gradient-to-l from-accent via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              {isEn ? "Tracking & Management" : "و پیگیری مرتب پروژه‌ها"}
            </span>
          </h1>
          <p className="login-rise login-rise-delay-1 mt-3.5 max-w-xl text-[14px] leading-7 text-muted">
            {isEn
              ? "Boards, sprints, calendar, work reports and internal messages, so planning, warehouse and purchasing stay in sync."
              : "تخته کار، اسپرینت، تقویم، گزارش کار و پیام داخلی؛ برای اینکه برنامه‌ریزی، انبار و تدارکات هماهنگ بمانند."}
          </p>

          <ul className="login-rise login-rise-delay-3 mt-7 grid grid-cols-2 gap-2.5 xl:grid-cols-3">
            {FEATURES.map((h) => (
              <li
                key={h.title}
                className="group rounded-2xl border border-border/70 bg-bg-elevated/45 p-3 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-bg-elevated/80"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent transition group-hover:scale-110">
                    <h.icon className="size-4" />
                  </span>
                  <p className="text-[12.5px] font-semibold text-fg/95">{h.title}</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-muted">
                  {h.desc}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="login-rise login-rise-delay-3 mx-auto w-full max-w-[430px] lg:col-span-5">
          <div className="rounded-3xl border border-border/80 bg-bg-elevated/85 p-6 shadow-[0_28px_90px_-24px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <LogoMark className="size-10" />
              <div>
                <h1 className="font-bold">{APP_NAME}</h1>
                <p className="text-[12px] text-muted">{APP_TAGLINE}</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">
                {pinTicket
                  ? (isEn ? "Enter your PIN" : "وارد کردن پین")
                  : (isEn ? "Sign in" : "ورود")}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {pinTicket
                  ? (isEn ? "Enter the 4 to 8 digit PIN of your account." : "پین ۴ تا ۸ رقمی حساب خود را وارد کنید.")
                  : (isEn ? "Enter your username and password." : "نام کاربری و رمز عبور خود را وارد کنید.")}
              </p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <Label htmlFor="username" className="text-[12.5px] font-medium">
                  {isEn ? "Username" : "نام کاربری"}
                </Label>
                <div className="relative mt-1.5" dir="ltr">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                  <Input
                    id="username"
                    autoComplete="username"
                    required
                    className="h-11 px-10 text-[14px]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    dir="ltr"
                    disabled={Boolean(pinTicket)}
                    placeholder="e.g. a.abbasi"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[12.5px] font-medium">
                    {isEn ? "Password" : "رمز عبور"}
                  </Label>
                </div>
                <div className="relative mt-1.5" dir="ltr">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    required={!pinTicket}
                    className="h-11 px-10 text-[14px]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsOn(false)}
                    dir="ltr"
                    disabled={Boolean(pinTicket)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-subtle transition hover:bg-surface-2 hover:text-fg"
                    onClick={() => setShowPass((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {capsOn && !pinTicket && (
                <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-1.5 text-[12px] text-warning">
                  <span>{isEn ? "⚠️ Caps Lock is on." : "⚠️ کلید Caps Lock روشن است؛ به بزرگی و کوچکی حروف دقت کنید."}</span>
                </div>
              )}

              {!pinTicket && (
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted select-none hover:text-fg">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="size-4 rounded accent-[var(--k-accent)]"
                    />
                    {isEn ? "Remember username on this device" : "خاطر داشتن نام کاربری در این دستگاه"}
                  </label>
                </div>
              )}

              {pinTicket && (
                <div className="rounded-xl border border-accent/35 bg-accent-soft/40 p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-accent">
                    <Shield className="size-4" />
                    {isEn ? "Two-factor protection is active" : "حفاظت دومرحله‌ای فعال است"}
                  </div>
                  <Label htmlFor="pin">{isEn ? "Security PIN (4-8 digits)" : "پین امنیتی (۴ تا ۸ رقم)"}</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    className="mt-1.5 h-11 text-center text-lg tracking-[0.4em]"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    dir="ltr"
                    placeholder="••••"
                    autoFocus
                  />
                </div>
              )}

              {error && (
                <div
                  className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-danger"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="mt-2 h-11 w-full gap-2 text-[14px] font-semibold shadow-md transition hover:opacity-95"
                disabled={busy}
              >
                <span>
                  {busy
                    ? (isEn ? "Signing in…" : "در حال ورود…")
                    : pinTicket
                      ? (isEn ? "Verify PIN" : "تأیید پین")
                      : (isEn ? "Sign in" : "ورود")}
                </span>
                {!busy && <ArrowLeft className="size-4" />}
              </Button>

              {pinTicket && (
                <button
                  type="button"
                  className="w-full pt-1 text-center text-[12px] text-muted transition hover:text-fg"
                  onClick={() => {
                    setPinTicket(null);
                    setPin("");
                    setError(null);
                  }}
                >
                  {isEn ? "Back" : "بازگشت"}
                </button>
              )}
            </form>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/70 pt-4">
              {TRUST.map((t) => (
                <li
                  key={t.label}
                  className="flex items-center gap-1.5 text-[11px] text-muted"
                >
                  <t.icon className="size-3.5 text-accent" />
                  {t.label}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-center text-[11.5px] font-medium leading-relaxed text-subtle">
              Designed & Developed · Sep 2026 · Abbasi & Mojarrad
            </p>
          </div>

          <p className="mt-4 text-center text-[11.5px] text-subtle/85">
            {isEn ? "Forgot your password or need an account? Ask the system administrator." : "رمز را فراموش کرده‌اید یا حساب نیاز دارید؟ با مدیر سامانه تماس بگیرید."}
          </p>
        </section>
      </div>

      <AppearancePanel open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </div>
  );
}
