import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { cancelApproval, decideApproval, requestApproval } from "@/lib/approvals";
import { useTranslation } from "@/lib/i18n";
import { isoToJalaaliStr } from "@/lib/jalali";
import { useLocalSession } from "@/lib/local-session";
import { listLocalUsers } from "@/lib/local-users";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

/** "Please approve this card" — inside the card window. */
export function ApprovalPanel({ card }: { card: Card }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const { user, isAdmin } = useLocalSession();
  const qc = useQueryClient();
  const [approver, setApprover] = useState("");
  const [note, setNote] = useState("");
  const usersQ = useQuery({ queryKey: ["local-users"], queryFn: () => listLocalUsers() });
  const a = card.approval ?? null;

  const done = (r: { ok: boolean; error?: string }) => {
    if (r.ok) {
      setNote("");
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["my-approvals"] });
    } else toast.error(r.error ?? L("انجام نشد.", "Failed."));
  };
  const failed = () => toast.error(L("انجام نشد؛ دسترسی یا اتصال را بررسی کنید.", "Failed; check your permission or connection."));
  const askMut = useMutation({ mutationFn: () => requestApproval({ data: { cardId: card.id, approverUsername: approver } }), onSuccess: done, onError: failed });
  const decideMut = useMutation({
    mutationFn: (decision: "approved" | "rejected") => decideApproval({ data: { cardId: card.id, decision, note: note.trim() || undefined } }),
    onSuccess: done,
    onError: failed,
  });
  const cancelMut = useMutation({ mutationFn: () => cancelApproval({ data: { cardId: card.id } }), onSuccess: done, onError: failed });

  const mineToAnswer = a?.status === "pending" && (a.approverUsername === user?.username || isAdmin);
  const canCancel = a && (a.requestedByUsername === user?.username || isAdmin);
  const tone = a?.status === "approved" ? "bg-success/15 text-success" : a?.status === "rejected" ? "bg-danger/15 text-danger" : "bg-surface-2 text-muted";
  const label = a?.status === "approved" ? L("تأیید شد", "Approved") : a?.status === "rejected" ? L("رد شد", "Rejected") : L("منتظر تأیید", "Waiting for approval");

  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-[13px]">
      {a && (
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px]", tone)}>{label}</span>
            <span className="text-muted">
              {L("تأییدکننده", "Approver")}: {a.approverName} · {L("درخواست از", "requested by")} {a.requestedByName} · {isoToJalaaliStr(a.requestedAt)}
            </span>
          </p>
          {a.note && <p className="text-[12px]">{a.note}</p>}
        </div>
      )}

      {mineToAnswer && (
        <div className="space-y-2">
          <Input value={note} maxLength={500} placeholder={L("توضیح (اختیاری)", "Note (optional)")} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" disabled={decideMut.isPending} onClick={() => decideMut.mutate("approved")}>
              {L("تأیید", "Approve")}
            </Button>
            <Button size="sm" variant="danger" disabled={decideMut.isPending} onClick={() => decideMut.mutate("rejected")}>
              {L("رد", "Reject")}
            </Button>
          </div>
        </div>
      )}
      {a?.status === "pending" && canCancel && !mineToAnswer && (
        <Button size="sm" variant="secondary" disabled={cancelMut.isPending} onClick={() => cancelMut.mutate()}>
          {L("پس گرفتن درخواست", "Withdraw request")}
        </Button>
      )}

      {(!a || a.status !== "pending") && (
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-lg border border-border bg-surface px-2 text-sm" value={approver} onChange={(e) => setApprover(e.target.value)}>
            <option value="">{L("تأییدکننده…", "Approver…")}</option>
            {(usersQ.data ?? [])
              .filter((u) => u.username !== user?.username)
              .map((u) => (
                <option key={u.username} value={u.username}>
                  {u.displayName}
                </option>
              ))}
          </select>
          <Button size="sm" disabled={!approver || askMut.isPending} onClick={() => askMut.mutate()}>
            {a ? L("درخواست دوباره", "Ask again") : L("درخواست تأیید", "Request approval")}
          </Button>
        </div>
      )}
    </div>
  );
}
