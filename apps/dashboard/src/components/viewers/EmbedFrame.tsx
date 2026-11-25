"use client";

import { useState } from "react";
import { ArrowUpRight, Globe } from "lucide-react";
import { hostOf } from "@/lib/format";
import { ViewerLoading } from "./ViewerState";

export function EmbedFrame({ url, title }: { url: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="flex h-full flex-col bg-[#EEF2F6] p-3 sm:p-5">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          </span>
          <span className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-ink-100 px-2.5 py-1 text-[11.5px] text-ink-500">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{hostOf(url)}{new URL(url).pathname}</span>
          </span>
          <a href={url} target="_blank" rel="noreferrer" className="text-ink-400 hover:text-ink-700" aria-label="Abrir en pestaña nueva">
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <div className="relative min-h-0 flex-1">
          {!loaded && (
            <div className="absolute inset-0">
              <ViewerLoading label="Cargando…" />
            </div>
          )}
          <iframe
            src={url}
            title={title}
            onLoad={() => setLoaded(true)}
            className="h-full w-full"
            allow="clipboard-write; fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}
