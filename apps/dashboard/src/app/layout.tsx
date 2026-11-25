import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PreviewProvider } from "@/components/preview/PreviewProvider";
import { course } from "@/lib/catalog";
import { asset } from "@/lib/paths";

export const metadata: Metadata = {
  title: {
    default: `${course.name} · FISEI UTA`,
    template: `%s · ${course.name}`,
  },
  description: "Plataforma académica integradora de la asignatura Emprendimiento y Legislación Laboral — FISEI, Universidad Técnica de Ambato.",
  icons: { icon: asset("/brand/uta-seal.png") },
};

export const viewport: Viewport = {
  themeColor: "#0A2540",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PreviewProvider>
          <div className="lg:pl-[272px]">
            <Sidebar />
            <main className="min-h-screen">{children}</main>
          </div>
        </PreviewProvider>
      </body>
    </html>
  );
}
