import { createFileRoute } from "@tanstack/react-router";
import { GoalsView } from "@/components/goals-view";
import { WorkspaceLayout } from "@/components/workspace-layout";

export const Route = createFileRoute("/goals")({ component: GoalsPage });

function GoalsPage() {
  return (
    <WorkspaceLayout>
      <GoalsView />
    </WorkspaceLayout>
  );
}
