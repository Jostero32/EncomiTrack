"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { FileUp, Link2, Plus, X } from "lucide-react";
import { registerDocument } from "@/app/actions";
import { formatBytes, kindFromFileName, videoEmbedUrl } from "@/lib/format";
import { asset } from "@/lib/paths";
import type { DocKind, Highlight, ModuleSlug } from "@/lib/types";
import { Modal } from "./Modal";

export interface UploadConfig {
  maxBytes: number;
}
const DELIVERABLES = ["Tarea", "Taller", "Guía APE", "Práctica", "Actividad en clase", "Pitch", "Video pitch", "Infografía", "Evidencia", "Otro"];

export function UploadDialog({
  open,
  onClose,
  module,
  moduleTitle,
  config,
}: {
  open: boolean;
  onClose: () => void;
  module: ModuleSlug;
  moduleTitle: string;
  config: UploadConfig;
}) {
  const [source, setSource] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [linkKind, setLinkKind] = useState<DocKind>("video");
  const [title, setTitle] = useState("");
  const [parcial, setParcial] = useState<1 | 2>(2);
  const [deliverable, setDeliverable] = useState("Tarea");
  const [modality, setModality] = useState("Grupal");
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fileKind = file ? kindFromFileName(file.name) : null;

  const reset = () => {
    setFile(null);
    setLink("");
    setTitle("");
    setSummary("");
    setDate("");
    setHighlights([]);
    setError(null);
    setStep(null);
  };

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        if (!title.trim()) throw new Error("Escribe un título.");
        let storagePath: string | null = null;
        let kind: DocKind;
        if (source === "file") {
          if (!file) throw new Error("Selecciona un archivo.");
          if (!fileKind) throw new Error("Formato no soportado. Usa PDF, XLSX, CSV, DOCX, imagen o video.");
          if (file.size > config.maxBytes) {
            throw new Error(`El archivo supera ${formatBytes(config.maxBytes)}. Para videos grandes usa un enlace de Drive o YouTube.`);
          }
          kind = fileKind;
          setStep("Subiendo archivo…");
          const body = new FormData();
          body.append("file", file);
          body.append("module", module);
          const res = await fetch(asset("/api/upload"), { method: "POST", body });
          const out = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as {
            ok: boolean;
            path?: string;
            error?: string;
          };
          if (!out.ok || !out.path) throw new Error(out.error ?? "No se pudo subir el archivo.");
          storagePath = out.path;
        } else {
          if (!/^https?:\/\//i.test(link)) throw new Error("Ingresa un enlace válido (https://…).");
          kind = linkKind;
        }
        setStep("Registrando documento…");
        const res = await registerDocument({
          title,
          module,
          parcial,
          deliverableType: deliverable,
          modality,
          date,
          summary,
          highlights,
          kind,
          storagePath,
          externalUrl: source === "link" ? link.trim() : null,
          mimeType: file?.type || null,
          sizeBytes: file?.size ?? null,
        });
        if (!res.ok) throw new Error(res.error);
        reset();
        onClose();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setStep(null);
      }
    });

  return (
    <Modal open={open} onClose={onClose} title="Agregar documento" description={`Se registrará en el módulo «${moduleTitle}».`} size="lg">
      <div className="space-y-5">
        <div className="inline-flex rounded-lg border border-ink-200 p-0.5 text-[13px]">
          {(["file", "link"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={clsx("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5", source === s ? "bg-ink-100 font-medium text-ink-900" : "text-ink-500")}
            >
              {s === "file" ? <FileUp className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {s === "file" ? "Subir archivo" : "Enlace externo"}
            </button>
          ))}
        </div>

        {source === "file" ? (
          <label
            className={clsx(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition",
              file ? "border-uta-400 bg-uta-50/60" : "border-ink-200 hover:border-uta-400 hover:bg-uta-50/40",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) {
                setFile(f);
                if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }
            }}
          >
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.xlsx,.xls,.csv,.docx,.png,.jpg,.jpeg,.webp,.mp4,.webm"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
            <FileUp className="h-5 w-5 text-uta-600" />
            {file ? (
              <p className="mt-2 text-sm font-medium text-ink-900">
                {file.name} <span className="font-normal text-ink-500">· {formatBytes(file.size)}</span>
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm font-medium text-ink-900">Arrastra un archivo o haz clic para elegirlo</p>
                <p className="mt-1 text-xs text-ink-500">PDF, XLSX, CSV, DOCX, imágenes o video · máx. 50 MB</p>
              </>
            )}
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div>
              <span className="label">URL</span>
              <input className="field" placeholder="https://drive.google.com/file/d/…" value={link} onChange={(e) => setLink(e.target.value)} />
              {linkKind === "video" && link && !videoEmbedUrl(link) && (
                <p className="mt-1 text-xs text-amber-600">Se reproducirá como archivo directo. Para Drive o YouTube pega el enlace de compartir.</p>
              )}
            </div>
            <div>
              <span className="label">Tipo</span>
              <select className="field" value={linkKind} onChange={(e) => setLinkKind(e.target.value as DocKind)}>
                <option value="video">Video</option>
                <option value="link">Sitio / sistema</option>
                <option value="pdf">PDF</option>
                <option value="image">Imagen</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <span className="label">Título</span>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Tarea 13 — Rol de pagos" />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <span className="label">Parcial</span>
            <select className="field" value={parcial} onChange={(e) => setParcial(Number(e.target.value) as 1 | 2)}>
              <option value={1}>Primero</option>
              <option value={2}>Segundo</option>
            </select>
          </div>
          <div>
            <span className="label">Entregable</span>
            <select className="field" value={deliverable} onChange={(e) => setDeliverable(e.target.value)}>
              {DELIVERABLES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Modalidad</span>
            <select className="field" value={modality} onChange={(e) => setModality(e.target.value)}>
              <option>Grupal</option>
              <option>Individual</option>
            </select>
          </div>
          <div>
            <span className="label">Fecha</span>
            <input className="field" value={date} onChange={(e) => setDate(e.target.value)} placeholder="dd/mm/aaaa" />
          </div>
        </div>

        <div>
          <span className="label">Resumen / resultado obtenido</span>
          <textarea className="field min-h-[84px] resize-y" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resultado principal tal como consta en el documento." />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">Cifras clave (opcional)</span>
            <button
              type="button"
              onClick={() => setHighlights((h) => [...h, { label: "", value: "" }])}
              className="inline-flex items-center gap-1 text-xs font-medium text-uta-700 hover:text-uta-900"
            >
              <Plus className="h-3 w-3" /> Añadir
            </button>
          </div>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input className="field" placeholder="Concepto" value={h.label} onChange={(e) => setHighlights((hs) => hs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className="field w-40" placeholder="Valor" value={h.value} onChange={(e) => setHighlights((hs) => hs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" onClick={() => setHighlights((hs) => hs.filter((_, j) => j !== i))} className="btn-ghost px-2" aria-label="Quitar">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
          <span className="text-xs text-ink-500">{step}</span>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={submit} disabled={pending}>
              {pending ? "Guardando…" : "Guardar documento"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
