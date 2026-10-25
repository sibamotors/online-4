import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { getPushStatus, removePushSubscription, savePushSubscription } from "@/lib/push";
import { arrayBufferToBase64Url, canInstall, isIos, isStandalone, promptInstall, subscribeInstall, urlBase64ToUint8Array } from "@/lib/pwa";
import { Button } from "./ui/button";

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Profile block: install the app, and get notifications on this device. */
export function PushConnect() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const qc = useQueryClient();
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);
  const [here, setHere] = useState<boolean | null>(null); // is THIS device subscribed?
  const [permission, setPermission] = useState<NotificationPermission | "none">("none");

  const statusQ = useQuery({ queryKey: ["push-status"], queryFn: () => getPushStatus() });
  const status = statusQ.data;

  async function refreshHere() {
    if (!supported()) return;
    setPermission(Notification.permission);
    const reg = await navigator.serviceWorker.getRegistration();
    setHere(Boolean(reg && (await reg.pushManager.getSubscription())));
  }
  useEffect(() => {
    void refreshHere();
  }, []);

  const enable = useMutation({
    mutationFn: async () => {
      if (!status?.publicKey) throw new Error("not configured");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("denied");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(status.publicKey) });
      const res = await savePushSubscription({
        data: {
          endpoint: sub.endpoint,
          p256dh: arrayBufferToBase64Url(sub.getKey("p256dh")),
          auth: arrayBufferToBase64Url(sub.getKey("auth")),
          userAgent: navigator.userAgent.slice(0, 300),
        },
      });
      if (!res.ok) {
        await sub.unsubscribe();
        throw new Error(res.error ?? "save failed");
      }
    },
    onSuccess: () => {
      toast.success(L("اعلان روی این دستگاه فعال شد.", "Notifications are on for this device."));
      void refreshHere();
      void qc.invalidateQueries({ queryKey: ["push-status"] });
    },
    onError: (e) => {
      const m = e instanceof Error ? e.message : "";
      toast.error(m === "denied" ? L("اجازه‌ی اعلان داده نشد. از تنظیمات مرورگر فعالش کنید.", "Permission was not granted. Enable it in the browser settings.") : L("فعال نشد.", "Could not enable."));
    },
  });

  const disable = useMutation({
    mutationFn: async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await removePushSubscription({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
    },
    onSuccess: () => {
      void refreshHere();
      void qc.invalidateQueries({ queryKey: ["push-status"] });
    },
  });

  const standalone = isStandalone();
  const showInstall = !standalone && (installable || isIos());
  const showPush = Boolean(status?.configured);
  if (!showInstall && !showPush) return null;

  return (
    <div className="mt-2 w-full rounded-xl border border-border p-3 text-start">
      <p className="flex items-center gap-2 text-[13px] font-semibold">
        <Smartphone className="size-4 text-accent" />
        {L("برنامه‌ی نصبی و اعلان روی دستگاه", "Installed app and device notifications")}
      </p>

      {showInstall && (
        <div className="mt-2 space-y-1.5">
          {installable ? (
            <Button size="sm" variant="secondary" onClick={() => void promptInstall()}>
              {L("نصب برنامه روی این دستگاه", "Install the app on this device")}
            </Button>
          ) : (
            <p className="text-[12px] text-muted">
              {L("برای نصب در آیفون: دکمه‌ی Share (اشتراک‌گذاری) و بعد «Add to Home Screen».", "To install on iPhone: tap Share, then “Add to Home Screen”.")}
            </p>
          )}
        </div>
      )}

      {showPush && (
        <div className="mt-2 space-y-1.5">
          {!supported() ? (
            <p className="text-[12px] text-muted">
              {isIos()
                ? L("در آیفون اعلان فقط بعد از نصب برنامه (Add to Home Screen) و باز کردن آن از صفحه‌ی اصلی کار می‌کند.", "On iPhone, notifications only work after installing the app (Add to Home Screen) and opening it from the home screen.")
                : L("این مرورگر از اعلان پشتیبانی نمی‌کند.", "This browser does not support notifications.")}
            </p>
          ) : here ? (
            <>
              <p className="text-[12px] text-muted">{L("اعلان روی این دستگاه فعال است.", "Notifications are on for this device.")}</p>
              <Button size="sm" variant="secondary" disabled={disable.isPending} onClick={() => disable.mutate()}>
                {L("غیرفعال‌سازی روی این دستگاه", "Turn off on this device")}
              </Button>
            </>
          ) : (
            <>
              <p className="text-[12px] text-muted">
                {L("منشن، تأیید، یادآوری مهلت و گزارش‌های جدید را حتی وقتی سایت بسته است دریافت کنید.", "Get mentions, approvals, due-date reminders and new reports even when the site is closed.")}
              </p>
              {permission === "denied" ? (
                <p className="text-[12px] text-danger">{L("اعلان در تنظیمات مرورگر بسته شده است.", "Notifications are blocked in the browser settings.")}</p>
              ) : (
                <Button size="sm" disabled={enable.isPending} onClick={() => enable.mutate()}>
                  {L("فعال‌سازی اعلان روی این دستگاه", "Turn on notifications on this device")}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
