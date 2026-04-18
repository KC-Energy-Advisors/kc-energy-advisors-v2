import { SOLAR } from './constants';
import type { SavingsResult } from './types';

/**
 * Calculate estimated solar savings for a given monthly bill.
 * All math is KC-specific (1,200 kWh/kW/yr production, 3.4% annual escalation per EIA).
 */
export function calcSavings(monthlyBill: number): SavingsResult {
  const annual = monthlyBill * 12;
  const yr1    = annual * SOLAR.OFFSET;

  let yr5 = 0;
  let yr25 = 0;
  for (let n = 0; n < 25; n++) {
    const s = yr1 * Math.pow(1 + SOLAR.RATE_RISE, n);
    yr25 += s;
    if (n < 5) yr5 += s;
  }

  const annualKwh  = (monthlyBill / SOLAR.RATE_KWH) * 12;
  const systemKw   = annualKwh / SOLAR.KWH_PER_KW;
  const systemCost = systemKw * SOLAR.COST_PER_KW;
const credit = 0
  return {
    yr1:    Math.round(yr1),
    yr5:    Math.round(yr5),
    yr25:   Math.round(yr25),
    credit: Math.round(credit),
    kwSize: systemKw.toFixed(1),
  };
}

/** Format a dollar number with $ and comma separators */
export function fmtDollars(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

/**
 * Convert a raw phone string to E.164 format.
 * Returns an empty string if the input cannot form a valid US number,
 * so callers can treat the empty string as a validation failure.
 */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10)                           return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1')      return '+' + digits;
  return ''; // ← invalid — let caller show the user a clear error
}
