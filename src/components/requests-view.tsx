import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { isoToJalaaliStr } from "@/lib/jalali";
import { listMyApprovals } from "@/lib/approvals";
import { listMyRequests, listRequestForms, submitRequest, type RequestForm } from "@/lib/requests";
import { cn } from "@/lib/utils";
import { JalaliPicker } from "./jalali-picker";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const selectCls = "h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm";

/** Request forms anyone can fill in, and the status of the requests I already made. */
export function RequestsView() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const [active, setActive] = useState<RequestForm | null>(null);
  const formsQ = useQuery({ queryKey: ["request-forms"], queryFn: () => listRequestForms() });
  const mineQ = useQuery({ queryKey: ["my-requests"], queryFn: () => listMyRequests(), refetchInterval: 60_000 });
  const approvalsQ = useQuery({ queryKey: ["my-approvals"], queryFn: () => listMyApprovals(), refetchInterval: 60_000 });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 pb-24">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{L("درخواست‌ها", "Requests")}</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          {L("یک فرم را پر کنید تا برایتان کارت ساخته شود و مسئولش خبردار شود.", "Fill in a form and a card is created and its owner is notified.")}
        </p>
      </header>

      {(approvalsQ.data ?? []).length > 0 && (
        <section className="rounded-xl border border-warning/40 bg-warning/5 p-4">
          <h2 className="mb-2 text-sm font-semibold">{L("منتظر تأیید شما", "Waiting for your approval")}</h2>
          <ul className="divide-y divide-border">
            {approvalsQ.data!.map((a) => (
              <li key={a.cardId} className="py-2 text-[13px]">
                <Link to="/b/$boardId" params={{ boardId: a.boardId }} className="font-medium hover:text-accent">
                  {a.cardTitle}
                </Link>
                <span className="block text-[11px] text-subtle">
                  {a.boardTitle} · {L("از", "from")} {a.requestedByName}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {(formsQ.data ?? []).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActive(f)}
            className="rounded-xl border border-border p-4 text-start transition-colors hover:bg-accent-soft/50"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4 text-accent" />
              {f.title}
            </p>
            {f.description && <p className="mt-1 text-[12px] text-muted">{f.description}</p>}
          </button>
        ))}
        {formsQ.data?.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted">
            {L("هنوز فرمی تعریف نشده. مدیر سامانه می‌تواند از بخش مدیریت فرم بسازد.", "No forms yet. An administrator can create them in the admin area.")}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-2 text-sm font-semibold">{L("درخواست‌های من", "My requests")}</h2>
        {(mineQ.data ?? []).length === 0 ? (
          <p className="text-[13px] text-muted">{L("هنوز درخواستی نفرستاده‌اید.", "You have not sent any request yet.")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {mineQ.data!.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                <div className="min-w-0 flex-1">
                  {r.cardTitle ? (
                    <Link to="/b/$boardId" params={{ boardId: r.boardId }} className="block truncate font-medium hover:text-accent">
                      {r.cardTitle}
                    </Link>
                  ) : (
                    <span className="block truncate text-muted">{L("کارت حذف شده", "Card removed")}</span>
                  )}
                  <span className="text-[11px] text-subtle">
                    {r.formTitle} · {isoToJalaaliStr(r.createdAt)}
                  </span>
                </div>
                {r.status && (
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", r.done ? "bg-success/15 text-success" : "bg-surface-2 text-muted")}>
                    {r.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {active && <FillForm key={active.id} form={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function FillForm({ form, onClose }: { form: RequestForm; onClose: () => void }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (id: string, v: string) => setValues((s) => ({ ...s, [id]: v }));

  const mut = useMutation({
    mutationFn: () => submitRequest({ data: { formId: form.id, values } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(L("درخواست ثبت شد.", "Request sent."));
        void qc.invalidateQueries({ queryKey: ["my-requests"] });
        void qc.invalidateQueries({ queryKey: ["boards"] });
        onClose();
      } else toast.error(r.error);
    },
    onError: () => toast.error(L("ارسال نشد؛ دوباره تلاش کنید.", "Could not send; try again.")),
  });

  const missing = form.fields.some((f) => f.required && !(values[f.id] ?? "").trim());

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle>{form.title}</DialogTitle>
        {form.description && <DialogDescription>{form.description}</DialogDescription>}
        <div className="mt-3 space-y-3">
          {form.fields.map((f) => (
            <div key={f.id}>
              <label className="text-[12px] text-muted" htmlFor={`f-${f.id}`}>
                {f.label}
                {f.required && <span className="text-danger"> *</span>}
              </label>
              {f.type === "text" && <Input id={`f-${f.id}`} className="mt-1" maxLength={200} value={values[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} />}
              {f.type === "longtext" && <Textarea id={`f-${f.id}`} className="mt-1" rows={4} maxLength={2000} value={values[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} />}
              {f.type === "number" && <Input id={`f-${f.id}`} className="mt-1" inputMode="decimal" value={values[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} />}
              {f.type === "select" && (
                <select id={`f-${f.id}`} className={`${selectCls} mt-1`} value={values[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)}>
                  <option value="">{L("انتخاب کنید…", "Choose…")}</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
              {f.type === "date" && (
                <div className="mt-1">
                  <JalaliPicker value={values[f.id] || null} onChange={(iso) => set(f.id, iso ?? "")} />
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" disabled={mut.isPending || missing} onClick={() => mut.mutate()}>
              {mut.isPending ? L("در حال ارسال…", "Sending…") : L("ارسال درخواست", "Send request")}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {L("انصراف", "Cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
