import { createFileRoute, Link } from "@tanstack/react-router";
import { ConferenceRoom } from "@/components/conference-room";
import { useConferenceCtx } from "@/components/conference-provider";
import { MessagesView } from "@/components/messages-view";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Search = { to?: string; tab?: "conference" };

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    to: typeof s.to === "string" ? s.to : undefined,
    tab: s.tab === "conference" ? "conference" : undefined,
  }),
  component: CommunicationsPage,
});

/** "Communications": the messages and, next to them, the conference room. */
function CommunicationsPage() {
  const { to, tab } = Route.useSearch();
  const conf = useConferenceCtx();
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const live = conf.room;
  const base = "flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors";

  return (
    <WorkspaceLayout>
      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="flex shrink-0 gap-1 border-b border-border px-3 py-2" aria-label={L("ارتباطات", "Communications")}>
          <Link to="/messages" search={{}} className={cn(base, tab !== "conference" ? "bg-accent-soft text-fg" : "text-muted hover:text-fg")}>
            {L("پیام‌ها", "Messages")}
          </Link>
          <Link to="/messages" search={{ tab: "conference" }} className={cn(base, tab === "conference" ? "bg-accent-soft text-fg" : "text-muted hover:text-fg")}>
            {L("اتاق کنفرانس", "Conference room")}
            {live && (
              <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
                <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
                {L("در جریان", "live")} · {live.participants.length}
              </span>
            )}
          </Link>
        </nav>
        <div className="flex min-h-0 flex-1 flex-col">{tab === "conference" ? <ConferenceRoom /> : <MessagesView initialTo={to} />}</div>
      </div>
    </WorkspaceLayout>
  );
}
