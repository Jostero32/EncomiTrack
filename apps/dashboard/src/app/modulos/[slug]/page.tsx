import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DocumentBrowser } from "@/components/DocumentBrowser";
import { FeaturedVideo, SystemCard } from "@/components/FeatureMedia";
import { LiquidacionLivePanel } from "@/components/LiquidacionLivePanel";
import { ModuleIcon } from "@/components/ModuleIcon";
import { Notice } from "@/components/Notice";
import { isAdmin } from "@/lib/auth";
import { getModule, systems } from "@/lib/catalog";
import { getDocumentsByModule } from "@/lib/data";
import { crudEnabled } from "@/lib/env";
import { MAX_UPLOAD_BYTES } from "@/lib/limits";
import { getLiquidacionLive } from "@/lib/liquidacion";
import type { ModuleSlug } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = getModule((await params).slug);
  return { title: m ? `Módulo ${m.number}: ${m.title}` : "Módulo" };
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = getModule(slug);
  if (!mod) notFound();

  const [{ documents, warning }, admin, live] = await Promise.all([
    getDocumentsByModule(slug as ModuleSlug),
    isAdmin(),
    mod.slug === "liquidacion" ? getLiquidacionLive() : Promise.resolve(null),
  ]);
  const moduleSystems = systems.filter((s) => s.module === mod.slug);
  const video = documents.find((d) => d.kind === "video" && d.featured) ?? documents.find((d) => d.kind === "video");
  const listDocs = documents.filter((d) => d !== video);
  const p1 = documents.filter((d) => d.parcial === 1).length;

  const upload = crudEnabled ? { maxBytes: MAX_UPLOAD_BYTES } : null;

  return (
    <div className="mx-auto max-w-[1160px] px-5 pb-24 pt-10 sm:px-10 lg:pt-14">
      {warning && <Notice>{warning}</Notice>}

      <header className="animate-rise">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-uta-900 text-white">
            <ModuleIcon name={mod.icon} className="h-4 w-4" />
          </span>
          <p className="eyebrow">Módulo {String(mod.number).padStart(2, "0")}</p>
        </div>
        <h1 className="mt-5 font-serif text-[38px] font-semibold leading-[1.1] tracking-tight text-uta-900 sm:text-[46px]">{mod.title}</h1>
        <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-ink-500">{mod.description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="chip">{documents.length} entregables</span>
          {p1 > 0 && <span className="chip">Primer parcial · {p1}</span>}
          {documents.length - p1 > 0 && <span className="chip">Segundo parcial · {documents.length - p1}</span>}
          {moduleSystems.length > 0 && <span className="chip border-uta-200 bg-uta-50 text-uta-800">Sistema en producción</span>}
        </div>
      </header>

      {(moduleSystems.length > 0 || video) && (
        <section className="mt-10 space-y-4">
          {video && <FeaturedVideo doc={video} moduleTitle={mod.title} />}
          {moduleSystems.map((s) => (
            <SystemCard key={s.slug} system={s} moduleTitle={mod.title} />
          ))}
          {live && <LiquidacionLivePanel data={live} systemUrl={moduleSystems[0]?.url ?? "#"} />}
        </section>
      )}

      <div className="mt-12">
        <DocumentBrowser docs={listDocs} module={mod.slug} moduleTitle={mod.title} isAdmin={admin} upload={upload} />
      </div>
    </div>
  );
}
