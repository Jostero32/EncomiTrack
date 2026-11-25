"use client";

import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/paths";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import { ModuleIcon } from "./ModuleIcon";

export interface NavItem {
  href: string;
  label: string;
  number: number | null;
  icon: string;
  count: number;
}

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            {i === 1 && (
              <p className="mb-2 mt-5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Módulos
              </p>
            )}
            <Link
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition",
                active ? "bg-white/[0.09] text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <span
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold tabular-nums transition",
                  active ? "border-uta-400/50 bg-uta-500/20 text-white" : "border-white/10 text-white/60 group-hover:border-white/20",
                )}
              >
                {item.number ? String(item.number).padStart(2, "0") : <ModuleIcon name={item.icon} className="h-3.5 w-3.5" />}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              <span className="text-[11px] tabular-nums text-white/35">{item.count}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function MobileNav({ items, footer }: { items: NavItem[]; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="lg:hidden">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-uta-900 px-4 py-3">
        <Link href="/">
          <Image src={asset("/brand/uta-horizontal-white.png")} alt="UTA" width={1200} height={453} className="h-auto w-[132px]" />
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-white/80 hover:bg-white/10" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-uta-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[290px] flex-col bg-uta-900 text-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-medium text-white/80">Navegación</span>
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3">
              <NavLinks items={items} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="border-t border-white/10 px-5 py-5">{footer}</div>
          </div>
        </div>
      )}
    </div>
  );
}
