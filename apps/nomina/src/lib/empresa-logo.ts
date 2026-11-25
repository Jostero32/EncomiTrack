/** Procesamiento del logo de la empresa (solo servidor: usa sharp y el sistema de archivos). */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type Database from "better-sqlite3";
import { nombreVisibleEmpresa, obtenerEmpresa, obtenerLogoEmpresa, type LogoPng } from "./repo";

export const LOGO_GENERICO = path.join(process.cwd(), "public", "brand", "logo-generico.png");
export const TIPOS_LOGO = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

/** Convierte cualquier formato admitido a PNG con un tamaño razonable para documentos. */
export async function normalizarLogo(entrada: Buffer): Promise<LogoPng> {
  const { data, info } = await sharp(entrada, { density: 300 })
    .resize({ width: 1200, height: 600, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { png: data, ancho: info.width, alto: info.height };
}

export async function logoActual(db: Database.Database): Promise<LogoPng> {
  const propio = obtenerLogoEmpresa(db);
  if (propio) return propio;
  const png = fs.readFileSync(LOGO_GENERICO);
  const meta = await sharp(png).metadata();
  return { png, ancho: meta.width ?? 512, alto: meta.height ?? 512 };
}

export interface EmpresaDocumento {
  razonSocial: string;
  nombreVisible: string;
  ruc: string;
  direccion: string;
  mostrarNombre: boolean;
  logo: LogoPng;
}

/** Datos de encabezado para PDF y Excel. */
export async function empresaParaDocumentos(db: Database.Database): Promise<EmpresaDocumento> {
  const empresa = obtenerEmpresa(db);
  return {
    razonSocial: empresa.razonSocial,
    nombreVisible: nombreVisibleEmpresa(empresa),
    ruc: empresa.ruc,
    direccion: empresa.direccion,
    mostrarNombre: empresa.mostrarNombreConLogo,
    logo: await logoActual(db),
  };
}
