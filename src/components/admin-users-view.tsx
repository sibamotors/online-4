import { ClipboardList, Code2, KeyRound, Pencil, Plus, Shield, Trash2, Users, Zap } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteLocalUser, listLocalUsers, upsertLocalUser, type LocalUser } from "@/lib/local-users";
import { useLocalSession } from "@/lib/local-session";
import { Button } from "./ui/button";
import { UserAvatar } from "./user-avatar";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ApiAdminPanel } from "./api-admin-panel";
import { AutomationPanel } from "./automation-panel";
import { BoardRolesPanel } from "./board-roles-panel";
import { PermissionsPanel } from "./permissions-panel";
import { RequestFormsAdmin } from "./request-forms-admin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AdminUsersView() {
  const [tab, setTab] = useState<"users" | "perms" | "auto" | "forms" | "api">("users");
  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium",
            tab === "users" ? "bg-bg-elevated text-fg shadow-sm" : "text-muted",
          )}
        >
          <Users className="size-4" />
          حساب‌های ورود
        </button>
        <button
          type="button"
          onClick={() => setTab("perms")}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium",
            tab === "perms" ? "bg-bg-elevated text-fg shadow-sm" : "text-muted",
          )}
        >
          <Shield className="size-4" />
          دسترسی تخته
        </button>
        <button
          type="button"
          onClick={() => setTab("auto")}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium",
            tab === "auto" ? "bg-bg-elevated text-fg shadow-sm" : "text-muted",
          )}
        >
          <Zap className="size-4" />
          اتوماسیون
        </button>
        <button
          type="button"
          onClick={() => setTab("forms")}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium",
            tab === "forms" ? "bg-bg-elevated text-fg shadow-sm" : "text-muted",
          )}
        >
          <ClipboardList className="size-4" />
          فرم‌ها
        </button>
        <button
          type="button"
          onClick={() => setTab("api")}
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium",
            tab === "api" ? "bg-bg-elevated text-fg shadow-sm" : "text-muted",
          )}
        >
          <Code2 className="size-4" />
          API
        </button>
      </div>
      {tab === "users" ? <UsersTab /> : tab === "perms" ? (
        <>
          <PermissionsPanel />
          <BoardRolesPanel />
        </>
      ) : tab === "auto" ? <AutomationPanel /> : tab === "forms" ? <RequestFormsAdmin /> : <ApiAdminPanel />}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { user: currentUser, isSuperAdmin } = useLocalSession();
  // the system admin manages everybody; a level-2 admin only ordinary accounts
  const canManage = (u: LocalUser) => isSuperAdmin || !u.isAdmin;
  const q = useQuery({ queryKey: ["local-users"], queryFn: () => listLocalUsers() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LocalUser | null>(null);

  const saveMut = useMutation({
    mutationFn: (data: { username: string; password: string; displayName: string; role: string; level?: "user" | "deputy" }) =>
      upsertLocalUser({ data }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      void qc.invalidateQueries({ queryKey: ["local-users"] });
      void qc.invalidateQueries({ queryKey: ["user-permissions"] });
      setOpen(false);
      toast.success("کاربر ذخیره شد.");
    },
  });

  const delMut = useMutation({
    mutationFn: (username: string) => deleteLocalUser({ data: { username } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      void qc.invalidateQueries({ queryKey: ["local-users"] });
      void qc.invalidateQueries({ queryKey: ["user-permissions"] });
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">مدیریت کاربران ورود</h1>
          <p className="text-[13px] text-muted">
            ساخت یوزر جدید، تغییر رمز عبور و حذف کاربران — فقط برای مدیران.
            {!isSuperAdmin && " (شما ادمین سطح ۲ هستید: فقط کاربران عادی را می‌توانید مدیریت کنید.)"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          کاربر جدید
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border k-glass">
        {q.isLoading ? (
          <div className="p-4">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-surface">
              <div className="k-skeleton h-full w-full" />
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-[12px] text-subtle">
              <tr>
                <th className="px-3 py-2 text-start font-medium">نام</th>
                <th className="hidden px-3 py-2 text-start font-medium sm:table-cell">نقش</th>
                <th className="px-3 py-2 text-start font-medium" dir="ltr">
                  یوزرنیم
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((u) => (
                <tr key={u.username} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 font-medium">
                    <span className="flex items-center gap-2.5">
                      <UserAvatar username={u.username} name={u.displayName} size="sm" presence />
                      <span>
                        {u.displayName}
                        {u.isAdmin && (
                          <span className="ms-2 rounded-sm bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
                            {u.isSuperAdmin ? "مدیر سیستم" : "ادمین سطح ۲"}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{u.role}</td>
                  <td className="px-3 py-2.5 tabular-nums text-subtle" dir="ltr">
                    {u.username}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      {canManage(u) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="ویرایش / تغییر رمز"
                          onClick={() => {
                            setEditing(u);
                            setOpen(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                      )}
                      {!u.isSuperAdmin && canManage(u) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-danger"
                          aria-label="حذف"
                          onClick={() => {
                            if (u.username === currentUser?.username) {
                              toast.error("نمی‌توانید حساب خودتان را حذف کنید.");
                              return;
                            }
                            if (confirm(`کاربر «${u.displayName}» (${u.username}) حذف شود؟`)) {
                              delMut.mutate(u.username);
                            }
                          }}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserDialog
        key={editing?.username ?? "new"}
        open={open}
        user={editing}
        onOpenChange={setOpen}
        onSave={(data) => saveMut.mutate(data)}
        busy={saveMut.isPending}
        canSetLevel={Boolean(isSuperAdmin)}
      />
    </>
  );
}

function UserDialog({
  open,
  user,
  onOpenChange,
  onSave,
  busy,
  canSetLevel,
}: {
  open: boolean;
  user: LocalUser | null;
  onOpenChange: (v: boolean) => void;
  onSave: (data: { username: string; password: string; displayName: string; role: string; level?: "user" | "deputy" }) => void;
  busy: boolean;
  /** Only the system admin may make level-2 admins. */
  canSetLevel: boolean;
}) {
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [role, setRole] = useState(user?.role ?? "");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<"user" | "deputy">(user?.isDeputy ? "deputy" : "user");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setUsername(user?.username ?? "");
          setDisplayName(user?.displayName ?? "");
          setRole(user?.role ?? "");
          setPassword("");
          setLevel(user?.isDeputy ? "deputy" : "user");
        }
      }}
    >
      <DialogContent>
        <DialogTitle>{user ? "ویرایش کاربر / تغییر رمز" : "افزودن کاربر جدید"}</DialogTitle>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!username.trim() || !password.trim()) return;
            onSave({
              username: username.trim(),
              password: password.trim(),
              displayName: displayName.trim(),
              role: role.trim(),
              ...(canSetLevel && !user?.isSuperAdmin ? { level } : {}),
            });
          }}
        >
          <div>
            <Label>یوزرنیم (برای ورود)</Label>
            <Input
              className="mt-1"
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={Boolean(user)}
              placeholder="مثال: r.karimi"
              required
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">
              <KeyRound className="size-3.5" />
              {user ? "رمز عبور جدید" : "رمز عبور"}
            </Label>
            <Input
              className="mt-1"
              dir="ltr"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={user ? "برای تغییر رمز وارد کنید" : "حداقل ۴ کاراکتر"}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نام نمایشی</Label>
              <Input className="mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label>نقش / سمت</Label>
              <Input className="mt-1" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
          </div>
          {canSetLevel && !user?.isSuperAdmin && (
            <div>
              <Label>سطح دسترسی</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm"
                value={level}
                onChange={(e) => setLevel(e.target.value as "user" | "deputy")}
              >
                <option value="user">کاربر عادی</option>
                <option value="deputy">ادمین سطح ۲ (مدیریت کاربران عادی، دیدن لاگ و همه‌ی صفحه‌ها)</option>
              </select>
              <p className="mt-1 text-[11px] text-subtle">
                ادمین سطح ۲ نمی‌تواند حساب مدیر سیستم یا ادمین دیگری را تغییر دهد، ادمین جدید بسازد، یا پشتیبان را بازگردانی کند.
              </p>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={busy}>
              ذخیره
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
