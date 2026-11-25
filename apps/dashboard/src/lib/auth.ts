import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { crudEnabled, env } from "./env";

export const ADMIN_COOKIE = "ell_admin";

export function sessionToken(): string {
  return createHmac("sha256", env.sessionSecret).update(`admin:${env.adminPasscode}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function isAdmin(): Promise<boolean> {
  if (!crudEnabled) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(value && safeEqual(value, sessionToken()));
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("No autorizado.");
}
