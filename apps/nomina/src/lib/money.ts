/**
 * Utilidades de dinero y decimales SIN punto flotante.
 *
 * - Todos los importes se manejan como centavos enteros (number entero o bigint).
 * - Los valores decimales (porcentajes, horas, parámetros) se convierten desde
 *   texto a enteros escalados (bigint) mediante manipulación de cadenas.
 * - Las divisiones se resuelven con redondeo half-up (0.5 se redondea hacia arriba
 *   en valor absoluto).
 */

/** Convierte un texto decimal ("9.45", "482", "-1.5") a bigint escalado a `scale` decimales. */
export function parseScaled(value: string | number, scale: number): bigint {
  const raw = String(value).trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPart, fracPart = ""] = unsigned.split(".");
  let frac = fracPart;
  let roundUp = false;
  if (frac.length > scale) {
    roundUp = frac.charCodeAt(scale) - 48 >= 5;
    frac = frac.slice(0, scale);
  }
  frac = frac.padEnd(scale, "0");
  let result = BigInt(intPart + frac);
  if (roundUp) result += 1n;
  return negative ? -result : result;
}

/** División entera con redondeo half-up (lejos de cero en el empate). */
export function divRound(num: bigint, den: bigint): bigint {
  if (den === 0n) throw new Error("División para cero");
  const negative = (num < 0n) !== (den < 0n);
  const n = num < 0n ? -num : num;
  const d = den < 0n ? -den : den;
  const q = (2n * n + d) / (2n * d);
  return negative ? -q : q;
}

/** Convierte texto de moneda ("1,234.56", "482") a centavos enteros. */
export function parseMoneyToCents(value: string | number): number {
  const cleaned = String(value).replace(/USD/i, "").replace(/[\s,]/g, "");
  if (cleaned === "") return 0;
  return Number(parseScaled(cleaned, 2));
}

/** Formatea centavos enteros como "USD 1,234.56". */
export function formatUSD(cents: number | bigint): string {
  return `USD ${formatAmount(cents)}`;
}

/** Formatea centavos enteros como "1,234.56" (sin símbolo). */
export function formatAmount(cents: number | bigint): string {
  const c = BigInt(cents);
  const negative = c < 0n;
  const abs = negative ? -c : c;
  const units = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${units}.${dec}`;
}

/** Centavos a texto decimal plano ("1234.56"), útil para inputs. */
export function centsToInput(cents: number): string {
  const c = BigInt(cents);
  const negative = c < 0n;
  const abs = negative ? -c : c;
  return `${negative ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}

/**
 * Convierte centavos a número decimal SOLO para celdas de Excel
 * (la hoja de cálculo necesita un número para aplicar formato de moneda).
 */
export function centsToExcelNumber(cents: number): number {
  return Number(centsToInput(cents));
}
