import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/paths";
import { isAdmin } from "@/lib/auth";
import { course, modules } from "@/lib/catalog";
import { getSnapshot } from "@/lib/data";
import { crudEnabled } from "@/lib/env";
import { AdminControl } from "./AdminControl";
import { MobileNav, NavLinks } from "./NavLinks";

export async function Sidebar() {
  const [admin, snap] = await Promise.all([isAdmin(), getSnapshot()]);
  const counts = Object.fromEntries(
    modules.map((m) => [m.slug, snap.documents.filter((d) => d.module === m.slug).length]),
  );
  const items = [
    { href: "/", label: "Resumen del semestre", number: null, icon: "LayoutGrid", count: snap.documents.length },
    ...modules.map((m) => ({
      href: `/modulos/${m.slug}`,
      label: m.title,
      number: m.number,
      icon: m.icon,
      count: counts[m.slug] ?? 0,
    })),
  ];

  const footer = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Image src={asset("/brand/fisei-seal.png")} alt="FISEI" width={36} height={36} className="h-9 w-9 object-contain" />
        <div className="text-[11px] leading-tight text-white/55">
          {course.career}
          <br />
          {course.cycle}
        </div>
      </div>
      <AdminControl crudEnabled={crudEnabled} isAdmin={admin} mode={snap.mode} />
    </div>
  );

  return (
    <>
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col bg-uta-900 text-white lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Link href="/" aria-label="Inicio">
            <Image
              src={asset("/brand/uta-horizontal-white.png")}
              alt="Universidad Técnica de Ambato"
              width={1200}
              height={453}
              priority
              className="h-auto w-[176px]"
            />
          </Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-uta-400">Asignatura</p>
          <p className="mt-1.5 font-serif text-[17px] leading-snug text-white">{course.name}</p>
          <p className="mt-1 text-xs text-white/50">{course.level}</p>
        </div>
        <div className="mx-6 h-px bg-white/10" />
        <nav className="thin-scroll flex-1 overflow-y-auto px-3 py-5">
          <NavLinks items={items} />
        </nav>
        <div className="border-t border-white/10 px-6 py-5">{footer}</div>
      </aside>

      {/* Móvil */}
      <MobileNav items={items} footer={footer} />
    </>
  );
}
