import Decimal from 'decimal.js';

// ─── Global Configuration ───────────────────────────────────────
// Banker's Rounding (ROUND_HALF_EVEN) — applied ONCE at the end
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * Convert a string or number to a Decimal instance.
 */
export function toDecimal(value: string | number): Decimal {
    return new Decimal(value);
}

/**
 * Sum an arbitrary number of rate values, ignoring nulls/undefined.
 * Returns a Decimal representing the composite rate.
 */
export function sumRates(...rates: (string | null | undefined)[]): Decimal {
    let total = new Decimal(0);
    for (const r of rates) {
        if (r !== null && r !== undefined) {
            total = total.plus(new Decimal(r));
        }
    }
    return total;
}

/**
 * Calculate tax_amount and total_amount from subtotal and composite rate.
 *
 * Tax is rounded ONCE to 2dp using Banker's Rounding (ROUND_HALF_EVEN).
 * total = subtotal + tax (no additional rounding).
 *
 * Returns both as strings with exactly 2 decimal places.
 */
export function calcTax(
    subtotal: string | number,
    compositeRate: Decimal
): { tax_amount: string; total_amount: string } {
    const sub = new Decimal(subtotal);
    const tax = sub.times(compositeRate).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const total = sub.plus(tax);
    return {
        tax_amount: tax.toFixed(2),
        total_amount: total.toFixed(2),
    };
}

/**
 * Format a Decimal rate value to exactly 6 decimal places.
 */
export function formatRate(d: Decimal): string {
    return d.toFixed(6);
}

export { Decimal };
