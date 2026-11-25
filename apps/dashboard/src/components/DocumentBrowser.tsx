"use client";

import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { ArrowUpRight, FileSpreadsheet, FileText, FileType2, Film, ImageIcon, Link2, Plus, Search, Trash2 } from "lucide-react";
import { deleteDocument } from "@/app/actions";
import type { Doc, DocKind, ModuleSlug } from "@/lib/types";
import { Modal } from "./Modal";
import { usePreview } from "./preview/PreviewProvider";
import { UploadDialog, type UploadConfig } from "./UploadDialog";

const KIND_ICON: Record<DocKind, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  docx: FileType2,
  image: ImageIcon,
  video: Film,
  link: Link2,
};

type Filter = "all" | 1 | 2;

export function DocumentBrowser({
  docs,
  module,
  moduleTitle,
  isAdmin,
  upload,
}: {
  docs: Doc[];
  module: ModuleSlug;
  moduleTitle: string;
  isAdmin: boolean;
  upload: UploadConfig | null;
}) {
  const { open } = usePreview();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Doc | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter(
      (d) =>
        (filter === "all" || d.parcial === filter) &&
        (!q || `${d.title} ${d.summary ?? ""} ${d.deliverableType}`.toLowerCase().includes(q)),
    );
  }, [docs, filter, query]);

  const groups = ([1, 2] as const)
    .map((p) => ({ parcial: p, items: visible.filter((d) => d.parcial === p) }))
    .filter((g) => g.items.length);

  const count = (p: Filter) => (p === "all" ? docs.length : docs.filter((d) => d.parcial === p).length);

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5 text-[13px]">
          {(["all", 1, 2] as Filter[]).filter((f) => f === "all" || count(f) > 0).map((f) => (
            <button
              key={String(f)}
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-md px-3 py-1.5 transition",
                filter === f ? "bg-uta-900 font-medium text-white shadow-sm" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {f === "all" ? "Todos" : f === 1 ? "Primer parcial" : "Segundo parcial"}
              <span className={clsx("ml-1.5 tabular-nums", filter === f ? "text-white/60" : "text-ink-400")}>{count(f)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en el módulo" className="field w-full py-1.5 pl-8 sm:w-56" />
          </label>
          {isAdmin && upload && (
            <button onClick={() => setUploading(true)} className="btn-primary whitespace-nowrap py-1.5">
              <Plus className="h-4 w-4" /> Agregar
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {groups.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 px-6 py-12 text-center text-sm text-ink-500">
            No hay documentos que coincidan.
          </p>
        )}
        {groups.map((g) => (
          <div key={g.parcial}>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-[13px] font-semibold text-ink-900">{g.parcial === 1 ? "Primer parcial" : "Segundo parcial"}</h3>
              <span className="h-px flex-1 bg-ink-200" />
            </div>
            <ul className="divide-y divide-ink-200/70 overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card">
              {g.items.map((d) => {
                const Icon = KIND_ICON[d.kind];
                return (
                  <li key={d.id} className="group relative">
                    <button
                      onClick={() => open({ type: "doc", doc: d, moduleTitle })}
                      className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-uta-50/60 sm:px-6"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-uta-50 text-uta-700 ring-1 ring-inset ring-uta-100">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[14.5px] font-medium tracking-tight text-ink-900">{d.title}</span>
                          {d.featured && <span className="rounded bg-uta-800 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">Integrador</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {[d.deliverableType, d.modality, d.date].filter(Boolean).join(" · ")}
                        </span>
                        {d.summary && <span className="mt-2 line-clamp-2 block text-[13px] leading-relaxed text-ink-700">{d.summary}</span>}
                        {d.highlights.length > 0 && (
                          <span className="mt-3 flex flex-wrap gap-1.5">
                            {d.highlights.slice(0, 3).map((h) => (
                              <span key={h.label} className="chip">
                                <span className="text-ink-500">{h.label}</span>
                                <span className="font-semibold tabular-nums text-uta-800">{h.value}</span>
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-400 opacity-0 transition group-hover:opacity-100" />
                    </button>
                    {isAdmin && d.deletable && (
                      <button
                        onClick={() => {
                          setDelError(null);
                          setToDelete(d);
                        }}
                        className="absolute bottom-3 right-4 rounded-md p-1.5 text-ink-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Eliminar ${d.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {upload && (
        <UploadDialog open={uploading} onClose={() => setUploading(false)} module={module} moduleTitle={moduleTitle} config={upload} />
      )}

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Eliminar documento" size="sm">
        <p className="text-sm leading-relaxed text-ink-700">
          Se eliminará <strong className="font-semibold text-ink-900">{toDelete?.title}</strong> del índice y su archivo del
          servidor. Esta acción no se puede deshacer.
        </p>
        {delError && <p className="mt-3 text-sm text-red-600">{delError}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setToDelete(null)}>
            Cancelar
          </button>
          <button
            className="btn bg-red-600 text-white hover:bg-red-700"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!toDelete) return;
                const res = await deleteDocument(toDelete.id);
                if (res.ok) setToDelete(null);
                else setDelError(res.error ?? "No se pudo eliminar.");
              })
            }
          >
            {pending ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
