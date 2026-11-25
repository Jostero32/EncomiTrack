"use client";

import { useState } from "react";
import clsx from "clsx";

export function ImageViewer({ url, alt }: { url: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className={clsx("thin-scroll h-full bg-[#EEF2F6] p-6", zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        onClick={() => setZoomed((z) => !z)}
        className={clsx(
          "rounded-lg shadow-lift transition",
          zoomed ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain",
        )}
      />
    </div>
  );
}
