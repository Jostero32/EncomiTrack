"use client";

import { useState } from "react";
import { ArrowUpRight, Maximize2, MonitorSmartphone, Play } from "lucide-react";
import { videoEmbedUrl } from "@/lib/format";
import type { Doc, SystemInfo } from "@/lib/types";
import { usePreview } from "./preview/PreviewProvider";
import { VideoPlayer } from "./viewers/VideoPlayer";

/** Video destacado del módulo: carga el reproductor solo al pulsar play. */
export function FeaturedVideo({ doc, moduleTitle }: { doc: Doc; moduleTitle: string }) {
  const [playing, setPlaying] = useState(false);
  const { open } = usePreview();
  const embed = videoEmbedUrl(doc.externalUrl ?? doc.fileUrl);

  return (
    <div className="overflow-hidden rounded-2xl bg-uta-950 shadow-lift ring-1 ring-uta-900">
      <div className="relative aspect-video">
        {playing && embed ? (
          <iframe src={embed} title={doc.title} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        ) : playing ? (
          <VideoPlayer src={(doc.fileUrl ?? doc.externalUrl)!} title={doc.title} />
        ) : (
          <button onClick={() => setPlaying(true)} className="group absolute inset-0 flex flex-col items-center justify-center text-white" aria-label={`Reproducir ${doc.title}`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(46,123,209,0.35),transparent_60%),radial-gradient(ellipse_at_80%_90%,rgba(0,51,102,0.9),transparent_60%)]" />
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:40px_40px]" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-uta-900 shadow-2xl transition duration-300 group-hover:scale-110">
              <Play className="ml-1 h-6 w-6 fill-current" />
            </span>
            <span className="relative mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-uta-400">{doc.deliverableType}</span>
            <span className="relative mt-1.5 px-6 text-center font-serif text-xl sm:text-2xl">{doc.title.replace(/^Video pitch —\s*/i, "")}</span>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-white/70">
        <p className="line-clamp-1 text-[13px]">{doc.summary}</p>
        <button onClick={() => open({ type: "doc", doc, moduleTitle })} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white">
          <Maximize2 className="h-3.5 w-3.5" /> Modo inmersivo
        </button>
      </div>
    </div>
  );
}

export function SystemCard({ system, moduleTitle }: { system: SystemInfo; moduleTitle: string }) {
  const { open } = usePreview();
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card transition hover:shadow-lift">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-uta-500 to-uta-800" />
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-uta-900 text-white shadow-sm">
          <MonitorSmartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Sistema desarrollado · {system.source}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink-900">{system.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{system.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => open({ type: "system", system, moduleTitle })} className="btn-primary">
            Abrir aquí
          </button>
          <a href={system.url} target="_blank" rel="noreferrer" className="btn-outline px-2.5" aria-label="Abrir en pestaña nueva">
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
