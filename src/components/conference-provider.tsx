import { Link, useRouterState } from "@tanstack/react-router";
import { Mic, MicOff, PhoneOff, Video } from "lucide-react";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useLocalSession } from "@/lib/local-session";
import { useTranslation } from "@/lib/i18n";
import { useConference, type PeerView } from "@/lib/use-conference";
import { cn } from "@/lib/utils";

type Conf = ReturnType<typeof useConference>;
const Ctx = createContext<Conf | null>(null);

export function useConferenceCtx(): Conf {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConferenceCtx must be used inside <ConferenceProvider>");
  return c;
}

/**
 * Keeps the conference alive while you move around the app: the connection, your microphone and the
 * sound of the other people live here (above every page), and a small bar lets you get back to the room.
 */
export function ConferenceProvider({ children }: { children: ReactNode }) {
  const { user } = useLocalSession();
  const conf = useConference(user ? { username: user.username, displayName: user.displayName } : null);
  return (
    <Ctx.Provider value={conf}>
      {children}
      {conf.joined && conf.peers.map((p) => <RemoteAudio key={p.username} peer={p} />)}
      {conf.joined && <ConferenceBar />}
    </Ctx.Provider>
  );
}

/** The sound of one person. Plays here (not in the room page) so it keeps going on every page. */
function RemoteAudio({ peer }: { peer: PeerView }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== peer.stream) ref.current.srcObject = peer.stream;
  }, [peer.stream]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}

/** Small "you are in a conference" bar, shown on every page except the conference room itself. */
function ConferenceBar() {
  const conf = useConferenceCtx();
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const onRoomPage = useRouterState({
    select: (s) => s.location.pathname === "/messages" && (s.location.search as Record<string, unknown>)?.tab === "conference",
  });
  if (onRoomPage) return null;
  const btn = "grid size-9 place-items-center rounded-full transition-colors";
  return (
    <div className="fixed bottom-20 start-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 shadow-lg rtl:translate-x-1/2 lg:bottom-4">
      <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />
      <Link to="/messages" search={{ tab: "conference" }} className="max-w-40 truncate text-[13px] font-medium hover:text-accent">
        {conf.room?.title ?? L("کنفرانس", "Conference")}
      </Link>
      <button
        type="button"
        onClick={() => void conf.toggleAudio()}
        className={cn(btn, conf.media.audio ? "bg-surface-2 hover:bg-accent-soft" : "bg-danger/15 text-danger")}
        aria-label={conf.media.audio ? L("بی‌صدا کردن", "Mute") : L("روشن کردن میکروفون", "Unmute")}
      >
        {conf.media.audio ? <Mic className="size-4" /> : <MicOff className="size-4" />}
      </button>
      <Link to="/messages" search={{ tab: "conference" }} className={cn(btn, "bg-surface-2 hover:bg-accent-soft")} aria-label={L("بازگشت به کنفرانس", "Back to the conference")}>
        <Video className="size-4" />
      </Link>
      <button type="button" onClick={() => void conf.leave(false)} className={cn(btn, "bg-danger text-danger-fg hover:opacity-90")} aria-label={L("ترک کنفرانس", "Leave the conference")}>
        <PhoneOff className="size-4" />
      </button>
    </div>
  );
}
