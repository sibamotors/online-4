import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createApiToken,
  createWebhook,
  deleteWebhook,
  listApiTokens,
  listWebhooks,
  revokeApiToken,
  setWebhookEnabled,
  testWebhook,
} from "@/lib/api-admin";
import { useTranslation } from "@/lib/i18n";
import { isoToJalaaliStr } from "@/lib/jalali";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const EVENTS: [string, string, string][] = [
  ["*", "همه‌ی رویدادها", "All events"],
  ["card.*", "هر تغییر کارت", "Any card change"],
  ["card.create", "ساخته‌شدن کارت", "Card created"],
  ["card.move", "جابه‌جایی کارت", "Card moved"],
  ["approval.*", "تأییدها", "Approvals"],
  ["report.*", "گزارش‌ها", "Reports"],
];

const copy = (text: string, ok: string) => void navigator.clipboard?.writeText(text).then(() => toast.success(ok), () => toast.error("copy failed"));

/** Admin: API tokens for other software, and webhooks that tell other software about changes. */
export function ApiAdminPanel() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const qc = useQueryClient();
  const tokensQ = useQuery({ queryKey: ["api-tokens"], queryFn: () => listApiTokens() });
  const hooksQ = useQuery({ queryKey: ["webhooks"], queryFn: () => listWebhooks() });
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read" | "write">("read");
  const [shown, setShown] = useState<{ kind: "token" | "secret"; value: string } | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["*"]);

  const tokenMut = useMutation({
    mutationFn: () => createApiToken({ data: { name: name.trim(), scope } }),
    onSuccess: (r) => {
      setName("");
      setShown({ kind: "token", value: r.token });
      void qc.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: () => toast.error(L("ساخته نشد.", "Could not create.")),
  });
  const revokeMut = useMutation({ mutationFn: (id: string) => revokeApiToken({ data: { id } }), onSuccess: () => void qc.invalidateQueries({ queryKey: ["api-tokens"] }) });
  const hookMut = useMutation({
    mutationFn: () => createWebhook({ data: { url: url.trim(), events } }),
    onSuccess: (r) => {
      if (r.ok) {
        setUrl("");
        setShown({ kind: "secret", value: r.secret });
        void qc.invalidateQueries({ queryKey: ["webhooks"] });
      } else toast.error(r.error);
    },
    onError: () => toast.error(L("ساخته نشد.", "Could not create.")),
  });
  const toggleMut = useMutation({ mutationFn: (v: { id: string; enabled: boolean }) => setWebhookEnabled({ data: v }), onSuccess: () => void qc.invalidateQueries({ queryKey: ["webhooks"] }) });
  const delMut = useMutation({ mutationFn: (id: string) => deleteWebhook({ data: { id } }), onSuccess: () => void qc.invalidateQueries({ queryKey: ["webhooks"] }) });
  const testMut = useMutation({
    mutationFn: (id: string) => testWebhook({ data: { id } }),
    onSuccess: (r) => {
      toast(L(`پاسخ سرور: ${r.status}`, `Server answered: ${r.status}`));
      void qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  return (
    <div className="space-y-4">
      {shown && (
        <div className="rounded-xl border border-warning/50 bg-warning/5 p-3 text-[13px]">
          <p className="font-semibold">
            {shown.kind === "token" ? L("توکن شما (فقط همین یک بار نمایش داده می‌شود)", "Your token (shown only once)") : L("کلید امضای وب‌هوک (فقط همین یک بار)", "Webhook signing secret (shown only once)")}
          </p>
          <p dir="ltr" className="mt-2 break-all rounded-lg bg-surface-2 p-2 font-mono text-[12px]">
            {shown.value}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => copy(shown.value, L("کپی شد.", "Copied."))}>
              <Copy className="size-4" />
              {L("کپی", "Copy")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShown(null)}>
              {L("ذخیره کردم", "I saved it")}
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-2 rounded-xl border border-border p-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-accent" />
          {L("توکن‌های API", "API tokens")}
        </p>
        <p className="text-[12px] text-muted">
          {L(
            "برای اتصال نرم‌افزار دیگر. با هدر Authorization: Bearer … به آدرس‌های /api/v1/boards و /api/v1/boards/{id}/cards دسترسی می‌دهد. از توکن «فقط خواندن» برای گزارش‌گیری و از «نوشتن» برای ساخت کارت استفاده کنید.",
            "For connecting other software. Use the header Authorization: Bearer … on /api/v1/boards and /api/v1/boards/{id}/cards. Use a read-only token for reporting and a write token to create cards.",
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Input className="w-48" value={name} maxLength={60} placeholder={L("نام (مثلاً «گزارش مدیریتی»)", "Name")} onChange={(e) => setName(e.target.value)} />
          <select className="h-10 rounded-lg border border-border bg-surface px-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value as "read" | "write")}>
            <option value="read">{L("فقط خواندن", "Read only")}</option>
            <option value="write">{L("خواندن و ساخت کارت", "Read and create cards")}</option>
          </select>
          <Button disabled={!name.trim() || tokenMut.isPending} onClick={() => tokenMut.mutate()}>
            <Plus className="size-4" />
            {L("ساخت توکن", "Create token")}
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {(tokensQ.data ?? []).map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2 text-[13px]">
              <div className="min-w-0 flex-1">
                <p className={t.revoked ? "text-muted line-through" : "font-medium"}>{t.name}</p>
                <p dir="ltr" className="text-start text-[11px] text-subtle">
                  {t.prefix}… · {t.scope} · {t.lastUsedAt ? `${L("آخرین استفاده", "last used")} ${isoToJalaaliStr(t.lastUsedAt)}` : L("هنوز استفاده نشده", "never used")}
                </p>
              </div>
              {!t.revoked && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => window.confirm(L(`توکن «${t.name}» باطل شود؟`, `Revoke “${t.name}”?`)) && revokeMut.mutate(t.id)}
                >
                  {L("باطل کردن", "Revoke")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-border p-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <WebhookIcon className="size-4 text-accent" />
          {L("وب‌هوک‌ها", "Webhooks")}
        </p>
        <p className="text-[12px] text-muted">
          {L(
            "هر وقت چیزی تغییر کند، یک درخواست POST (JSON) به آدرس شما فرستاده می‌شود. هدر X-Sibamotor-Signature حاوی امضای HMAC-SHA256 بدنه با کلید مخصوص است. فقط آدرس‌های عمومی اینترنت پذیرفته می‌شوند. رویدادهای حساب و امنیت ارسال نمی‌شوند.",
            "When something changes, a POST (JSON) is sent to your URL. The X-Sibamotor-Signature header holds the HMAC-SHA256 of the body. Only public internet addresses are accepted. Account and security events are never sent.",
          )}
        </p>
        <Input dir="ltr" value={url} placeholder="https://example.com/hook" onChange={(e) => setUrl(e.target.value)} />
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {EVENTS.map(([key, fa, en]) => (
            <label key={key} className="flex items-center gap-1.5 text-[12px]">
              <input type="checkbox" checked={events.includes(key)} onChange={(e) => setEvents(e.target.checked ? [...events, key] : events.filter((x) => x !== key))} />
              {L(fa, en)}
            </label>
          ))}
        </div>
        <Button disabled={!url.trim() || events.length === 0 || hookMut.isPending} onClick={() => hookMut.mutate()}>
          <Plus className="size-4" />
          {L("افزودن وب‌هوک", "Add webhook")}
        </Button>
        <ul className="divide-y divide-border">
          {(hooksQ.data ?? []).map((h) => (
            <li key={h.id} className="flex items-center gap-2 py-2 text-[13px]">
              <div className="min-w-0 flex-1">
                <p dir="ltr" className="truncate text-start font-medium">
                  {h.url}
                </p>
                <p className="text-[11px] text-subtle">
                  {h.events.join("، ")} · {h.lastStatus ? `${L("آخرین نتیجه", "last result")}: ${h.lastStatus}` : L("هنوز ارسالی نبوده", "nothing sent yet")}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-[12px]">
                <input type="checkbox" checked={h.enabled} onChange={(e) => toggleMut.mutate({ id: h.id, enabled: e.target.checked })} />
                {L("فعال", "On")}
              </label>
              <Button size="sm" variant="secondary" disabled={testMut.isPending} onClick={() => testMut.mutate(h.id)}>
                {L("آزمایش", "Test")}
              </Button>
              <Button size="sm" variant="ghost" className="text-danger" aria-label={L("حذف", "Delete")} onClick={() => window.confirm(L("این وب‌هوک حذف شود؟", "Delete this webhook?")) && delMut.mutate(h.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
