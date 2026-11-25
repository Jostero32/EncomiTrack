import { getDb } from "@/lib/db";
import { obtenerEmpresa } from "@/lib/repo";
import { EmpresaClient } from "./empresa-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Empresa" };

export default function EmpresaPage() {
  return <EmpresaClient empresa={obtenerEmpresa(getDb())} />;
}
