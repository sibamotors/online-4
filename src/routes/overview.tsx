import { createFileRoute } from "@tanstack/react-router";
import { OverviewView } from "@/components/overview-view";
import { WorkspaceLayout } from "@/components/workspace-layout";

export const Route = createFileRoute("/overview")({ component: OverviewPage });

function OverviewPage() {
  return (
    <WorkspaceLayout>
      <OverviewView />
    </WorkspaceLayout>
  );
}
