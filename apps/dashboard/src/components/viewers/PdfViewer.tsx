"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Minus, Plus } from "lucide-react";
import { ViewerError, ViewerLoading } from "./ViewerState";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const PAGE_GAP = 20;

export default function PdfViewer({ url }: { url: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [ratio, setRatio] = useState(1.414);
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.min(entry.contentRect.width - 48, 980)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageWidth = Math.max(280, Math.round(width * zoom));
  const pageHeight = Math.round(pageWidth * ratio);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !numPages) return;
    const page = Math.floor((el.scrollTop + el.clientHeight / 3) / (pageHeight + PAGE_GAP)) + 1;
    setCurrent(Math.min(Math.max(page, 1), numPages));
  }, [numPages, pageHeight]);

  return (
    <div className="relative h-full">
      <div ref={scrollRef} onScroll={onScroll} className="thin-scroll h-full overflow-auto bg-[#EEF2F6] px-6 py-6">
        <Document
          file={url}
          onLoadSuccess={async (pdf) => {
            setNumPages(pdf.numPages);
            const first = await pdf.getPage(1);
            const vp = first.getViewport({ scale: 1 });
            setRatio(vp.height / vp.width);
          }}
          loading={<ViewerLoading />}
          error={<ViewerError message="No se pudo cargar el PDF." href={url} />}
          className="flex flex-col items-center"
        >
          {Array.from({ length: numPages }, (_, i) => (
            <LazyPage key={i} index={i + 1} width={pageWidth} height={pageHeight} root={scrollRef} />
          ))}
        </Document>
      </div>

      {numPages > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-uta-950/85 px-2 py-1.5 text-white shadow-lift backdrop-blur">
            <button className="rounded-full p-1.5 hover:bg-white/10" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} aria-label="Alejar">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[44px] text-center text-[11px] tabular-nums text-white/70">{Math.round(zoom * 100)}%</span>
            <button className="rounded-full p-1.5 hover:bg-white/10" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))} aria-label="Acercar">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <span className="mx-1 h-4 w-px bg-white/20" />
            <span className="px-2 text-xs tabular-nums">
              {current} <span className="text-white/50">/ {numPages}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Renderiza la página solo cuando se acerca al viewport (documentos de 30+ páginas). */
function LazyPage({
  index,
  width,
  height,
  root,
}: {
  index: number;
  width: number;
  height: number;
  root: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index <= 2);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), {
      root: root.current,
      rootMargin: "1200px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [root, visible]);

  return (
    <div
      ref={ref}
      className="pdf-page overflow-hidden rounded-[3px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08),0_8px_24px_-12px_rgba(15,23,42,0.18)]"
      style={{ width, minHeight: height, marginBottom: PAGE_GAP }}
    >
      {visible && (
        <Page pageNumber={index} width={width} renderTextLayer={false} renderAnnotationLayer={false} loading={<div style={{ height }} />} />
      )}
    </div>
  );
}
