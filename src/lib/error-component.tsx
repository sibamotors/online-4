import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  // Server errors can carry internal details; only show the message in development.
  const detail = import.meta.env.DEV && error instanceof Error ? error.message : "";
  return (
    <main
      dir="rtl"
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">مشکلی پیش آمد</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {detail || "خطای غیرمنتظره‌ای رخ داد. صفحه را دوباره بارگذاری کنید."}
      </p>
    </main>
  );
}
