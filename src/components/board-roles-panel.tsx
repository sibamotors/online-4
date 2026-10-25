import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listBoardRoles, setBoardRole } from "@/lib/board-roles";
import { useTranslation } from "@/lib/i18n";
import { listBoards } from "@/lib/local-db";
import { listLocalUsers } from "@/lib/local-users";

const selectCls = "h-9 rounded-lg border border-border bg-surface px-2 text-sm";

/** Admin: who may only look at a board (read-only guests). */
export function BoardRolesPanel() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const qc = useQueryClient();
  const [boardId, setBoardId] = useState("");
  const boardsQ = useQuery({ queryKey: ["boards"], queryFn: () => listBoards() });
  const usersQ = useQuery({ queryKey: ["local-users"], queryFn: () => listLocalUsers() });
  const rolesQ = useQuery({
    queryKey: ["board-roles", boardId],
    queryFn: () => listBoardRoles({ data: { boardId } }),
    enabled: Boolean(boardId),
  });
  useEffect(() => {
    if (!boardId && boardsQ.data?.[0]) setBoardId(boardsQ.data[0].id);
  }, [boardId, boardsQ.data]);

  const mut = useMutation({
    mutationFn: (v: { username: string; role: "member" | "viewer" }) => setBoardRole({ data: { boardId, ...v } }),
    onSuccess: (r) => {
      if (r.ok) void qc.invalidateQueries({ queryKey: ["board-roles", boardId] });
      else toast.error(r.error ?? L("انجام نشد.", "Failed."));
    },
  });
  const viewers = new Set((rolesQ.data ?? []).map((r) => r.username));

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Eye className="size-4 text-accent" />
        {L("مهمان فقط‌خواندنی در هر تخته", "Read-only guests per board")}
      </p>
      <p className="text-[12px] text-muted">
        {L(
          "همه به‌طور پیش‌فرض عضو همه‌ی تخته‌ها هستند و می‌توانند (در حد مجوزهای بالا) ویرایش کنند. کسی را که اینجا «فقط خواندن» کنید روی همین تخته چیزی را نمی‌تواند تغییر دهد، ولی می‌بیند. مدیر سامانه محدود نمی‌شود.",
          "Everybody is a member of every board by default. Someone set to “read only” here can look at this board but not change anything on it. Administrators are never restricted.",
        )}
      </p>
      <select className={`${selectCls} w-full`} value={boardId} onChange={(e) => setBoardId(e.target.value)}>
        {(boardsQ.data ?? []).map((b) => (
          <option key={b.id} value={b.id}>
            {b.title}
          </option>
        ))}
      </select>
      <ul className="divide-y divide-border">
        {(usersQ.data ?? [])
          .filter((u) => !u.isAdmin)
          .map((u) => (
            <li key={u.username} className="flex items-center gap-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate">{u.displayName}</span>
              <select
                className={selectCls}
                value={viewers.has(u.username) ? "viewer" : "member"}
                disabled={mut.isPending || !boardId}
                onChange={(e) => mut.mutate({ username: u.username, role: e.target.value as "member" | "viewer" })}
              >
                <option value="member">{L("عضو (ویرایش)", "Member (edit)")}</option>
                <option value="viewer">{L("فقط خواندن", "Read only")}</option>
              </select>
            </li>
          ))}
      </ul>
    </div>
  );
}
