import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createBaleLinkCode, getBaleStatus, setBaleNotify, unlinkBale } from "@/lib/bale";
import { useTranslation } from "@/lib/i18n";
import { Button } from "./ui/button";

/** "Notifications in Bale" block of the profile dialog. Renders nothing when the server has no bot. */
export function BaleConnect() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const qc = useQueryClient();
  const [pending, setPending] = useState<{ code: string; link: string | null } | null>(null);

  const statusQ = useQuery({
    queryKey: ["bale-status"],
    queryFn: () => getBaleStatus(),
    // while a code is waiting, check every 3 s whether the user has sent it to the bot
    refetchInterval: pending ? 3000 : false,
  });
  const status = statusQ.data;
  const refresh = () => void qc.invalidateQueries({ queryKey: ["bale-status"] });

  const codeMut = useMutation({
    mutationFn: () => createBaleLinkCode(),
    onSuccess: (r) => {
      if (r.ok) setPending({ code: r.code, link: r.link });
      else toast.error(r.error);
    },
    onError: () => toast.error(L("ساخت کد ناموفق بود.", "Could not create a code.")),
  });
  const notifyMut = useMutation({ mutationFn: (on: boolean) => setBaleNotify({ data: { on } }), onSuccess: refresh });
  const unlinkMut = useMutation({
    mutationFn: () => unlinkBale(),
    onSuccess: () => {
      setPending(null);
      refresh();
    },
  });

  if (!status?.configured) return null;
  // once the bot confirmed the link, the waiting code is no longer relevant
  const waiting = status.linked ? null : pending;

  return (
    <div className="mt-2 w-full rounded-xl border border-border p-3 text-start">
      <p className="flex items-center gap-2 text-[13px] font-semibold">
        <BellRing className="size-4 text-accent" />
        {L("اعلان در بله", "Notifications in Bale")}
      </p>

      {status.linked ? (
        <div className="mt-2 space-y-2">
          <p className="text-[12px] text-muted">{L("حساب شما به بله متصل است.", "Your account is connected to Bale.")}</p>
          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={status.notify}
              disabled={notifyMut.isPending}
              onChange={(e) => notifyMut.mutate(e.target.checked)}
            />
            {L("ارسال اعلان‌ها به بله", "Send notifications to Bale")}
          </label>
          <Button size="sm" variant="secondary" className="text-danger" disabled={unlinkMut.isPending} onClick={() => unlinkMut.mutate()}>
            {L("قطع اتصال", "Disconnect")}
          </Button>
        </div>
      ) : waiting ? (
        <div className="mt-2 space-y-2">
          <p className="text-[12px] text-muted">
            {L("این کد را برای ربات بله بفرستید (۱۵ دقیقه اعتبار دارد):", "Send this code to the Bale bot (valid for 15 minutes):")}
          </p>
          <p dir="ltr" className="select-all rounded-lg bg-accent-soft py-2 text-center font-mono text-lg tracking-[0.3em]">
            {waiting.code}
          </p>
          {waiting.link && (
            <a
              href={waiting.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {L("باز کردن ربات در بله", "Open the bot in Bale")}
            </a>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-[12px] text-muted">
            {L(
              "ارجاع‌ها، مهلت کارها و گزارش‌های جدید را در بله هم دریافت کنید.",
              "Get assignments, due dates and new reports in Bale too.",
            )}
          </p>
          <Button size="sm" disabled={codeMut.isPending} onClick={() => codeMut.mutate()}>
            {L("دریافت کد اتصال", "Get a link code")}
          </Button>
        </div>
      )}
    </div>
  );
}
