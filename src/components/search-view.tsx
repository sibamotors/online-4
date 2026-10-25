import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { listBoards } from "@/lib/local-db";
import { requestOpenCard } from "@/lib/open-card";
import {
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
  searchAll,
  type SavedSearch,
  type SearchHit,
  type SearchKind,
} from "@/lib/search";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const KIND_LABEL: Record<SearchKind, [string, string]> = {
  card: ["کارت", "Cards"],
  comment: ["نظر", "Comments"],
  checklist: ["چک‌لیست", "Checklists"],
  message: ["پیام", "Messages"],
  report: ["گزارش", "Reports"],
};
const ALL_KINDS = Object.keys(KIND_LABEL) as SearchKind[];

export function SearchView({ initialQuery }: { initialQuery?: string }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState(initialQuery ?? "");
  const [query, setQuery] = useState(initialQuery?.trim() ?? "");
  const [kinds, setKinds] = useState<SearchKind[]>([]);
  const [boardId, setBoardId] = useState("");
  const [mine, setMine] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setText(initialQuery);
      setQuery(initialQuery.trim());
    }
  }, [initialQuery]);

  const boardsQ = useQuery({ queryKey: ["boards"], queryFn: () => listBoards() });
  const savedQ = useQuery({ queryKey: ["saved-searches"], queryFn: () => listSavedSearches() });
  const filters = { kinds: kinds.length ? kinds : undefined, boardId: boardId || undefined, mine: mine || undefined };

  const resultsQ = useQuery({
    queryKey: ["search", query, kinds, boardId, mine],
    queryFn: () => searchAll({ data: { q: query, filters } }),
    enabled: query.length >= 2,
  });

  const saveMut = useMutation({
    mutationFn: (name: string) => saveSearch({ data: { name, query, filters: { kinds: filters.kinds, boardId: filters.boardId, mine: filters.mine } } }),
    onSuccess: (r) => {
      if (r.ok) void qc.invalidateQueries({ queryKey: ["saved-searches"] });
      else toast.error(r.error ?? L("ذخیره نشد.", "Could not save."));
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteSavedSearch({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });

  function apply(s: SavedSearch) {
    setText(s.query);
    setQuery(s.query);
    setKinds(s.filters.kinds ?? []);
    setBoardId(s.filters.boardId ?? "");
    setMine(Boolean(s.filters.mine));
  }

  function open(h: SearchHit) {
    if (h.target === "card" && h.boardId && h.cardId) {
      void navigate({ to: "/b/$boardId", params: { boardId: h.boardId } });
      requestOpenCard(h.cardId);
    } else if (h.target === "messages") void navigate({ to: "/messages" });
    else void navigate({ to: "/reports-inbox" });
  }

  const toggleKind = (k: SearchKind) => setKinds((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const results = resultsQ.data ?? [];
  const chip = (on: boolean) =>
    cn("rounded-full border px-3 py-1 text-[12px]", on ? "border-accent bg-accent-soft text-fg" : "border-border text-muted hover:text-fg");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 pb-24">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{L("جستجوی سراسری", "Search everything")}</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          {L("کارت‌ها، نظرها، چک‌لیست‌ها، پیام‌ها و گزارش‌های خودتان در یک جستجو.", "Cards, comments, checklists, and your own messages and reports in one search.")}
        </p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(text.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-3 size-4 text-muted" />
          <Input autoFocus className="ps-9" value={text} maxLength={100} placeholder={L("حداقل دو حرف…", "At least two characters…")} onChange={(e) => setText(e.target.value)} />
        </div>
        <Button type="submit" disabled={text.trim().length < 2}>
          {L("جستجو", "Search")}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {ALL_KINDS.map((k) => (
          <button key={k} type="button" className={chip(kinds.includes(k))} onClick={() => toggleKind(k)}>
            {L(KIND_LABEL[k][0], KIND_LABEL[k][1])}
          </button>
        ))}
        <select className="h-8 rounded-lg border border-border bg-surface px-2 text-[12px]" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
          <option value="">{L("همه‌ی تخته‌ها", "All boards")}</option>
          {(boardsQ.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[12px]">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          {L("فقط کارهای من", "Only my cards")}
        </label>
      </div>

      {(savedQ.data ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Bookmark className="size-4 text-muted" />
          {savedQ.data!.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-surface-2 ps-3 pe-1 text-[12px]">
              <button type="button" className="py-1 hover:text-accent" onClick={() => apply(s)}>
                {s.name}
              </button>
              <button type="button" aria-label={L("حذف", "Delete")} className="rounded-full p-1 text-subtle hover:text-danger" onClick={() => delMut.mutate(s.id)}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {query.length >= 2 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] text-muted">
              {resultsQ.isFetching ? L("در حال جستجو…", "Searching…") : `${results.length} ${L("نتیجه", "results")}`}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const name = window.prompt(L("نام این جستجو:", "Name for this search:"), query);
                if (name?.trim()) saveMut.mutate(name.trim());
              }}
            >
              <Bookmark className="size-4" />
              {L("ذخیره‌ی جستجو", "Save search")}
            </Button>
          </div>
          {results.length === 0 && !resultsQ.isFetching ? (
            <p className="py-8 text-center text-[13px] text-muted">{L("چیزی پیدا نشد.", "Nothing found.")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {results.map((h) => (
                <li key={`${h.kind}-${h.id}`}>
                  <button type="button" className="flex w-full items-start gap-3 px-3 py-2.5 text-start hover:bg-accent-soft/40" onClick={() => open(h)}>
                    <span className="mt-0.5 shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{L(KIND_LABEL[h.kind][0], KIND_LABEL[h.kind][1])}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{h.title}</span>
                      <span className="block truncate text-[12px] text-muted">{h.snippet}</span>
                      {h.boardTitle && <span className="block text-[11px] text-subtle">{h.boardTitle}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
