/**
 * One safe way to write a CSV cell.
 * - quotes cells that need it
 * - neutralises spreadsheet formulas: a value such as `=HYPERLINK("http://…")` would otherwise be
 *   executed by Excel / Sheets when somebody opens the exported file.
 */
export function csvCell(v: string | number | null | undefined): string {
  let s = String(v ?? "");
  if (/^[=+@\t\r]/.test(s) || /^-(?!\d)/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
