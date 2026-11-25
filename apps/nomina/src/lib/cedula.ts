/**
 * Validación de cédula ecuatoriana (algoritmo módulo 10).
 * - 10 dígitos; provincia (2 primeros) entre 01 y 24, o 30 (ecuatorianos en el exterior).
 * - Tercer dígito menor a 6 (persona natural).
 * - Coeficientes 2,1,2,1,2,1,2,1,2 sobre los 9 primeros dígitos; si el producto > 9 se resta 9.
 * - Dígito verificador = (10 - suma % 10) % 10.
 */
export function digitoVerificador(nueveDigitos: string): number {
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let p = Number(nueveDigitos[i]) * (i % 2 === 0 ? 2 : 1);
    if (p > 9) p -= 9;
    suma += p;
  }
  return (10 - (suma % 10)) % 10;
}

export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (Number(cedula[2]) >= 6) return false;
  return digitoVerificador(cedula.slice(0, 9)) === Number(cedula[9]);
}

/** Completa 9 dígitos con su verificador (usado para datos de ejemplo). */
export function completarCedula(nueveDigitos: string): string {
  return nueveDigitos + digitoVerificador(nueveDigitos);
}
