import { getSql } from "../db";

/**
 * Per-board access. Everybody is a normal member of every board (as before) unless an administrator
 * made them a read-only guest ("viewer") of that board. Administrators are never restricted.
 */
let anyCache: { at: number; value: boolean } | null = null;
const TTL_MS = 10_000;

export function invalidateRoleCache(): void {
  anyCache = null;
}

/** Cheap check so installs without guests pay nothing. */
export async function anyViewerRoles(): Promise<boolean> {
  if (anyCache && Date.now() - anyCache.at < TTL_MS) return anyCache.value;
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select count(*)::int as n from app_board_roles where role = 'viewer'`;
  anyCache = { at: Date.now(), value: (rows[0]?.n ?? 0) > 0 };
  return anyCache.value;
}

/** Boards where this person may only look. */
export async function viewerBoardIds(username: string): Promise<Set<string>> {
  if (!(await anyViewerRoles())) return new Set();
  const sql = await getSql();
  const rows = await sql<{ board_id: string }>`select board_id from app_board_roles where username = ${username} and role = 'viewer'`;
  return new Set(rows.map((r) => r.board_id));
}

export async function assertBoardWritable(user: { username: string; isAdmin: boolean }, boardId: string): Promise<void> {
  if (user.isAdmin) return;
  if ((await viewerBoardIds(user.username)).has(boardId)) throw new Error("BOARD_READ_ONLY");
}
