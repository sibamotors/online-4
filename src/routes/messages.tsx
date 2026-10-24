import { createFileRoute, redirect } from "@tanstack/react-router";
import { MessagesView } from "@/components/messages-view";
import { WorkspaceLayout } from "@/components/workspace-layout";

type Search = { to?: string };

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    to: typeof s.to === "string" ? s.to : undefined,
  }),
  // old links such as /messages?tab=conference (bookmarks, notifications) now lead to the conference page
  beforeLoad: ({ search }) => {
    const raw = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    if (raw === "conference" || (search as Record<string, unknown>).tab === "conference") throw redirect({ to: "/conference" });
  },
  component: MessagesPage,
});

function MessagesPage() {
  const { to } = Route.useSearch();
  return (
    <WorkspaceLayout>
      <div className="flex min-h-0 flex-1 flex-col">
        <MessagesView initialTo={to} />
      </div>
    </WorkspaceLayout>
  );
}
