import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { ConfirmProvider } from "@/components/ui/confirm";
import { conBase } from "@/lib/base-path";
import { BRAND } from "@/lib/brand";
import { getDb } from "@/lib/db";
import { nombreVisibleEmpresa, obtenerEmpresa } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: BRAND.sistema, template: `%s · ${BRAND.sistema}` },
  description: "Nómina parametrizada para Código de Trabajo, LOSEP y LOEP (Ecuador)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const empresa = obtenerEmpresa(getDb());
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <ConfirmProvider>
          <Sidebar
            empresa={{
              nombre: nombreVisibleEmpresa(empresa),
              mostrarNombre: empresa.mostrarNombreConLogo,
              logoUrl: conBase(`/api/empresa/logo?v=${encodeURIComponent(empresa.logoVersion)}`),
            }}
          />
          <main className="md:pl-60">
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>
        </ConfirmProvider>
      </body>
    </html>
  );
}
