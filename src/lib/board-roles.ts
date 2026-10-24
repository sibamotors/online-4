import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { adminMiddleware, authMiddleware } from "./session-middleware";
import { parse } from "./validate";

export type BoardRoleRow = { username: string; role: "viewer" };

/** Boards where I am a read-only guest (the UI can hint at it). */
export const listMyReadOnlyBoards = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<string[]> => {
    const { viewerBoardIds } = await import("./server/board-roles.server");
    return context.user.isAdmin ? [] : [...(await viewerBoardIds(context.user.username))];
  });

export const listBoardRoles = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ boardId: z.string().min(1).max(100) })))
  .handler(async ({ data }): Promise<BoardRoleRow[]> => {
    const sql = await getSql();
    return sql<BoardRoleRow>`select username, role from app_board_roles where board_id = ${data.boardId} order by username`;
  });

/** "member" = normal access (the default), "viewer" = read-only guest on this board. */
export const setBoardRole = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(parse(z.object({ boardId: z.string().min(1).max(100), username: z.string().trim().toLowerCase().min(1).max(64), role: z.enum(["member", "viewer"]) })))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const sql = await getSql();
    const u = await sql<{ username: string; display_name: string; is_admin: boolean }>`select username, display_name, (is_admin or is_admin2) as is_admin from login_users where username = ${data.username}`;
    if (!u[0]) return { ok: false, error: "کاربر پیدا نشد." };
    if (u[0].is_admin && data.role === "viewer") return { ok: false, error: "مدیر سامانه را نمی‌شود محدود کرد." };
    if (data.role === "member") {
      await sql`delete from app_board_roles where board_id = ${data.boardId} and username = ${data.username}`;
    } else {
      await sql`
        insert into app_board_roles (board_id, username, role) values (${data.boardId}, ${data.username}, 'viewer')
        on conflict (board_id, username) do update set role = 'viewer'
      `;
    }
    (await import("./server/board-roles.server")).invalidateRoleCache();
    const { audit } = await import("./server/audit.server");
    await audit({
      actor: context.user.username,
      actorName: context.user.displayName,
      category: "account",
      action: "board.role",
      boardId: data.boardId,
      summary: `دسترسی «${u[0].display_name}» به این تخته را ${data.role === "viewer" ? "«فقط خواندن»" : "«عضو (ویرایش)»"} کرد`,
    });
    return { ok: true };
  });
