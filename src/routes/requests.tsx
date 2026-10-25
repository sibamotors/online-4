import { createFileRoute } from "@tanstack/react-router";
import { RequestsView } from "@/components/requests-view";
import { WorkspaceLayout } from "@/components/workspace-layout";

export const Route = createFileRoute("/requests")({ component: RequestsPage });

function RequestsPage() {
  return (
    <WorkspaceLayout>
      <RequestsView />
    </WorkspaceLayout>
  );
}
