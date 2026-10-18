import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import { changeOwnPassword, setOwnPin } from "@/lib/local-users";
import { useLocalSession } from "@/lib/local-session";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cannot dismiss until password changed */
  forced?: boolean;
  onForcedDone?: () => void;
};

export function ChangePasswordDialog({ open, onOpenChange, forced, onForcedDone }: Props) {
  const { t } = useTranslation();
  const { user, updateUser } = useLocalSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: () =>
      changeOwnPassword({
        data: {
          currentPassword: current,
          newPassword: next,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setError("");
      updateUser({ mustChangePassword: false });
      onForcedDone?.();
    },
    onError: () => setError(t("خطا در ارتباط با سرور.")),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError(t("رمز جدید و تکرار آن یکسان نیستند."));
      return;
    }
    if (next.length < 8) {
      setError(t("رمز جدید باید حداقل ۸ کاراکتر باشد."));
      return;
    }
    mut.mutate();
  }

  function handleClose(v: boolean) {
    if (forced && !done) return; // cannot close
    if (!v) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError("");
      setDone(false);
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => forced && e.preventDefault()} onEscapeKeyDown={(e) => forced && e.preventDefault()}>
        <DialogTitle>{t(forced ? "تغییر رمز الزامی" : "تغییر رمز عبور")}</DialogTitle>
        <DialogDescription>
          {forced
            ? t("برای امنیت، قبل از ادامه باید رمز عبور خود را تغییر دهید.")
            : t("رمز فعلی را وارد کنید و رمز جدید بگذارید.")}
        </DialogDescription>
        {done ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-success">{t("رمز عبور با موفقیت تغییر کرد.")}</p>
            <Button className="w-full" onClick={() => handleClose(false)}>{t("ادامه")}</Button>
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <div>
              <Label htmlFor="cur-pass">{t("رمز فعلی")}</Label>
              <Input
                id="cur-pass"
                type="password"
                className="mt-1"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                dir="ltr"
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label htmlFor="new-pass">{t("رمز جدید")}</Label>
              <Input
                id="new-pass"
                type="password"
                className="mt-1"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                dir="ltr"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="conf-pass">{t("تکرار رمز جدید")}</Label>
              <Input
                id="conf-pass"
                type="password"
                className="mt-1"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                dir="ltr"
                autoComplete="new-password"
              />
            </div>
            {error ? <p className="text-[13px] text-danger">{t(error)}</p> : null}
            <Button type="submit" className="w-full" disabled={mut.isPending}>
              {mut.isPending ? t("در حال ذخیره…") : t("ذخیره رمز جدید")}
            </Button>
          </form>
        )}
        {!forced && <PinSection username={user?.username ?? ""} />}
      </DialogContent>
    </Dialog>
  );
}

function PinSection({ username }: { username: string }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      setOwnPin({
        data: {
          username,
          password,
          pin: pin.trim() ? pin.trim() : null,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) setMsg(t(res.error));
      else setMsg(t(pin.trim() ? "پین ۲FA فعال شد." : "پین ۲FA غیرفعال شد."));
    },
  });
  if (!username) return null;
  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="text-sm font-medium">{t("پین امنیتی (اختیاری)")}</p>
      <p className="mt-1 text-[12px] text-muted">{t("بعد از رمز عبور، یک پین ۴–۸ رقمی برای ورود لازم می‌شود.")}</p>
      <div className="mt-3 space-y-2">
        <Input
          type="password"
          placeholder={t("رمز فعلی")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
        />
        <Input
          type="password"
          inputMode="numeric"
          placeholder={t("پین جدید (خالی = غیرفعال)")}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          dir="ltr"
        />
        {msg ? <p className="text-[12px] text-muted">{t(msg)}</p> : null}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={mut.isPending || !password}
          onClick={() => mut.mutate()}
        >{t("ذخیره پین")}</Button>
      </div>
    </div>
  );
}
