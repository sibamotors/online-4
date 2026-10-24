import { createFileRoute } from "@tanstack/react-router";
import { SearchView } from "@/components/search-view";
import { WorkspaceLayout } from "@/components/workspace-layout";

type Search = { q?: string };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): Search => ({ q: typeof s.q === "string" ? s.q : undefined }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  return (
    <WorkspaceLayout>
      <SearchView initialQuery={q} />
    </WorkspaceLayout>
  );
}
