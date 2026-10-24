import { Crown, Hand, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Send, Users, Video, VideoOff, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useLocalSession } from "@/lib/local-session";
import type { PublicParticipant } from "@/lib/conference";
import type { LobbyChoice } from "@/lib/use-conference";
import { cn } from "@/lib/utils";
import { useConferenceCtx } from "./conference-provider";
import { UserAvatar } from "./user-avatar";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

const selectCls = "h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm";

/** The conference room: the entry screen (start / join) and the call itself. */
export function ConferenceRoom() {
  const conf = useConferenceCtx();
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg">
      {conf.joined ? <InCall /> : <Entry />}
    </div>
  );
}

// ---------------------------------------------------------------- entry

function useDevices(enabled: boolean) {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.enumerateDevices) return;
    const load = () =>
      void navigator.mediaDevices.enumerateDevices().then((d) => {
        setMics(d.filter((x) => x.kind === "audioinput"));
        setCams(d.filter((x) => x.kind === "videoinput"));
      });
    load();
    navigator.mediaDevices.addEventListener?.("devicechange", load);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", load);
  }, [enabled]);
  return { mics, cams };
}

function Entry() {
  const conf = useConferenceCtx();
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const { isAdmin } = useLocalSession();
  const [title, setTitle] = useState("");
  const [notifyAll, setNotifyAll] = useState(false);
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(false);
  const [micId, setMicId] = useState("");
  const [camId, setCamId] = useState("");
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const devices = useDevices(true);

  const supported = typeof window !== "undefined" && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia) && typeof RTCPeerConnection !== "undefined";

  // test of camera and microphone before entering
  async function startPreview() {
    stopPreview();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: audio ? (micId ? { deviceId: { exact: micId } } : true) : false,
        video: video ? (camId ? { deviceId: { exact: camId } } : true) : false,
      });
      setPreview(s);
      conf.setError(null);
    } catch {
      conf.setError(L("اجازه‌ی میکروفون یا دوربین داده نشد. از تنظیمات مرورگر (آیکن قفل کنار آدرس) فعالش کنید.", "Camera or microphone permission was not granted. Enable it in the browser (the lock icon next to the address)."));
    }
  }
  function stopPreview() {
    setPreview((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }
  useEffect(() => () => stopPreview(), []);
  useEffect(() => {
    if (videoEl.current) videoEl.current.srcObject = preview && preview.getVideoTracks().length > 0 ? preview : null;
  }, [preview]);
  useEffect(() => {
    if (!preview || preview.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    let ctx: AudioContext | undefined;
    try {
      ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      ctx.createMediaStreamSource(preview).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      timer = setInterval(() => {
        an.getByteFrequencyData(data);
        setLevel(Math.min(100, (data.reduce((a, b) => a + b, 0) / data.length) * 2.5));
      }, 120);
    } catch {
      /* the meter is only a nicety */
    }
    return () => {
      if (timer) clearInterval(timer);
      void ctx?.close().catch(() => undefined);
    };
  }, [preview]);

  const choice = (): LobbyChoice => ({ audio, video, audioDeviceId: micId || undefined, videoDeviceId: camId || undefined });
  const go = async (fn: () => Promise<void>) => {
    stopPreview();
    await fn();
  };
  const room = conf.room;

  return (
    <div className="k-scroll h-full min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-5 pb-28">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">{L("اتاق کنفرانس", "Conference room")}</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {L("تماس صوتی و تصویری گروهی. هر کس اول کنفرانس را شروع کند، تا پایان کنفرانس مدیر اتاق است.", "Group audio and video calls. Whoever starts the conference first is the room's host until it ends.")}
          </p>
        </header>

        {!supported && (
          <p className="rounded-xl border border-danger/40 bg-danger/5 p-3 text-[13px] text-danger">
            {L(
              "این مرورگر یا این آدرس از تماس صوتی و تصویری پشتیبانی نمی‌کند. سایت باید با HTTPS باز شود و مرورگر به‌روز باشد (Chrome، Edge، Firefox یا Safari).",
              "This browser or address does not support audio/video calls. The site must be opened over HTTPS with an up-to-date browser (Chrome, Edge, Firefox or Safari).",
            )}
          </p>
        )}
        {isAdmin && !conf.hasTurn && (
          <p className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-[12px]">
            {L(
              "هشدار مدیر: سرور TURN تنظیم نشده است. برای کسانی که پشت شبکه‌های محدود (سازمان، اینترنت موبایل) هستند ممکن است تصویر و صدا وصل نشود. راهنما: deploy/conference-setup.md",
              "Admin notice: no TURN server is configured. People on restricted networks (offices, mobile data) may not connect. See deploy/conference-setup.md.",
            )}
          </p>
        )}

        <section className="rounded-xl border border-border p-4">
          {room ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />
                {L(`کنفرانس «${room.title}» در جریان است`, `“${room.title}” is in progress`)}
              </p>
              <p className="text-[13px] text-muted">
                {L("میزبان", "Host")}: {room.hostName} · {room.participants.length}/{room.max} {L("نفر", "people")}
              </p>
              <ul className="flex flex-wrap gap-2">
                {room.participants.map((p) => (
                  <li key={p.username} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pe-3 ps-1 text-[12px]">
                    <UserAvatar username={p.username} name={p.displayName} size="xs" />
                    {p.displayName}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold">{L("الان کنفرانسی در جریان نیست", "No conference is running right now")}</p>
              <Input value={title} maxLength={80} placeholder={L("عنوان کنفرانس (اختیاری)", "Conference title (optional)")} onChange={(e) => setTitle(e.target.value)} />
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={notifyAll} onChange={(e) => setNotifyAll(e.target.checked)} />
                {L("به همه‌ی کاربران خبر بده (اعلان)", "Notify everybody (notification)")}
              </label>
            </div>
          )}
        </section>

        <section className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold">{L("قبل از ورود", "Before you enter")}</p>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} />
              {L("با میکروفون روشن وارد شوم", "Join with the microphone on")}
            </label>
            <select className={selectCls} value={micId} onChange={(e) => setMicId(e.target.value)} disabled={!audio}>
              <option value="">{L("میکروفون پیش‌فرض", "Default microphone")}</option>
              {devices.mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `${L("میکروفون", "Microphone")} ${i + 1}`}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={video} onChange={(e) => setVideo(e.target.checked)} />
              {L("با دوربین روشن وارد شوم", "Join with the camera on")}
            </label>
            <select className={selectCls} value={camId} onChange={(e) => setCamId(e.target.value)} disabled={!video}>
              <option value="">{L("دوربین پیش‌فرض", "Default camera")}</option>
              {devices.cams.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `${L("دوربین", "Camera")} ${i + 1}`}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" disabled={!supported || (!audio && !video)} onClick={() => void startPreview()}>
              {L("آزمایش دوربین و میکروفون", "Test camera and microphone")}
            </Button>
            {preview && (
              <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-label={L("سطح صدای میکروفون", "Microphone level")}>
                <div className="h-full bg-success transition-[width]" style={{ width: `${level}%` }} />
              </div>
            )}
          </div>
          <div className="grid place-items-center rounded-lg bg-black/80">
            {preview && preview.getVideoTracks().length > 0 ? (
              <video ref={videoEl} autoPlay muted playsInline className="aspect-video w-full rounded-lg object-cover [transform:scaleX(-1)]" />
            ) : (
              <p className="p-6 text-center text-[12px] text-white/70">{L("پیش‌نمایش دوربین اینجا دیده می‌شود", "The camera preview appears here")}</p>
            )}
          </div>
        </section>

        {conf.error && <p className="text-[13px] text-danger">{conf.error}</p>}

        <div className="sticky bottom-3 z-10 [&>button]:w-full sm:[&>button]:w-auto">
          {room ? (
            <Button disabled={!supported || conf.busy || room.participants.length >= room.max} onClick={() => void go(() => conf.join(choice()))}>
              <Video className="size-4" />
              {conf.busy ? L("در حال ورود…", "Joining…") : L("ورود به کنفرانس", "Join the conference")}
            </Button>
          ) : (
            <Button disabled={!supported || conf.busy} onClick={() => void go(() => conf.start(title, notifyAll, choice()))}>
              <Video className="size-4" />
              {conf.busy ? L("در حال شروع…", "Starting…") : L("شروع کنفرانس (شما میزبان می‌شوید)", "Start the conference (you become the host)")}
            </Button>
          )}
        </div>

        <section className="rounded-xl border border-border p-4 text-[12px] text-muted">
          <p className="mb-1 text-[13px] font-semibold text-fg">{L("نکته‌ها و الزامات", "Notes and requirements")}</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>{L("سایت باید با HTTPS باز شود و در اولین بار مرورگر اجازه‌ی میکروفون و دوربین را می‌پرسد.", "The site must be opened over HTTPS and the browser asks for microphone and camera permission the first time.")}</li>
            <li>{L("برای کیفیت بهتر از هدفون استفاده کنید تا پژواک ایجاد نشود.", "Use headphones for better quality, to avoid echo.")}</li>
            <li>{L("هر نفر تصویر خودش را برای همه‌ی دیگران جداگانه می‌فرستد، پس اتاق برای حداکثر ۸ نفر طراحی شده و دوربین زیاد اینترنت می‌خواهد؛ اگر اینترنت ضعیف است فقط با صدا شرکت کنید.", "Each person sends their video to everybody else separately, so the room is designed for up to 8 people and cameras use a lot of bandwidth; on a weak connection join with audio only.")}</li>
            <li>{L("اشتراک صفحه فقط روی کامپیوتر پشتیبانی می‌شود. مدیر اتاق می‌تواند افراد را بی‌صدا یا خارج کند و کنفرانس را برای همه تمام کند.", "Screen sharing works on computers only. The host can mute or remove people and end the conference for everybody.")}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- in the call

/** Is this person speaking right now? (from the volume of their audio) */
let sharedCtx: AudioContext | null = null;
function useSpeaking(stream: MediaStream | null, tracks: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!stream || tracks === 0 || stream.getAudioTracks().length === 0) {
      setOn(false);
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      sharedCtx ??= new AudioContext();
      void sharedCtx.resume();
      const src = sharedCtx.createMediaStreamSource(stream);
      const an = sharedCtx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      timer = setInterval(() => {
        an.getByteFrequencyData(data);
        setOn(data.reduce((a, b) => a + b, 0) / data.length > 14);
      }, 250);
      return () => {
        if (timer) clearInterval(timer);
        src.disconnect();
      };
    } catch {
      return undefined;
    }
  }, [stream, tracks]);
  return on;
}

function useElapsed(since: number): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${h > 0 ? `${h}:` : ""}${two(m)}:${two(s % 60)}`;
}

function Tile({ p, stream, isMe, state, canControl, onMute, onKick }: {
  p: PublicParticipant;
  stream: MediaStream | null;
  isMe: boolean;
  state?: RTCPeerConnectionState;
  canControl: boolean;
  onMute: () => void;
  onKick: () => void;
}) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const ref = useRef<HTMLVideoElement | null>(null);
  const showVideo = Boolean(stream && (p.video || p.screen));
  const speaking = useSpeaking(isMe ? null : stream, stream?.getAudioTracks().length ?? 0) && p.audio;
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream, showVideo]);
  const connecting = !isMe && state !== "connected";

  return (
    <div className={cn("group relative aspect-video overflow-hidden rounded-xl bg-neutral-900 ring-2 transition-shadow", speaking ? "ring-success" : "ring-transparent")}>
      {showVideo ? (
        // audio is played by the provider; this element shows the picture only
        <video ref={ref} autoPlay muted playsInline className={cn("size-full", p.screen ? "object-contain" : "object-cover", isMe && !p.screen && "[transform:scaleX(-1)]")} />
      ) : (
        <div className="grid size-full place-items-center">
          <UserAvatar username={p.username} name={p.displayName} size="xl" />
        </div>
      )}
      {connecting && <span className="absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{L("در حال اتصال…", "Connecting…")}</span>}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[12px] text-white">
        {p.hand && <Hand className="size-3.5 text-amber-300" aria-label={L("دست بالا", "Hand raised")} />}
        <span className="min-w-0 flex-1 truncate">
          {p.displayName}
          {isMe ? ` (${L("شما", "you")})` : ""}
        </span>
        {!p.audio && <MicOff className="size-3.5 text-red-300" aria-label={L("میکروفون خاموش", "Muted")} />}
      </div>
      {canControl && !isMe && (
        <div className="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" onClick={onMute} className="grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80" aria-label={L("بی‌صدا کردن", "Mute")}>
            <VolumeX className="size-3.5" />
          </button>
          <button type="button" onClick={onKick} className="grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-danger" aria-label={L("حذف از کنفرانس", "Remove from the conference")}>
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function InCall() {
  const conf = useConferenceCtx();
  const { user, isAdmin } = useLocalSession();
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const room = conf.room;
  const [panel, setPanel] = useState<"none" | "people" | "chat">("none");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [text, setText] = useState("");
  const chatEnd = useRef<HTMLDivElement | null>(null);
  const elapsed = useElapsed(room?.startedAt ?? Date.now());
  const iAmHost = Boolean(room && user && room.host === user.username);
  const canControl = iAmHost || isAdmin;
  const streams = useMemo(() => new Map(conf.peers.map((p) => [p.username, p])), [conf.peers]);
  const canShare = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end" });
  }, [conf.chat.length, panel]);

  if (!room || !user) return null;
  const others = room.participants.filter((p) => p.username !== user.username);
  const cols = room.participants.length <= 1 ? "grid-cols-1" : room.participants.length <= 4 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  const ctl = "grid size-11 place-items-center rounded-full transition-colors";

  function leave() {
    if (iAmHost && others.length > 0) setLeaveOpen(true);
    else void conf.leave(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2 text-[13px]">
        <span className="flex items-center gap-2 font-semibold">
          <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />
          {room.title}
        </span>
        <span className="tabular-nums text-muted" dir="ltr">
          {elapsed}
        </span>
        <span className="flex items-center gap-1 text-muted">
          <Crown className="size-3.5 text-amber-500" />
          {room.hostName}
        </span>
        <span className="text-muted">
          {room.participants.length}/{room.max} {L("نفر", "people")}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="k-scroll min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
          <div className={cn("mx-auto grid max-w-5xl gap-3", cols)}>
            {room.participants.map((p) => {
              const isMe = p.username === user.username;
              const peer = streams.get(p.username);
              return (
                <Tile
                  key={p.username}
                  p={p}
                  isMe={isMe}
                  stream={isMe ? conf.localStream : (peer?.stream ?? null)}
                  state={peer?.state}
                  canControl={canControl}
                  onMute={() => conf.mute(p.username)}
                  onKick={() => window.confirm(L(`«${p.displayName}» از کنفرانس خارج شود؟`, `Remove “${p.displayName}” from the conference?`)) && conf.kick(p.username)}
                />
              );
            })}
          </div>
        </div>

        {panel !== "none" && (
          <aside className="fixed inset-0 z-50 flex flex-col bg-bg pb-20 lg:static lg:z-auto lg:w-72 lg:shrink-0 lg:border-s lg:border-border lg:pb-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[13px] font-semibold">
              {panel === "people" ? L("شرکت‌کنندگان", "Participants") : L("گفتگوی کنفرانس", "Conference chat")}
              <button type="button" className="text-muted hover:text-fg" onClick={() => setPanel("none")} aria-label={L("بستن", "Close")}>
                <X className="size-4" />
              </button>
            </div>
            {panel === "people" ? (
              <ul className="k-scroll min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                {room.participants.map((p) => (
                  <li key={p.username} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                    <UserAvatar username={p.username} name={p.displayName} size="sm" />
                    <span className="min-w-0 flex-1 truncate">
                      {p.displayName}
                      {p.username === room.host && <Crown className="ms-1 inline size-3.5 text-amber-500" aria-label={L("میزبان", "Host")} />}
                    </span>
                    {p.hand && <Hand className="size-4 text-amber-500" />}
                    {!p.audio && <MicOff className="size-4 text-danger" />}
                    {canControl && p.username !== user.username && p.username !== room.host && (
                      <>
                        <button type="button" className="text-muted hover:text-fg" onClick={() => conf.mute(p.username)} aria-label={L("بی‌صدا کردن", "Mute")}>
                          <VolumeX className="size-4" />
                        </button>
                        <button type="button" className="text-muted hover:text-danger" onClick={() => conf.kick(p.username)} aria-label={L("حذف", "Remove")}>
                          <X className="size-4" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
                {canControl && others.length > 0 && (
                  <li className="p-3">
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => conf.mute("all")}>
                      <VolumeX className="size-4" />
                      {L("بی‌صدا کردن همه", "Mute everybody")}
                    </Button>
                  </li>
                )}
              </ul>
            ) : (
              <>
                <ul className="k-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-[13px]">
                  {conf.chat.length === 0 && <li className="text-center text-[12px] text-muted">{L("هنوز پیامی نیست.", "No messages yet.")}</li>}
                  {conf.chat.map((m) => (
                    <li key={m.id} className={cn("rounded-lg px-3 py-1.5", m.from === user.username ? "bg-accent-soft" : "bg-surface-2")}>
                      <p className="text-[11px] font-medium text-muted">{m.name}</p>
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    </li>
                  ))}
                  <div ref={chatEnd} />
                </ul>
                <form
                  className="flex gap-1 border-t border-border p-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = text.trim();
                    if (!t) return;
                    conf.send(t);
                    setText("");
                  }}
                >
                  <Input value={text} maxLength={500} placeholder={L("پیام…", "Message…")} onChange={(e) => setText(e.target.value)} />
                  <Button type="submit" size="icon" aria-label={L("ارسال", "Send")}>
                    <Send className="size-4" />
                  </Button>
                </form>
              </>
            )}
          </aside>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-border bg-bg-elevated px-3 py-2.5">
        <button type="button" onClick={() => void conf.toggleAudio()} className={cn(ctl, conf.media.audio ? "bg-surface-2 hover:bg-accent-soft" : "bg-danger/15 text-danger")} aria-label={conf.media.audio ? L("بی‌صدا کردن", "Mute") : L("روشن کردن میکروفون", "Unmute")}>
          {conf.media.audio ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </button>
        <button type="button" onClick={() => void conf.toggleVideo()} className={cn(ctl, conf.media.video && !conf.media.screen ? "bg-surface-2 hover:bg-accent-soft" : "bg-surface-2/60 text-muted hover:bg-accent-soft")} aria-label={L("دوربین", "Camera")}>
          {conf.media.video && !conf.media.screen ? <Video className="size-5" /> : <VideoOff className="size-5" />}
        </button>
        {canShare && (
          <button type="button" onClick={() => void conf.toggleScreen()} className={cn(ctl, conf.media.screen ? "bg-accent text-accent-fg" : "bg-surface-2 hover:bg-accent-soft")} aria-label={L("اشتراک صفحه", "Share screen")}>
            <MonitorUp className="size-5" />
          </button>
        )}
        <button type="button" onClick={conf.toggleHand} className={cn(ctl, conf.hand ? "bg-amber-400 text-black" : "bg-surface-2 hover:bg-accent-soft")} aria-label={L("بالا بردن دست", "Raise hand")}>
          <Hand className="size-5" />
        </button>
        <button type="button" onClick={() => setPanel(panel === "chat" ? "none" : "chat")} className={cn(ctl, panel === "chat" ? "bg-accent text-accent-fg" : "bg-surface-2 hover:bg-accent-soft")} aria-label={L("گفتگو", "Chat")}>
          <MessageSquare className="size-5" />
        </button>
        <button type="button" onClick={() => setPanel(panel === "people" ? "none" : "people")} className={cn(ctl, panel === "people" ? "bg-accent text-accent-fg" : "bg-surface-2 hover:bg-accent-soft")} aria-label={L("شرکت‌کنندگان", "Participants")}>
          <Users className="size-5" />
        </button>
        <button type="button" onClick={leave} className={cn(ctl, "bg-danger text-danger-fg hover:opacity-90")} aria-label={L("ترک کنفرانس", "Leave")}>
          <PhoneOff className="size-5" />
        </button>
      </div>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogTitle>{L("شما میزبان هستید", "You are the host")}</DialogTitle>
          <DialogDescription>
            {L("می‌خواهید کنفرانس را برای همه تمام کنید، یا فقط خودتان بیرون بروید و مدیریت به نفر بعدی برسد؟", "Do you want to end the conference for everybody, or just leave and hand the room to the next person?")}
          </DialogDescription>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="danger" onClick={() => void conf.leave(true)}>
              {L("پایان کنفرانس برای همه", "End for everybody")}
            </Button>
            <Button variant="secondary" onClick={() => void conf.leave(false)}>
              {L("ترک کنفرانس و واگذاری مدیریت", "Leave and hand over hosting")}
            </Button>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              {L("ماندن", "Stay")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
