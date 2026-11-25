"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import clsx from "clsx";
import { ViewerError, ViewerLoading } from "./ViewerState";

const MAX_ROWS = 1000;

interface Sheet {
  name: string;
  rows: (string | number | boolean | null)[][];
  truncated: boolean;
}

export default function SheetViewer({ url, csv }: { url: string; csv?: boolean }) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const wb = csv
          ? XLSX.read(await res.text(), { type: "string" })
          : XLSX.read(await res.arrayBuffer(), { type: "array", cellDates: true });
        const parsed = wb.SheetNames.map((name) => {
          const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(wb.Sheets[name], {
            header: 1,
            raw: false,
            blankrows: false,
            defval: null,
          });
          return { name, rows: rows.slice(0, MAX_ROWS), truncated: rows.length > MAX_ROWS };
        });
        if (!cancelled) setSheets(parsed);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, csv]);

  if (error) return <ViewerError message={`No se pudo leer la hoja de cálculo (${error}).`} href={url} />;
  if (!sheets) return <ViewerLoading label="Procesando hoja de cálculo…" />;

  const sheet = sheets[active];
  const [header, ...body] = sheet?.rows ?? [[]];
  const cols = Math.max(0, ...(sheet?.rows ?? []).map((r) => r.length));

  return (
    <div className="flex h-full flex-col">
      {sheets.length > 1 && (
        <div className="thin-scroll flex gap-1 overflow-x-auto border-b border-ink-200/70 bg-white px-5 pt-3">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActive(i)}
              className={clsx(
                "-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 text-[13px] transition",
                i === active ? "border-uta-700 font-medium text-uta-800" : "border-transparent text-ink-500 hover:text-ink-900",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="thin-scroll flex-1 overflow-auto p-5">
        <div className="inline-block min-w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card">
          <table className="min-w-full border-collapse text-[13px]">
            <thead className="sticky top-0 bg-ink-100/80 backdrop-blur">
              <tr>
                <th className="w-10 border-b border-ink-200 px-2 py-2 text-right text-[11px] font-normal text-ink-400">#</th>
                {Array.from({ length: cols }, (_, c) => (
                  <th key={c} className="whitespace-nowrap border-b border-ink-200 px-3 py-2 text-left font-semibold text-ink-700">
                    {header?.[c] ?? ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r} className="even:bg-paper/70 hover:bg-uta-50">
                  <td className="border-b border-ink-100 px-2 py-1.5 text-right text-[11px] tabular-nums text-ink-400">{r + 2}</td>
                  {Array.from({ length: cols }, (_, c) => {
                    const v = row[c];
                    const numeric = typeof v === "number" || (typeof v === "string" && /^[-$\d.,% ]+$/.test(v) && /\d/.test(v));
                    return (
                      <td key={c} className={clsx("whitespace-nowrap border-b border-ink-100 px-3 py-1.5 text-ink-900", numeric && "text-right tabular-nums")}>
                        {v === null || v === undefined ? "" : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sheet?.truncated && <p className="mt-3 text-xs text-ink-500">Se muestran las primeras {MAX_ROWS} filas. Descarga el archivo para verlo completo.</p>}
      </div>
    </div>
  );
}
