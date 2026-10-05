import { formatCompactNumber } from '../../../utils/fusedash-visual.js';

/** True when every value of the axis is a whole number (counts, years …). */
export function areAllIntegers(values: number[]): boolean {
  return values.length > 0 && values.every((value) => Number.isInteger(value));
}

/** Decimals needed to tell neighbouring ticks apart (step 0.1 -> 1, 0.025 -> 3). */
export function getTickDecimals(ticks: number[]): number {
  if (ticks.length < 2) return 0;
  const step = Math.abs(ticks[1] - ticks[0]);
  if (!(step > 0) || Number.isInteger(step)) return 0;
  const fraction = String(Number(step.toFixed(10))).split('.')[1] ?? '';
  return Math.min(fraction.length, 6);
}

export interface ScatterTickOptions {
  /** All data values of the axis are whole numbers: label whole ticks only. */
  integerOnly: boolean;
  decimals: number;
  isPercentage?: boolean;
}

/**
 * Label of a scatter tick (FUS-4162). Only whole-number ticks used to get a
 * label, so an axis with values between 0 and 1 had none; whole numbers only
 * is still the rule for axes whose data are whole numbers.
 */
export function formatScatterTick(
  value: number,
  { integerOnly, decimals, isPercentage = false }: ScatterTickOptions,
): string {
  if (integerOnly && !Number.isInteger(value)) return '';
  if (isPercentage && Math.abs(value) <= 1) {
    return (value * 100).toFixed(Math.max(0, decimals - 2));
  }
  return formatCompactNumber(value, decimals);
}
