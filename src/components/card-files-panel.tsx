import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Paperclip, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { attachCardFile, listCardFiles, removeCardFile, type CardFile } from "@/lib/card-files";
import { formatFileSize, readFileAsBase64 } from "@/lib/chat-file";
import { downloadAppFile } from "@/lib/download-file";
import { getAppFile, uploadAppFile } from "@/lib/files";
import { useTranslation } from "@/lib/i18n";
import { useLocalSession } from "@/lib/local-session";
import type { Card } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const PREVIEWABLE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);

/** Files on a card: upload, new versions, preview of pictures and PDFs, download. */
export function CardFilesPanel({ card }: { card: Card }) {
  const { lang } = useTranslation();
  const L = (fa: string, en: string) => (lang === "en" ? en : fa);
  const { user, isAdmin } = useLocalSession();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<{ name: string; mime: string; url: string } | null>(null);

  const q = useQuery({ queryKey: ["card-files", card.id], queryFn: () => listCardFiles({ data: { cardId: card.id } }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["card-files", card.id] });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const p = await readFileAsBase64(file);
      const up = await uploadAppFile({ data: { filename: p.name, mime: p.mime, sizeBytes: p.size, dataBase64: p.data } });
      if (!up.ok) throw new Error(up.error);
      const att = await attachCardFile({ data: { cardId: card.id, fileId: up.id } });
      if (!att.ok) throw new Error(att.error);
      return att.version;
    },
    onSuccess: (version) => {
      toast.success(version > 1 ? L(`نسخه‌ی ${version} ثبت شد.`, `Version ${version} saved.`) : L("فایل پیوست شد.", "File attached."));
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : L("پیوست نشد.", "Could not attach.")),
  });
  const remove = useMutation({ mutationFn: (id: string) => removeCardFile({ data: { id } }), onSuccess: refresh });

  async function open(f: CardFile) {
    const res = await getAppFile({ data: { id: f.fileId } });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const bin = atob(res.dataBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    setPreview({ name: f.name, mime: res.mime, url: URL.createObjectURL(new Blob([bytes], { type: res.mime })) });
  }
  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  // newest version first, grouped by name
  const groups = new Map<string, CardFile[]>();
  for (const f of q.data ?? []) groups.set(f.name, [...(groups.get(f.name) ?? []), f]);

  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-[13px]">
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload.mutate(file);
        }}
      />
      <Button size="sm" variant="secondary" disabled={upload.isPending} onClick={() => input.current?.click()}>
        <Paperclip className="size-4" />
        {upload.isPending ? L("در حال ارسال…", "Uploading…") : L("افزودن فایل", "Add a file")}
      </Button>
      <p className="text-[11px] text-subtle">
        {L("تا ۵ مگابایت. فایلی با همان نام دوباره بفرستید تا نسخه‌ی جدید ثبت شود.", "Up to 5 MB. Upload the same name again to add a new version.")}
      </p>

      {[...groups.entries()].map(([name, versions]) => (
        <div key={name} className="rounded-md bg-surface-2 p-2">
          {versions.map((f, i) => (
            <div key={f.id} className={i === 0 ? "flex items-center gap-2" : "mt-1 flex items-center gap-2 text-[12px] text-muted"}>
              <span className="min-w-0 flex-1 truncate">
                {i === 0 ? <b className="font-medium">{f.name}</b> : null}
                {versions.length > 1 && <span className="ms-1 rounded bg-accent-soft px-1.5 text-[10px]">v{f.version}</span>}
                <span className="ms-2 text-[11px] text-subtle">
                  {f.uploadedByName} · {formatFileSize(f.sizeBytes)}
                </span>
              </span>
              {PREVIEWABLE.has(f.mime) && (
                <button type="button" aria-label={L("پیش‌نمایش", "Preview")} className="text-muted hover:text-accent" onClick={() => void open(f)}>
                  <Eye className="size-4" />
                </button>
              )}
              <button
                type="button"
                aria-label={L("دانلود", "Download")}
                className="text-muted hover:text-accent"
                onClick={() => void downloadAppFile(f.fileId, f.name).then((err) => err && toast.error(err))}
              >
                <Download className="size-4" />
              </button>
              {(f.uploadedBy === user?.username || isAdmin) && (
                <button type="button" aria-label={L("حذف", "Delete")} className="text-subtle hover:text-danger" onClick={() => remove.mutate(f.id)}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      {preview && (
        <Dialog open onOpenChange={(o) => !o && closePreview()}>
          <DialogContent className="max-h-[92vh] max-w-4xl overflow-auto">
            <DialogTitle className="truncate">{preview.name}</DialogTitle>
            <DialogDescription className="sr-only">{L("پیش‌نمایش فایل", "File preview")}</DialogDescription>
            {preview.mime === "application/pdf" ? (
              <iframe title={preview.name} src={preview.url} className="h-[75vh] w-full rounded-md border border-border" />
            ) : (
              <img src={preview.url} alt={preview.name} className="mx-auto max-h-[75vh] max-w-full rounded-md object-contain" />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
