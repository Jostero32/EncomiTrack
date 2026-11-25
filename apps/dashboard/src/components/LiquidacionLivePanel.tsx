import { CheckCircle2, CircleDot, Radio } from "lucide-react";
import clsx from "clsx";
import type { LiquidacionLive } from "@/lib/liquidacion";

const ESTADO_STYLE: Record<string, string> = {
  Finalizado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Paz y salvo aprobado": "bg-uta-50 text-uta-700 ring-uta-200",
  "En proceso": "bg-amber-50 text-amber-700 ring-amber-200",
};

function fecha(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function money(v: string) {
  const n = Number(v);
  return isFinite(n) ? `$${n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : v;
}

export function LiquidacionLivePanel({ data, systemUrl }: { data: LiquidacionLive; systemUrl: string }) {
  const d = data.dashboard;
  const stats = [
    { label: "Trabajadores", value: d.totalTrabajadores },
    { label: "Activos", value: d.activos },
    { label: "Expedientes", value: d.totalExpedientes },
    { label: "En proceso", value: d.enProceso },
    { label: "Paz y salvo pend.", value: d.pazSalvoPendientes },
    { label: "Finalizados", value: d.finalizados },
  ];
  const areas = Array.from(new Set(data.requisitos.map((r) => r.departamento)));
  const actualizado = new Date(data.fetchedAt).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guayaquil",
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-4 sm:px-7">
        <div>
          <p className="eyebrow inline-flex items-center gap-1.5">
            <Radio className="h-3 w-3 animate-pulse text-emerald-500" /> Datos en vivo
          </p>
          <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-ink-900">
            {data.empresa?.razonSocial ?? "EncomiTrack"} · Desvinculaciones
          </h3>
        </div>
        <p className="text-[11.5px] text-ink-400">
          Fuente: API del sistema · actualizado {actualizado}
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-px bg-ink-100 sm:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white px-5 py-4">
            <dt className="text-[11px] text-ink-500">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-uta-900">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="thin-scroll overflow-x-auto border-t border-ink-100">
          <table className="min-w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-500">
                <th className="px-6 py-3 font-medium sm:px-7">Expediente</th>
                <th className="px-3 py-3 font-medium">Trabajador</th>
                <th className="px-3 py-3 font-medium">Causa</th>
                <th className="px-3 py-3 text-right font-medium">Remuneración</th>
                <th className="px-3 py-3 font-medium">Salida</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.expedientes.map((e) => (
                <tr key={e.id} className="hover:bg-paper">
                  <td className="whitespace-nowrap px-6 py-3 font-medium tabular-nums text-ink-900 sm:px-7">{e.numero}</td>
                  <td className="px-3 py-3">
                    <span className="block whitespace-nowrap text-ink-900">
                      {e.trabajador ? `${e.trabajador.nombres} ${e.trabajador.apellidos}` : "—"}
                    </span>
                    <span className="block whitespace-nowrap text-[11.5px] text-ink-400">{e.cargo}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-700">{e.causa}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink-700">{money(e.remuneracion)}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-ink-700">{fecha(e.fechaSalida)}</td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <span
                      className={clsx(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                        ESTADO_STYLE[e.estado] ?? "bg-ink-100 text-ink-700 ring-ink-200",
                      )}
                    >
                      {e.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="border-t border-ink-100 bg-paper/60 px-6 py-5 sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Plantilla de paz y salvo</p>
          <ul className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {areas.map((area) => (
              <li key={area}>
                <p className="text-[12px] font-semibold text-ink-900">{area}</p>
                <ul className="mt-1 space-y-1">
                  {data.requisitos
                    .filter((r) => r.departamento === area)
                    .map((r) => (
                      <li key={r.id} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-700">
                        {r.respuestaEsperada === "SI" ? (
                          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <CircleDot className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />
                        )}
                        <span>
                          {r.pregunta} <span className="text-ink-400">→ {r.respuestaEsperada}</span>
                        </span>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-ink-200/70 pt-4">
          {data.empresa && (
            <div className="text-[11.5px] leading-relaxed text-ink-500">
              <p>
                Elabora: <span className="text-ink-700">{data.empresa.elaboradoNombre}</span> · {data.empresa.elaboradoCargo}
              </p>
              <p>
                Revisa: <span className="text-ink-700">{data.empresa.revisadoNombre}</span> · {data.empresa.revisadoCargo}
              </p>
              <p>
                Aprueba: <span className="text-ink-700">{data.empresa.aprobadoNombre}</span> · {data.empresa.aprobadoCargo}
              </p>
            </div>
          )}
          <a href={systemUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-uta-700 hover:text-uta-900">
            Gestionar en el sistema →
          </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
