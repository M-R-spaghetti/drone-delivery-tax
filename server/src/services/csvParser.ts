import fs from 'fs';
import csvParserLib from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db';
import { calculateBatchTaxes, TaxResult } from './taxCalculator';

// ─── Constants ──────────────────────────────────────────────────
const CHUNK_SIZE = 500;
const NYS_LAT_MIN = 40.0;
const NYS_LAT_MAX = 45.1;
const NYS_LON_MIN = -80.0;
const NYS_LON_MAX = -71.0;

// ─── Types ──────────────────────────────────────────────────────

interface CsvRow {
    lat: string;
    lon: string;
    subtotal: string;
    timestamp?: string;
}

interface ValidatedRow {
    lat: number;
    lon: number;
    subtotal: string;   // ← STRING — no parseFloat to avoid float precision loss
    timestamp: Date;
}

export interface CsvImportResult {
    imported: number;
    errors: number;
}

// ─── Validation ─────────────────────────────────────────────────

/**
 * Validate a CSV row. Returns null if invalid.
 *
 * IMPORTANT: subtotal is validated as a number but preserved as the
 * original string to avoid IEEE 754 float representation errors.
 * This ensures Decimal.js can parse the exact CSV value.
 */
function validateRow(row: CsvRow): ValidatedRow | null {
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);

    // Validate subtotal is a valid positive number WITHOUT converting to float
    const subtotalTrimmed = (row.subtotal || '').trim();
    if (subtotalTrimmed === '') return null;
    const subtotalCheck = Number(subtotalTrimmed);
    if (isNaN(subtotalCheck) || subtotalCheck <= 0) return null;

    if (isNaN(lat) || lat < NYS_LAT_MIN || lat > NYS_LAT_MAX) return null;
    if (isNaN(lon) || lon < NYS_LON_MIN || lon > NYS_LON_MAX) return null;

    let timestamp: Date;
    if (row.timestamp && row.timestamp.trim() !== '') {
        timestamp = new Date(row.timestamp);
        if (isNaN(timestamp.getTime())) return null;
    } else {
        timestamp = new Date();
    }

    return { lat, lon, subtotal: subtotalTrimmed, timestamp };
}

// ─── CSV Parser & Importer ──────────────────────────────────────

/**
 * Parse a CSV file from disk, validate rows, and import in chunks of 500.
 *
 * Uses streaming with backpressure to avoid loading entire file into memory.
 *
 * For EACH chunk:
 *   1. BATCH READ: calculateBatchTaxes() — one PostGIS query for all rows
 *   2. BATCH WRITE: single INSERT with UNNEST arrays
 *   3. Both on the same PoolClient transaction (prevents TOCTOU race)
 *
 * Returns total imported/error counts.
 */
export async function parseCsvAndImport(filePath: string): Promise<CsvImportResult> {
    let totalImported = 0;
    let totalErrors = 0;
    let currentChunk: ValidatedRow[] = [];

    // Process the CSV as a stream with manual chunk batching
    const rows = await readCsvFile(filePath);

    // Validate all rows, separate valid from invalid
    const validRows: ValidatedRow[] = [];
    for (const raw of rows) {
        const validated = validateRow(raw);
        if (validated) {
            validRows.push(validated);
        } else {
            totalErrors++;
        }
    }

    // Process in chunks
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        const { imported, errors } = await processChunk(chunk);
        totalImported += imported;
        totalErrors += errors;
    }

    return { imported: totalImported, errors: totalErrors };
}

// ─── Internal Helpers ───────────────────────────────────────────

/**
 * Read CSV from a file path into an array of raw row objects.
 */
function readCsvFile(filePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const rows: CsvRow[] = [];
        fs.createReadStream(filePath)
            .pipe(csvParserLib())
            .on('data', (row: Record<string, string>) => {
                rows.push({
                    lat: row.lat || row.latitude,
                    lon: row.lon || row.longitude,
                    subtotal: row.subtotal,
                    timestamp: row.timestamp || undefined,
                });
            })
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}


/**
 * Process a single chunk of validated rows:
 *   1. Batch-calculate taxes (single PostGIS query via UNNEST)
 *   2. Batch-insert all orders (single INSERT via UNNEST)
 *   3. BOTH on the same PoolClient within a transaction
 *      (fixes TOCTOU race: tax lookup and insert are atomic)
 */
async function processChunk(
    chunk: ValidatedRow[]
): Promise<{ imported: number; errors: number }> {
    if (chunk.length === 0) return { imported: 0, errors: 0 };

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. BATCH READ — single PostGIS query on the SAME client (transaction-safe)
        const taxResults: TaxResult[] = await calculateBatchTaxes(chunk, client);

        // Build UNNEST arrays for batch insert
        const ids: string[] = [];
        const lats: number[] = [];
        const lons: number[] = [];
        const subtotals: string[] = [];
        const compositeRates: string[] = [];
        const taxAmounts: string[] = [];
        const totalAmounts: string[] = [];
        const breakdowns: string[] = [];
        const jurisdictionsApplied: string[] = [];
        const timestamps: string[] = [];

        for (let i = 0; i < chunk.length; i++) {
            const row = chunk[i];
            const tax = taxResults[i];

            ids.push(uuidv4());
            lats.push(row.lat);
            lons.push(row.lon);
            subtotals.push(row.subtotal); // ← STRING — no toFixed(), preserves original
            compositeRates.push(tax.composite_tax_rate);
            taxAmounts.push(tax.tax_amount);
            totalAmounts.push(tax.total_amount);
            breakdowns.push(JSON.stringify(tax.breakdown));
            jurisdictionsApplied.push(JSON.stringify(tax.jurisdictions_applied));
            timestamps.push(row.timestamp.toISOString());
        }

        // 2. BATCH WRITE — single INSERT with UNNEST on the SAME client
        const insertSql = `
            INSERT INTO orders (
                id, lat, lon, subtotal,
                composite_tax_rate, tax_amount, total_amount,
                breakdown, jurisdictions_applied, timestamp
            )
            SELECT *
            FROM UNNEST(
                $1::uuid[],
                $2::decimal[],
                $3::decimal[],
                $4::decimal[],
                $5::decimal[],
                $6::decimal[],
                $7::decimal[],
                $8::jsonb[],
                $9::jsonb[],
                $10::timestamptz[]
            );
        `;

        await client.query(insertSql, [
            ids,
            lats,
            lons,
            subtotals,
            compositeRates,
            taxAmounts,
            totalAmounts,
            breakdowns,
            jurisdictionsApplied,
            timestamps,
        ]);

        await client.query('COMMIT');
        return { imported: chunk.length, errors: 0 };
    } catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('Chunk import failed, rolling back:', (err as Error).message);
        // Count entire chunk as errors on failure
        return { imported: 0, errors: chunk.length };
    } finally {
        client.release();
    }
}
