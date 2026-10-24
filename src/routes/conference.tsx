import { createFileRoute } from "@tanstack/react-router";
import { ConferenceRoom } from "@/components/conference-room";
import { WorkspaceLayout } from "@/components/workspace-layout";

export const Route = createFileRoute("/conference")({ component: ConferencePage });

/** The conference room has its own page (opened from the video icon in the top bar, next to "People"). */
function ConferencePage() {
  return (
    <WorkspaceLayout>
      <ConferenceRoom />
    </WorkspaceLayout>
  );
}
