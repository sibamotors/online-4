import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "./db";
import { authMiddleware, requireBoardAction } from "./session-middleware";
import { nid } from "./utils";
import { parse } from "./validate";

export type CardFile = {
  id: string;
  fileId: string;
  name: string;
  version: number;
  mime: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
};

const id100 = z.string().min(1).max(100);

export const listCardFiles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ cardId: id100 })))
  .handler(async ({ data }): Promise<CardFile[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; file_id: string; name: string; version: number; mime: string; size_bytes: number; uploaded_by: string; display_name: string | null; created_at: string }>`
      select f.id, f.file_id, f.name, f.version, f.mime, f.size_bytes, f.uploaded_by, u.display_name, f.created_at
      from app_card_files f left join login_users u on u.username = f.uploaded_by
      where f.card_id = ${data.cardId}
      order by f.name, f.version desc
    `;
    return rows.map((r) => ({
      id: r.id,
      fileId: r.file_id,
      name: r.name,
      version: r.version,
      mime: r.mime,
      sizeBytes: r.size_bytes,
      uploadedBy: r.uploaded_by,
      uploadedByName: r.display_name ?? r.uploaded_by,
      createdAt: r.created_at,
    }));
  });

/** Attaches a file I already uploaded (uploadAppFile) to a card; the same name again becomes version 2, 3, … */
export const attachCardFile = createServerFn({ method: "POST" })
  .middleware([requireBoardAction("edit_card")])
  .validator(parse(z.object({ cardId: id100, fileId: id100 })))
  .handler(async ({ data, context }): Promise<{ ok: true; version: number } | { ok: false; error: string }> => {
    const { readWorkspaceRaw, findCard } = await import("./server/workspace-raw.server");
    const ws = await readWorkspaceRaw();
    const hit = ws ? findCard(ws, data.cardId) : null;
    if (!hit) return { ok: false, error: "کارت پیدا نشد." };
    await (await import("./server/board-roles.server")).assertBoardWritable(context.user, hit.board.id);

    const sql = await getSql();
    const f = await sql<{ filename: string; mime: string; size_bytes: number }>`
      select filename, mime, size_bytes from app_files where id = ${data.fileId} and uploaded_by = ${context.user.username}
    `;
    if (!f[0]) return { ok: false, error: "فایل پیدا نشد." };
    const dup = await sql<{ id: string }>`select id from app_card_files where card_id = ${data.cardId} and file_id = ${data.fileId}`;
    if (dup.length > 0) return { ok: false, error: "این فایل قبلاً پیوست شده است." };
    const count = await sql<{ n: number }>`select count(*)::int as n from app_card_files where card_id = ${data.cardId}`;
    if ((count[0]?.n ?? 0) >= 100) return { ok: false, error: "تعداد پیوست‌های این کارت به حد مجاز رسیده است." };

    const v = await sql<{ v: number }>`select coalesce(max(version), 0)::int as v from app_card_files where card_id = ${data.cardId} and name = ${f[0].filename}`;
    const version = (v[0]?.v ?? 0) + 1;
    await sql`
      insert into app_card_files (id, card_id, board_id, file_id, name, version, mime, size_bytes, uploaded_by)
      values (${nid()}, ${data.cardId}, ${hit.board.id}, ${data.fileId}, ${f[0].filename}, ${version}, ${f[0].mime}, ${f[0].size_bytes}, ${context.user.username})
    `;
    const { audit } = await import("./server/audit.server");
    await audit({
      actor: context.user.username,
      actorName: context.user.displayName,
      category: "card",
      action: "card.file",
      boardId: hit.board.id,
      boardTitle: hit.board.title,
      cardId: hit.card.id,
      cardTitle: hit.card.title,
      summary: `فایل «${f[0].filename}» (نسخه ${version}) را به کارت «${hit.card.title}» پیوست کرد`,
    });
    return { ok: true, version };
  });

/** Removes the attachment (the uploader or an admin). */
export const removeCardFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ id: id100 })))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    const rows = await sql<{ board_id: string }>`
      delete from app_card_files where id = ${data.id} and (uploaded_by = ${context.user.username} or ${context.user.isAdmin}) returning board_id
    `;
    if (rows[0]) await (await import("./server/board-roles.server")).assertBoardWritable(context.user, rows[0].board_id).catch(() => undefined);
    return { ok: rows.length > 0 };
  });
