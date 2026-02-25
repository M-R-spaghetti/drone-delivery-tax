import { query } from '../config/db';
import { toDecimal, sumRates, calcTax, formatRate, Decimal } from '../utils/precision';
import { PoolClient } from 'pg';

// ─── Types ──────────────────────────────────────────────────────

export interface TaxBreakdown {
    state_rate: string | null;
    county_rate: string | null;
    city_rate: string | null;
    special_rate: string | null;
}

export interface JurisdictionApplied {
    id: string;
    name: string;
    type: string;
    rate: string;
}

export interface TaxResult {
    composite_tax_rate: string;
    tax_amount: string;
    total_amount: string;
    breakdown: TaxBreakdown;
    jurisdictions_applied: JurisdictionApplied[];
}

// ─── Internal helpers ───────────────────────────────────────────

interface JurisdictionRow {
    id: string;
    name: string;
    type: string;
    rate: string;
}

/**
 * Given an array of matched jurisdiction rows (for a single point),
 * build the breakdown, jurisdictions_applied, and compute tax.
 *
 * IMPORTANT: subtotal is accepted as string|number to allow
 * precise string passthrough from CSV/API without float conversion.
 */
function buildTaxResult(
    rows: JurisdictionRow[],
    subtotal: number | string
): TaxResult {
    // Extract first match of each type (deterministic: ORDER BY type, name)
    let stateRate: Decimal | null = null;
    let countyRate: Decimal | null = null;
    let cityRate: Decimal | null = null;
    let specialRate: Decimal | null = null;

    const jurisdictions_applied: JurisdictionApplied[] = [];

    for (const row of rows) {
        const rate = toDecimal(row.rate);
        let applied = false;

        switch (row.type) {
            case 'state':
                if (stateRate === null) { stateRate = rate; applied = true; }
                break;
            case 'county':
                if (countyRate === null) { countyRate = rate; applied = true; }
                break;
            case 'city':
                if (cityRate === null) { cityRate = rate; applied = true; }
                break;
            case 'special':
                if (specialRate === null) {
                    specialRate = rate;
                } else {
                    specialRate = specialRate.plus(rate);
                }
                applied = true; // All special districts are applied cumulatively
                break;
        }

        if (applied) {
            jurisdictions_applied.push({
                id: row.id,
                name: row.name,
                type: row.type,
                rate: formatRate(rate),
            });
        }
    }

    // Composite rate = sum of all type rates
    const compositeRate = sumRates(
        stateRate !== null ? stateRate.toFixed(6) : null,
        countyRate !== null ? countyRate.toFixed(6) : null,
        cityRate !== null ? cityRate.toFixed(6) : null,
        specialRate !== null ? specialRate.toFixed(6) : null
    );

    // Tax calculation — rounded ONCE at the end
    const { tax_amount, total_amount } = calcTax(subtotal, compositeRate);

    const breakdown: TaxBreakdown = {
        state_rate: stateRate !== null ? stateRate.toFixed(6) : null,
        county_rate: countyRate !== null ? countyRate.toFixed(6) : null,
        city_rate: cityRate !== null ? cityRate.toFixed(6) : null,
        special_rate: specialRate !== null ? specialRate.toFixed(6) : null,
    };

    return {
        composite_tax_rate: formatRate(compositeRate),
        tax_amount,
        total_amount,
        breakdown,
        jurisdictions_applied,
    };
}

// ─── A. Single order tax calculation ────────────────────────────

/**
 * Calculate tax for a single order.
 * Uses PostGIS ST_Intersects to find all jurisdictions containing the point.
 *
 * @param subtotal — accepts string to preserve precision from API input
 */
export async function calculateTax(
    lat: number,
    lon: number,
    subtotal: number | string,
    timestamp: Date
): Promise<TaxResult> {
    const dateStr = timestamp.toISOString().split('T')[0];

    const sql = `
        SELECT j.id, j.name, j.type, tr.rate
        FROM jurisdictions j
        JOIN tax_rates tr ON tr.jurisdiction_id = j.id
        WHERE ST_Intersects(j.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
          AND tr.valid_from <= $3::date
          AND (tr.valid_to IS NULL OR tr.valid_to > $3::date)
        ORDER BY j.type, j.name;
    `;

    const result = await query<JurisdictionRow>(sql, [lon, lat, dateStr]);
    return buildTaxResult(result.rows, subtotal);
}

// ─── B. Batch tax calculation (N+1 avoidance) ──────────────────

/**
 * Calculate taxes for an entire batch of orders in a SINGLE PostGIS query
 * using UNNEST to pass arrays of points. This avoids the N+1 query problem
 * that would occur if we called calculateTax() in a loop.
 *
 * @param client — optional PoolClient for transactional consistency.
 *                 When provided, the tax lookup runs on the same DB connection
 *                 as the calling transaction, preventing TOCTOU race conditions.
 *
 * Returns TaxResult[] in the same order as the input batch.
 */
export async function calculateBatchTaxes(
    batch: { lat: number; lon: number; subtotal: number | string; timestamp: Date }[],
    client?: PoolClient
): Promise<TaxResult[]> {
    if (batch.length === 0) return [];

    // Build parallel arrays for UNNEST
    const idxArr: number[] = [];
    const lonArr: number[] = [];
    const latArr: number[] = [];
    const dateArr: string[] = [];

    for (let i = 0; i < batch.length; i++) {
        idxArr.push(i);
        lonArr.push(batch[i].lon);
        latArr.push(batch[i].lat);
        dateArr.push(batch[i].timestamp.toISOString().split('T')[0]);
    }

    // Single query: finds all jurisdiction matches for ALL points at once
    // ORDER BY pts.idx, j.type, j.name — deterministic tie-breaking
    const sql = `
        SELECT
            pts.idx,
            j.id,
            j.name,
            j.type,
            tr.rate
        FROM UNNEST($1::int[], $2::float8[], $3::float8[], $4::date[])
            AS pts(idx, lon, lat, ts)
        JOIN jurisdictions j
            ON ST_Intersects(j.geom, ST_SetSRID(ST_MakePoint(pts.lon, pts.lat), 4326))
        JOIN tax_rates tr
            ON tr.jurisdiction_id = j.id
            AND tr.valid_from <= pts.ts
            AND (tr.valid_to IS NULL OR tr.valid_to > pts.ts)
        ORDER BY pts.idx, j.type, j.name;
    `;

    // Use the provided client if available (for transactional consistency),
    // otherwise fall back to pool query
    const queryFn = client
        ? (text: string, params: unknown[]) => client.query<JurisdictionRow & { idx: number }>(text, params)
        : (text: string, params: unknown[]) => query<JurisdictionRow & { idx: number }>(text, params);

    const result = await queryFn(sql, [idxArr, lonArr, latArr, dateArr]);

    // Group results by index
    const grouped = new Map<number, JurisdictionRow[]>();
    for (const row of result.rows) {
        const idx = row.idx;
        if (!grouped.has(idx)) {
            grouped.set(idx, []);
        }
        grouped.get(idx)!.push({
            id: row.id,
            name: row.name,
            type: row.type,
            rate: row.rate,
        });
    }

    // Build TaxResult for each input row (preserving order)
    const results: TaxResult[] = [];
    for (let i = 0; i < batch.length; i++) {
        const rows = grouped.get(i) || [];
        results.push(buildTaxResult(rows, batch[i].subtotal));
    }

    return results;
}
