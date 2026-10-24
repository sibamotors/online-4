import { getSql } from "../db";
import type { Board, Person } from "../types";

/**
 * Direct read/write of the shared workspace document, for server code that lives outside local-db.ts
 * (request forms, estimates). Callers that WRITE must run inside withWorkspaceLock (use workspaceWriteLock).
 */
export type RawWs = { people: Person[]; boards: Board[]; archivedBoards?: Board[]; [key: string]: unknown };

export async function readWorkspaceRaw(): Promise<RawWs | null> {
  const sql = await getSql();
  const rows = await sql<{ data: unknown }>`select data from workspace_state where id = 'main'`;
  const raw = rows[0]?.data;
  if (!raw) return null;
  const ws = (typeof raw === "string" ? JSON.parse(raw) : raw) as RawWs;
  if (!Array.isArray(ws.boards)) ws.boards = [];
  if (!Array.isArray(ws.people)) ws.people = [];
  return ws;
}

export async function writeWorkspaceRaw(ws: RawWs): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into workspace_state (id, data, updated_at)
    values ('main', ${JSON.stringify(ws)}::jsonb, now())
    on conflict (id) do update set data = excluded.data, updated_at = now()
  `;
  void import("./events.server").then((m) => m.publishChange());
}

export function findCard(ws: RawWs, cardId: string) {
  for (const board of ws.boards) {
    for (const list of board.lists ?? []) {
      const card = (list.cards ?? []).find((c) => c.id === cardId);
      if (card) return { board, list, card };
    }
  }
  return null;
}
