import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight">Página no encontrada</h1>
      <p className="mt-3 text-ink-500">El módulo o documento que buscas no existe.</p>
      <Link href="/" className="btn-primary mt-8">Volver al resumen</Link>
    </div>
  );
}
