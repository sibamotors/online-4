import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { getBoard, listBoards } from "@/lib/local-db";
import {
  deleteRequestForm,
  listRequestFormsAdmin,
  saveRequestForm,
  type RequestField,
  type RequestFieldType,
  type RequestForm,
} from "@/lib/requests";
import { nid } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

const selectCls = "h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm";

type Draft = Omit<RequestForm, "id" | "boardTitle"> & { id?: string };

/** Admin screen: forms that let other people ask for something; every answer becomes a card. */
export function RequestFormsAdmin() {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const formsQ = useQuery({ queryKey: ["request-forms-admin"], queryFn: () => listRequestFormsAdmin() });
  const boardsQ = useQuery({ queryKey: ["boards"], queryFn: () => listBoards() });
  const reload = () => {
    void qc.invalidateQueries({ queryKey: ["request-forms-admin"] });
    void qc.invalidateQueries({ queryKey: ["request-forms"] });
  };
  const delMut = useMutation({ mutationFn: (id: string) => deleteRequestForm({ data: { id } }), onSuccess: reload });
  const toggleMut = useMutation({
    mutationFn: (f: RequestForm) =>
      saveRequestForm({
        data: {
          id: f.id,
          title: f.title,
          description: f.description,
          boardId: f.boardId,
          listId: f.listId,
          fields: f.fields,
          defaultPriority: f.defaultPriority,
          assigneePersonIds: f.assigneePersonIds,
          enabled: !f.enabled,
        },
      }),
    onSuccess: reload,
  });

  function blank(): Draft {
    return {
      title: "",
      description: "",
      boardId: boardsQ.data?.[0]?.id ?? "",
      listId: "",
      fields: [{ id: nid(), label: "", type: "text", required: true }],
      defaultPriority: "med",
      assigneePersonIds: [],
      enabled: true,
    };
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border p-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="size-4 text-accent" />
          {L("فرم‌های درخواست", "Request forms")}
        </p>
        <p className="mt-1 text-[12px] text-muted">
          {L(
            "هر کاربر وارد‌شده می‌تواند فرم را پر کند و یک کارت در ستونی که شما تعیین می‌کنید ساخته می‌شود؛ مسئول‌های تعیین‌شده هم خبردار می‌شوند. مثلاً «درخواست کالا از انبار».",
            "Any signed-in user can fill in a form; a card is created in the column you choose and the people in charge are notified. For example “goods request from the warehouse”.",
          )}
        </p>
      </div>

      {(formsQ.data ?? []).map((f) => (
        <div key={f.id} className="flex items-start gap-2 rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{f.title}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {L("تخته", "Board")}: {f.boardTitle} · {f.fields.length} {L("فیلد", "fields")}
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-[12px]">
            <input type="checkbox" checked={f.enabled} onChange={() => toggleMut.mutate(f)} />
            {L("فعال", "On")}
          </label>
          <Button
            size="sm"
            variant="ghost"
            aria-label={L("ویرایش", "Edit")}
            onClick={() =>
              setDraft({
                id: f.id,
                title: f.title,
                description: f.description,
                boardId: f.boardId,
                listId: f.listId,
                fields: f.fields,
                defaultPriority: f.defaultPriority,
                assigneePersonIds: f.assigneePersonIds,
                enabled: f.enabled,
              })
            }
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            aria-label={L("حذف", "Delete")}
            onClick={() => {
              if (window.confirm(L(`فرم «${f.title}» حذف شود؟`, `Delete the form “${f.title}”?`))) delMut.mutate(f.id);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      {formsQ.data?.length === 0 && <p className="py-4 text-center text-[13px] text-muted">{L("هنوز فرمی نیست.", "No forms yet.")}</p>}

      <Button onClick={() => setDraft(blank())} disabled={!boardsQ.data?.length}>
        <Plus className="size-4" />
        {L("فرم جدید", "New form")}
      </Button>

      {draft && (
        <FormEditor
          key={draft.id ?? "new"}
          draft={draft}
          boards={boardsQ.data ?? []}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function FormEditor(props: {
  draft: Draft;
  boards: { id: string; title: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const [d, setD] = useState<Draft>(props.draft);
  const boardQ = useQuery({
    queryKey: ["automation-board", d.boardId],
    queryFn: () => getBoard({ data: { boardId: d.boardId } }),
    enabled: Boolean(d.boardId),
  });
  const board = boardQ.data ?? null;
  // until the board is loaded, keep the list the form already has
  const listId = d.listId || board?.lists[0]?.id || "";

  const saveMut = useMutation({
    mutationFn: () => saveRequestForm({ data: { ...d, listId } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(L("ذخیره شد.", "Saved."));
        props.onSaved();
      } else toast.error(r.error);
    },
    onError: () => toast.error(L("ذخیره نشد؛ ورودی‌ها را بررسی کنید.", "Could not save; check the fields.")),
  });

  const setField = (i: number, patch: Partial<RequestField>) =>
    setD({ ...d, fields: d.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  return (
    <Dialog open onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle>{d.id ? L("ویرایش فرم", "Edit form") : L("فرم جدید", "New form")}</DialogTitle>
        <div className="mt-3 space-y-3">
          <label className="block text-[12px] text-muted">
            {L("عنوان فرم", "Form title")}
            <Input className="mt-1" value={d.title} maxLength={120} onChange={(e) => setD({ ...d, title: e.target.value })} />
          </label>
          <label className="block text-[12px] text-muted">
            {L("توضیح برای پرکننده (اختیاری)", "Hint for the person filling it in (optional)")}
            <Input className="mt-1" value={d.description} maxLength={500} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[12px] text-muted">
              {L("کارت در این تخته ساخته شود", "Create the card on board")}
              <select className={`${selectCls} mt-1`} value={d.boardId} onChange={(e) => setD({ ...d, boardId: e.target.value, listId: "", assigneePersonIds: [] })}>
                {props.boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] text-muted">
              {L("در ستون", "In column")}
              <select className={`${selectCls} mt-1`} value={listId} onChange={(e) => setD({ ...d, listId: e.target.value })}>
                {(board?.lists ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-[12px] text-muted">
            {L("اولویت کارت", "Card priority")}
            <select className={`${selectCls} mt-1`} value={d.defaultPriority} onChange={(e) => setD({ ...d, defaultPriority: e.target.value as Draft["defaultPriority"] })}>
              <option value="high">{L("بالا", "High")}</option>
              <option value="med">{L("متوسط", "Medium")}</option>
              <option value="low">{L("پایین", "Low")}</option>
            </select>
          </label>

          <div>
            <p className="text-[12px] text-muted">{L("مسئول رسیدگی (اعلان می‌گیرند)", "People in charge (they get notified)")}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {(board?.people ?? []).map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 text-[12px]">
                  <input
                    type="checkbox"
                    checked={d.assigneePersonIds.includes(p.id)}
                    onChange={(e) =>
                      setD({ ...d, assigneePersonIds: e.target.checked ? [...d.assigneePersonIds, p.id] : d.assigneePersonIds.filter((x) => x !== p.id) })
                    }
                  />
                  {p.firstName} {p.lastName}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold">{L("فیلدهای فرم", "Form fields")}</p>
            <div className="mt-1 space-y-2">
              {d.fields.map((f, i) => (
                <div key={f.id} className="space-y-2 rounded-lg border border-border p-2">
                  <div className="flex gap-2">
                    <Input
                      value={f.label}
                      maxLength={100}
                      placeholder={L("عنوان فیلد، مثلاً «نام کالا»", "Field label, e.g. “Item name”")}
                      onChange={(e) => setField(i, { label: e.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={L("حذف فیلد", "Remove field")}
                      disabled={d.fields.length === 1}
                      onClick={() => setD({ ...d, fields: d.fields.filter((_, j) => j !== i) })}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
                      value={f.type}
                      onChange={(e) => {
                        const type = e.target.value as RequestFieldType;
                        setField(i, { type, options: type === "select" ? (f.options ?? ["", ""]) : undefined, asDue: type === "date" ? f.asDue : undefined });
                      }}
                    >
                      <option value="text">{L("متن کوتاه", "Short text")}</option>
                      <option value="longtext">{L("متن بلند", "Long text")}</option>
                      <option value="number">{L("عدد", "Number")}</option>
                      <option value="date">{L("تاریخ", "Date")}</option>
                      <option value="select">{L("انتخاب از گزینه‌ها", "Choice")}</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-[12px]">
                      <input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} />
                      {L("اجباری", "Required")}
                    </label>
                    {f.type === "date" && (
                      <label className="flex items-center gap-1.5 text-[12px]">
                        <input type="checkbox" checked={Boolean(f.asDue)} onChange={(e) => setField(i, { asDue: e.target.checked })} />
                        {L("مهلت کارت باشد", "Use as the card's due date")}
                      </label>
                    )}
                  </div>
                  {f.type === "select" && (
                    <Input
                      value={(f.options ?? []).join("، ")}
                      placeholder={L("گزینه‌ها را با ویرگول فارسی (،) یا کاما جدا کنید", "Separate the choices with commas")}
                      onChange={(e) => setField(i, { options: e.target.value.split(/[،,]/).map((x) => x.trim()) })}
                      onBlur={() => setField(i, { options: (f.options ?? []).filter(Boolean) })}
                    />
                  )}
                </div>
              ))}
            </div>
            {d.fields.length < 20 && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={() => setD({ ...d, fields: [...d.fields, { id: nid(), label: "", type: "text", required: false }] })}
              >
                <Plus className="size-4" />
                {L("فیلد دیگر", "Another field")}
              </Button>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              disabled={saveMut.isPending || !d.title.trim() || d.fields.some((f) => !f.label.trim()) || !listId}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? L("در حال ذخیره…", "Saving…") : L("ذخیره", "Save")}
            </Button>
            <Button variant="secondary" onClick={props.onClose}>
              {L("انصراف", "Cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
