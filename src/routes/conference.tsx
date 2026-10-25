import { createFileRoute } from "@tanstack/react-router";
import { ConferenceRoom } from "@/components/conference-room";
import { WorkspaceLayout } from "@/components/workspace-layout";

export const Route = createFileRoute("/conference")({ component: ConferencePage });

function ConferencePage() {
  return (
    <WorkspaceLayout>
      <ConferenceRoom />
    </WorkspaceLayout>
  );
}
