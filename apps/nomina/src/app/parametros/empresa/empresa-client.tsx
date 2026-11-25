"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm";
import { ConfiguracionNav } from "@/components/configuracion-nav";
import { conBase } from "@/lib/base-path";
import { SECCIONES } from "@/lib/navegacion";
import type { DatosEmpresa, Empresa } from "@/lib/repo";
import { guardarEmpresaAction } from "./actions";

export function EmpresaClient({ empresa }: { empresa: Empresa }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<DatosEmpresa>({
    razonSocial: empresa.razonSocial,
    nombreComercial: empresa.nombreComercial,
    ruc: empresa.ruc,
    direccion: empresa.direccion,
    telefono: empresa.telefono,
    email: empresa.email,
    representanteLegal: empresa.representanteLegal,
    mostrarNombreConLogo: empresa.mostrarNombreConLogo,
  });
  const [mensaje, setMensaje] = useState<{ tono: "success" | "danger"; texto: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof DatosEmpresa>(campo: K, valor: DatosEmpresa[K]) => {
    setMensaje(null);
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    startTransition(async () => {
      const r = await guardarEmpresaAction(form);
      setMensaje(r.ok ? { tono: "success", texto: "Datos de la empresa guardados." } : { tono: "danger", texto: r.error });
      if (r.ok) router.refresh();
    });
  }

  async function subirLogo(archivo: File) {
    setMensaje(null);
    setSubiendo(true);
    try {
      const datos = new FormData();
      datos.append("logo", archivo);
      const res = await fetch(conBase("/api/empresa/logo"), { method: "POST", body: datos });
      const r = (await res.json()) as { ok?: boolean; error?: string };
      setMensaje(res.ok ? { tono: "success", texto: "Logo actualizado." } : { tono: "danger", texto: r.error ?? "No se pudo subir el logo" });
      if (res.ok) router.refresh();
    } finally {
      setSubiendo(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  }

  async function restaurarLogo() {
    const ok = await confirmar({
      titulo: "¿Restaurar el logo genérico?",
      mensaje: "Se eliminará el logo cargado. Los roles ya impresos no cambian.",
      confirmar: "Restaurar",
      tono: "destructive",
    });
    if (!ok) return;
    await fetch(conBase("/api/empresa/logo"), { method: "DELETE" });
    setMensaje({ tono: "success", texto: "Se restauró el logo genérico." });
    router.refresh();
  }

  const logoUrl = conBase(`/api/empresa/logo?v=${encodeURIComponent(empresa.logoVersion)}`);

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        icon={SECCIONES.configuracion.icon}
        title="Empresa"
        description="Datos institucionales y logo. Aparecen en el menú, los roles en PDF y el Excel."
      />
      <ConfiguracionNav />

      {mensaje && (
        <div className="mb-4">
          <Alert tone={mensaje.tono}>{mensaje.texto}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={guardar} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Razón social" hint="Nombre legal; se imprime en los roles de pago" className="sm:col-span-2">
                  <Input value={form.razonSocial} required onChange={(e) => set("razonSocial", e.target.value)} />
                </Field>
                <Field label="Nombre comercial" hint="Opcional; se muestra en el menú">
                  <Input value={form.nombreComercial} onChange={(e) => set("nombreComercial", e.target.value)} />
                </Field>
                <Field label="RUC">
                  <Input
                    value={form.ruc}
                    maxLength={13}
                    inputMode="numeric"
                    className="tabular"
                    onChange={(e) => set("ruc", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
                <Field label="Dirección" className="sm:col-span-2">
                  <Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
                </Field>
                <Field label="Teléfono">
                  <Input value={form.telefono} inputMode="tel" onChange={(e) => set("telefono", e.target.value)} />
                </Field>
                <Field label="Correo electrónico">
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label="Representante legal" className="sm:col-span-2">
                  <Input value={form.representanteLegal} onChange={(e) => set("representanteLegal", e.target.value)} />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  <Save /> {pending ? "Guardando…" : "Guardar datos"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Logo</CardTitle>
            <Badge tone={empresa.logoPersonalizado ? "success" : "neutral"}>
              {empresa.logoPersonalizado ? "Personalizado" : "Genérico"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-36 items-center justify-center rounded-md border border-dashed bg-muted/60 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa del logo guardado */}
              <img src={logoUrl} alt="Logo de la empresa" className="max-h-full max-w-full object-contain" />
            </div>
            <input
              ref={archivoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void subirLogo(archivo);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => archivoRef.current?.click()} disabled={subiendo}>
                <ImageUp /> {subiendo ? "Subiendo…" : "Subir logo"}
              </Button>
              {empresa.logoPersonalizado && (
                <Button type="button" variant="outline" onClick={restaurarLogo}>
                  <RotateCcw /> Usar genérico
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP o SVG de hasta 5 MB. Se recomienda PNG con fondo transparente.
            </p>
            <div className="rounded-md border bg-muted/40 p-3">
              <Checkbox
                label="Mostrar el nombre junto al logo"
                checked={form.mostrarNombreConLogo}
                onChange={(e) =>
                  startTransition(async () => {
                    const siguiente = { ...form, mostrarNombreConLogo: e.target.checked };
                    setForm(siguiente);
                    const r = await guardarEmpresaAction(siguiente);
                    if (r.ok) router.refresh();
                    else setMensaje({ tono: "danger", texto: r.error });
                  })
                }
              />
              <p className="mt-1.5 pl-6 text-xs text-muted-foreground">
                Desactívelo si el logo ya incluye el nombre de la empresa.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
