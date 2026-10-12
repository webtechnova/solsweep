/**
 * Money helpers. All amounts are handled as integer lamports (bigint) so there is
 * never any floating-point rounding. 1 SOL = 1_000_000_000 lamports.
 */

export const DECIMALS = 9;
export const LAMPORTS_PER_SOL = 1_000_000_000n;

/** Highest number of whole-SOL digits we accept (far above the total SOL supply). */
const MAX_WHOLE_DIGITS = 12;

/**
 * Parse a user-typed SOL amount ("1", "0.5", ".25", "3.") into lamports.
 * Returns null for anything that is not a plain non-negative decimal with at most
 * 9 fractional digits (no signs, no exponents, no commas).
 */
export function parseSolToLamports(input: string): bigint | null {
  const s = input.trim();
  if (s === '' || !/^\d*\.?\d*$/.test(s) || !/\d/.test(s)) return null;

  const [whole = '', fraction = ''] = s.split('.');
  if (fraction.length > DECIMALS || whole.length > MAX_WHOLE_DIGITS) return null;

  const wholePart = BigInt(whole === '' ? '0' : whole);
  const fractionPart = BigInt(fraction.padEnd(DECIMALS, '0'));
  return wholePart * LAMPORTS_PER_SOL + fractionPart;
}

/**
 * Format lamports as a SOL string with full precision.
 * trim=true (default) removes trailing zeros: 1_500_000_000n -> "1.5".
 */
export function formatLamports(lamports: bigint, opts: { trim?: boolean } = {}): string {
  const { trim = true } = opts;
  const negative = lamports < 0n;
  const abs = negative ? -lamports : lamports;

  const whole = abs / LAMPORTS_PER_SOL;
  const fractionFull = (abs % LAMPORTS_PER_SOL).toString().padStart(DECIMALS, '0');
  const fraction = trim ? fractionFull.replace(/0+$/, '') : fractionFull;

  return `${negative ? '-' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''}`;
}

/** "9xQe...4fGh" style shortening for display. */
export function shortAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
