import { createFileRoute } from "@tanstack/react-router";
import { TableView } from "@/components/table-view";
import { useBoardCtx } from "@/lib/board-context";

export const Route = createFileRoute("/b/$boardId/table")({ component: TablePage });

function TablePage() {
  const { board, setOpenCardId } = useBoardCtx();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TableView board={board} onOpenCard={(id) => setOpenCardId(id)} />
    </div>
  );
}
