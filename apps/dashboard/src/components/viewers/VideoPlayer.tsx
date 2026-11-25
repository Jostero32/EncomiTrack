"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";

function fmt(t: number) {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Reproductor minimalista para archivos de video directos (subidos al volumen, MP4/WebM). */
export function VideoPlayer({ src, title }: { src: string; title: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!playing) return setIdle(false);
    const t = setTimeout(() => setIdle(true), 2200);
    return () => clearTimeout(t);
  }, [playing, time]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div
      ref={wrap}
      className={clsx("group relative aspect-video overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10", idle && "cursor-none")}
      onMouseMove={() => setIdle(false)}
    >
      <video
        ref={video}
        src={src}
        title={title}
        className="h-full w-full"
        playsInline
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {!playing && (
        <button onClick={toggle} className="absolute inset-0 flex items-center justify-center bg-black/20" aria-label="Reproducir">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-uta-900 shadow-2xl transition group-hover:scale-105">
            <Play className="ml-1 h-6 w-6 fill-current" />
          </span>
        </button>
      )}

      <div
        className={clsx(
          "absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-white transition-opacity",
          playing && idle ? "opacity-0" : "opacity-100",
        )}
      >
        <button onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"} className="rounded p-1 hover:bg-white/10">
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
        <span className="w-10 text-[11px] tabular-nums text-white/80">{fmt(time)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={(e) => {
            if (video.current) video.current.currentTime = Number(e.target.value);
          }}
          className="video-range flex-1"
          style={{ ["--p" as string]: `${pct}%` }}
          aria-label="Progreso"
        />
        <span className="w-10 text-right text-[11px] tabular-nums text-white/60">{fmt(duration)}</span>
        <button
          onClick={() => {
            if (!video.current) return;
            video.current.muted = !video.current.muted;
            setMuted(video.current.muted);
          }}
          className="rounded p-1 hover:bg-white/10"
          aria-label="Silenciar"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button onClick={() => void wrap.current?.requestFullscreen()} className="rounded p-1 hover:bg-white/10" aria-label="Pantalla completa">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
