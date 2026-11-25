import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/paths";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ModuleIcon } from "@/components/ModuleIcon";
import { Notice } from "@/components/Notice";
import { OpenPreview } from "@/components/preview/PreviewProvider";
import { course, modules, moduleTitle, systems } from "@/lib/catalog";
import { getSnapshot } from "@/lib/data";
import type { Doc } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Cifras del semestre: se toman tal cual de los documentos integradores (no se recalculan). */
const KEY_FIGURES: { slug: string; label: string; caption: string }[] = [
  { slug: "guia-ape-1-plan-de-negocios", label: "Inversión inicial", caption: "Plan de negocios · APE 1" },
  { slug: "guia-ape-1-plan-de-negocios", label: "Punto de equilibrio", caption: "Plan de negocios · APE 1" },
  { slug: "guia-ape-3-contratacion-laboral", label: "Costo laboral", caption: "Costo mensual de nómina · APE 3" },
  { slug: "guia-ape-4-despidos-liquidaciones", label: "EXP-0001 neto", caption: "Liquidación por renuncia · APE 4" },
];

export default async function OverviewPage() {
  const snap = await getSnapshot();
  const docs = snap.documents;
  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const figures = KEY_FIGURES.flatMap((f) => {
    const doc = bySlug.get(f.slug);
    const h = doc?.highlights.find((x) => x.label === f.label);
    return doc && h ? [{ ...f, value: h.value, doc }] : [];
  });
  const timeline = ([1, 2] as const).map((p) => ({ parcial: p, items: docs.filter((d) => d.parcial === p) }));

  return (
    <div className="mx-auto max-w-[1160px] px-5 pb-24 pt-10 sm:px-10 lg:pt-14">
      {snap.warning && <Notice>{snap.warning}</Notice>}

      {/* Encabezado editorial */}
      <header className="animate-rise">
        <div className="flex items-center gap-3">
          <Image src={asset("/brand/uta-seal.png")} alt="" width={40} height={40} className="h-10 w-10" />
          <Image src={asset("/brand/fisei-seal.png")} alt="" width={40} height={40} className="h-10 w-10" />
          <span className="ml-1 h-6 w-px bg-ink-200" />
          <p className="eyebrow">{course.faculty.replace("Facultad de ", "")}</p>
        </div>
        <h1 className="mt-7 max-w-3xl font-serif text-[40px] font-semibold leading-[1.08] tracking-tight text-uta-900 sm:text-[52px]">
          {course.name}
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-500">
          Portafolio integrador del semestre: el recorrido completo de <span className="text-ink-900">{course.venture.split(" — ")[0]}</span>,
          desde la idea de negocio hasta su formalización tributaria y la gestión de nómina y liquidaciones.
        </p>
        <dl className="mt-8 grid gap-x-10 gap-y-4 border-y border-ink-200/80 py-5 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-ink-500">Docente</dt>
            <dd className="mt-0.5 font-medium text-ink-900">{course.teacher}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Equipo</dt>
            <dd className="mt-0.5 font-medium leading-snug text-ink-900">{course.team.join(" · ")}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Periodo</dt>
            <dd className="mt-0.5 font-medium text-ink-900">
              {course.cycle} · {course.level}
            </dd>
          </div>
        </dl>
      </header>

      {/* Cifras */}
      {figures.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow text-ink-500">Cifras del semestre</h2>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-200/70 bg-ink-200/70 lg:grid-cols-4">
            {figures.map((f) => (
              <OpenPreview
                key={f.label}
                item={{ type: "doc", doc: f.doc, moduleTitle: moduleTitle(f.doc.module) }}
                className="group bg-white px-5 py-5 text-left transition hover:bg-uta-50/50 sm:px-6"
              >
                <p className="text-xs text-ink-500">{f.label}</p>
                <p className="mt-2 text-[26px] font-semibold tabular-nums tracking-tight text-uta-900">{f.value}</p>
                <p className="mt-2 flex items-center gap-1 text-[11.5px] text-ink-400 group-hover:text-uta-700">
                  {f.caption} <ArrowUpRight className="h-3 w-3" />
                </p>
              </OpenPreview>
            ))}
          </div>
        </section>
      )}

      {/* Módulos */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink-900">Módulos</h2>
          <span className="text-xs text-ink-500">{docs.length} entregables · {systems.length} sistemas</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {modules.map((m, i) => {
            const mine = docs.filter((d) => d.module === m.slug);
            const p1 = mine.filter((d) => d.parcial === 1).length;
            const p2 = mine.length - p1;
            const sys = systems.filter((s) => s.module === m.slug).length;
            return (
              <Link
                key={m.slug}
                href={`/modulos/${m.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-uta-400/40 hover:shadow-lift"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-uta-50 text-uta-700 ring-1 ring-inset ring-uta-100 transition group-hover:bg-uta-800 group-hover:text-white group-hover:ring-uta-800">
                    <ModuleIcon name={m.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="font-serif text-[40px] font-semibold leading-none text-ink-100 transition group-hover:text-uta-100">
                    {String(m.number).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink-900">{m.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{m.tagline}</p>
                <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-500">
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    <span><strong className="font-semibold text-ink-900">{mine.length}</strong> entregables</span>
                    {p1 > 0 && <span>P1 · {p1}</span>}
                    {p2 > 0 && <span>P2 · {p2}</span>}
                    {sys > 0 && <span className="text-uta-700">+ sistema</span>}
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-uta-700" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recorrido */}
      <section className="mt-16">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink-900">Recorrido del semestre</h2>
        <p className="mt-1 text-sm text-ink-500">Todos los entregables en orden. Selecciona uno para previsualizarlo.</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {timeline.map((t) => (
            <div key={t.parcial}>
              <h3 className="text-[13px] font-semibold text-ink-900">
                {t.parcial === 1 ? "Primer parcial" : "Segundo parcial"}
                <span className="ml-2 font-normal text-ink-400">{t.items.length}</span>
              </h3>
              <ol className="relative mt-4 space-y-1 border-l border-ink-200 pl-5">
                {t.items.map((d) => (
                  <TimelineItem key={d.id} doc={d} />
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TimelineItem({ doc }: { doc: Doc }) {
  const mod = modules.find((m) => m.slug === doc.module)!;
  return (
    <li className="relative">
      <span className="absolute -left-[25px] top-[13px] h-2 w-2 rounded-full border-2 border-paper bg-uta-500 ring-1 ring-uta-200" />
      <OpenPreview
        item={{ type: "doc", doc, moduleTitle: mod.title }}
        className="group flex w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white hover:shadow-card"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] text-ink-900 group-hover:text-uta-800">{doc.title}</span>
          <span className="text-[11.5px] text-ink-400">
            {mod.title} · {doc.deliverableType}
          </span>
        </span>
        {doc.date && <span className="shrink-0 text-[11px] tabular-nums text-ink-400">{doc.date}</span>}
      </OpenPreview>
    </li>
  );
}
