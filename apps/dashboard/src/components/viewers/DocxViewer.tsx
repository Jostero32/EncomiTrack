"use client";

import { useEffect, useState } from "react";
import mammoth from "mammoth";
import { ViewerError, ViewerLoading } from "./ViewerState";

export default function DocxViewer({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await mammoth.convertToHtml({ arrayBuffer: await res.arrayBuffer() });
        if (!cancelled) setHtml(result.value);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) return <ViewerError message={`No se pudo convertir el documento (${error}).`} href={url} />;
  if (html === null) return <ViewerLoading label="Convirtiendo documento…" />;

  return (
    <div className="thin-scroll h-full overflow-auto bg-[#EEF2F6] px-4 py-8 sm:px-8">
      <article className="mx-auto max-w-[860px] rounded-md bg-white px-8 py-12 shadow-card sm:px-16">
        {/* mammoth genera HTML semántico sin scripts */}
        <div className="doc-prose" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
