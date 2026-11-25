"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ArrowUpRight, Download, ExternalLink, Info, X } from "lucide-react";
import { formatBytes, hostOf, kindLabel, videoEmbedUrl } from "@/lib/format";
import type { Previewable } from "@/lib/types";
import { EmbedFrame } from "../viewers/EmbedFrame";
import { ImageViewer } from "../viewers/ImageViewer";
import { VideoPlayer } from "../viewers/VideoPlayer";
import { ViewerLoading } from "../viewers/ViewerState";

const PdfViewer = dynamic(() => import("../viewers/PdfViewer"), { ssr: false, loading: () => <ViewerLoading /> });
const SheetViewer = dynamic(() => import("../viewers/SheetViewer"), { ssr: false, loading: () => <ViewerLoading /> });
const DocxViewer = dynamic(() => import("../viewers/DocxViewer"), { ssr: false, loading: () => <ViewerLoading /> });

export function PreviewDrawer({ item, onClose }: { item: Previewable | null; onClose: () => void }) {
  // Mantener el último item durante la animación de salida
  const [shown, setShown] = useState<Previewable | null>(null);
  const [visible, setVisible] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (item) {
      setShown(item);
      setInfoOpen(false);
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      document.body.style.overflow = "";
      const t = setTimeout(() => setShown(null), 280);
      return () => clearTimeout(t);
    }
  }, [item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!shown || typeof document === "undefined") return null;

  const isDoc = shown.type === "doc";
  const title = isDoc ? shown.doc.title : shown.system.title;
  const openUrl = isDoc ? shown.doc.fileUrl ?? shown.doc.externalUrl : shown.system.url;
  const downloadUrl = isDoc ? shown.doc.fileUrl : null;

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={clsx(
          "absolute inset-0 bg-uta-950/45 backdrop-blur-[3px] transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <section
        className={clsx(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-paper shadow-drawer transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] sm:w-[min(1180px,94vw)] sm:rounded-l-2xl",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Cabecera */}
        <header className="flex items-start gap-4 border-b border-ink-200/70 bg-white px-5 py-4 sm:rounded-tl-2xl sm:px-7">
          <div className="min-w-0 flex-1">
            <p className="eyebrow truncate">
              {shown.moduleTitle}
              {isDoc && <> · {shown.doc.parcial === 1 ? "Primer parcial" : "Segundo parcial"}</>}
              {!isDoc && <> · Sistema desarrollado</>}
            </p>
            <h2 className="mt-1 truncate text-[17px] font-semibold tracking-tight text-ink-900 sm:text-lg">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setInfoOpen((v) => !v)}
              className={clsx("btn-ghost px-2.5 xl:hidden", infoOpen && "bg-ink-100 text-ink-900")}
              aria-label="Detalles"
            >
              <Info className="h-4 w-4" />
            </button>
            {downloadUrl && (
              <a href={downloadUrl} download className="btn-ghost px-2.5" aria-label="Descargar" title="Descargar">
                <Download className="h-4 w-4" />
              </a>
            )}
            {openUrl && (
              <a href={openUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2.5" aria-label="Abrir en pestaña nueva" title="Abrir en pestaña nueva">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <span className="mx-1 h-5 w-px bg-ink-200" />
            <button onClick={onClose} className="btn-ghost px-2.5" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Cuerpo */}
        <div className="relative flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">{visible || item ? <Viewer item={shown} /> : null}</div>
          <aside
            className={clsx(
              "thin-scroll w-[320px] shrink-0 overflow-y-auto border-l border-ink-200/70 bg-white px-6 py-6",
              "absolute inset-y-0 right-0 z-10 shadow-lift transition-transform duration-200 xl:static xl:translate-x-0 xl:shadow-none",
              infoOpen ? "translate-x-0" : "translate-x-full",
            )}
          >
            <Details item={shown} />
          </aside>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function Viewer({ item }: { item: Previewable }) {
  if (item.type === "system") return <EmbedFrame url={item.system.url} title={item.system.title} />;
  const doc = item.doc;
  if (!doc.fileUrl && !doc.externalUrl) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink-500">
        El archivo de este documento no está cargado en este servidor. Su resumen y datos clave se muestran en el panel lateral.
      </div>
    );
  }
  switch (doc.kind) {
    case "pdf":
      return doc.fileUrl ? <PdfViewer url={doc.fileUrl} /> : <EmbedFrame url={doc.externalUrl!} title={doc.title} />;
    case "xlsx":
    case "csv":
      return <SheetViewer url={doc.fileUrl!} csv={doc.kind === "csv"} />;
    case "docx":
      return <DocxViewer url={doc.fileUrl!} />;
    case "image":
      return <ImageViewer url={doc.fileUrl ?? doc.externalUrl!} alt={doc.title} />;
    case "video": {
      const embed = videoEmbedUrl(doc.externalUrl ?? doc.fileUrl);
      return (
        <div className="flex h-full items-center justify-center bg-uta-950 p-4 sm:p-8">
          <div className="w-full max-w-5xl">
            {embed ? (
              <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10">
                <iframe src={embed} title={doc.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
            ) : (
              <VideoPlayer src={(doc.fileUrl ?? doc.externalUrl)!} title={doc.title} />
            )}
          </div>
        </div>
      );
    }
    case "link":
    default:
      return <EmbedFrame url={(doc.externalUrl ?? doc.fileUrl)!} title={doc.title} />;
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-[13px]">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function Details({ item }: { item: Previewable }) {
  if (item.type === "system") {
    const s = item.system;
    return (
      <div className="space-y-6">
        <section>
          <p className="eyebrow text-ink-500">Descripción</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.description}</p>
        </section>
        <dl className="divide-y divide-ink-100 border-y border-ink-100">
          <Row label="Módulo" value={item.moduleTitle} />
          <Row label="Documentado en" value={s.source} />
          <Row label="Servidor" value={hostOf(s.url)} />
        </dl>
        <a href={s.url} target="_blank" rel="noreferrer" className="btn-outline w-full">
          Abrir sistema <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  const d = item.doc;
  const size = formatBytes(d.sizeBytes);
  const linked = d.externalUrl && d.kind !== "video" && d.kind !== "link" ? d.externalUrl : null;
  return (
    <div className="space-y-6">
      {d.summary && (
        <section>
          <p className="eyebrow text-ink-500">Resumen y resultado</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{d.summary}</p>
        </section>
      )}

      {d.highlights.length > 0 && (
        <section className="grid grid-cols-2 gap-2">
          {d.highlights.map((h) => (
            <div key={h.label} className="rounded-xl border border-ink-200/80 bg-paper px-3 py-2.5">
              <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-500">{h.label}</p>
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums tracking-tight text-uta-800">{h.value}</p>
            </div>
          ))}
        </section>
      )}

      <dl className="divide-y divide-ink-100 border-y border-ink-100">
        <Row label="Parcial" value={d.parcial === 1 ? "Primero" : "Segundo"} />
        <Row label="Entregable" value={d.deliverableType} />
        {d.modality && <Row label="Modalidad" value={d.modality} />}
        {d.date && <Row label="Fecha" value={d.date} />}
        <Row label="Formato" value={kindLabel[d.kind]} />
        {size && <Row label="Tamaño" value={size} />}
      </dl>

      {linked && (
        <a href={linked} target="_blank" rel="noreferrer" className="btn-outline w-full">
          Recurso vinculado · {hostOf(linked)} <ArrowUpRight className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
