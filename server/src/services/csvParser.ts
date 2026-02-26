import fs from 'fs';
import csvParserLib from 'csv-parser';
import pool from '../config/db';
import { calculateBatchTaxes, TaxResult } from './taxCalculator';

// ─── Static import (was dynamic import() inside hot loop — Bottleneck #2 fix) ──
import { toDecimal, calcTax } from '../utils/precision';

// ─── Constants ──────────────────────────────────────────────────
const CHUNK_SIZE = 2000;   // fewer transactions = less overhead
const CONCURRENCY = 4;     // parallel chunk processing
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

/**
 * Extended cache entry: stores the TaxResult plus pre-serialized JSON strings
 * so we don't call JSON.stringify() 50+ times for the same breakdown object.
 */
interface CachedTaxEntry {
    result: TaxResult;
    breakdownJson: string;
    jurisdictionsJson: string;
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

// ─── Cache key ──────────────────────────────────────────────────

/**
 * Build a deduplication key from coordinates + date.
 * Tax rates are date-dependent, so the key must include the date portion.
 */
function taxCacheKey(lat: number, lon: number, timestamp: Date): string {
    return `${lat}|${lon}|${timestamp.toISOString().split('T')[0]}`;
}

// ─── CSV Parser & Importer ──────────────────────────────────────

/**
 * Parse a CSV file from disk, validate rows, and import in optimized batches.
 *
 * PERFORMANCE STRATEGY (v3 — "Simplified Geometries + Zero-Alloc Hot Path"):
 *
 *   1. GLOBAL TAX CACHE with pre-serialized JSON: shared across ALL chunks.
 *      JSON.stringify() is called ONCE per unique coordinate, not per row.
 *
 *   2. DEDUPLICATION: Only NEW unique coordinates hit PostGIS.
 *
 *   3. PARALLEL CHUNKS: Up to CONCURRENCY (4) chunks processed simultaneously.
 *
 *   4. POSTGRESQL TAX MATH: tax_amount and total_amount computed via SQL ROUND()
 *      inside the INSERT, eliminating ~66K Decimal.js operations.
 *
 *   5. DB-GENERATED UUIDs: gen_random_uuid() in SQL, no crypto calls in Node.
 *
 *   6. STATIC IMPORTS: No dynamic import() in hot path.
 *
 * Returns total imported/error counts.
 */
export async function parseCsvAndImport(filePath: string): Promise<CsvImportResult> {
    let totalImported = 0;
    let totalErrors = 0;

    // Read and validate CSV
    const rows = await readCsvFile(filePath);

    const validRows: ValidatedRow[] = [];
    for (const raw of rows) {
        const validated = validateRow(raw);
        if (validated) {
            validRows.push(validated);
        } else {
            if (totalErrors < 5) {
                console.error(`Row validation failed for row ${totalErrors}:`, raw);
            }
            totalErrors++;
        }
    }

    // ── Global tax cache: shared across ALL chunks ──
    const globalTaxCache = new Map<string, CachedTaxEntry>();

    // Build chunks
    const chunks: ValidatedRow[][] = [];
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        chunks.push(validRows.slice(i, i + CHUNK_SIZE));
    }

    // Process chunks in parallel with controlled concurrency
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
            batch.map(chunk => processChunkOptimized(chunk, globalTaxCache))
        );
        for (const r of results) {
            totalImported += r.imported;
            totalErrors += r.errors;
        }
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
            .pipe(csvParserLib({
                mapHeaders: ({ header }) => header.toLowerCase().trim()
            }))
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
 * Optimized chunk processing (v3):
 *
 *   1. Deduplicate coordinates against global cache
 *   2. Batch tax lookup for uncached coordinates only
 *   3. Cache results WITH pre-serialized JSON strings
 *   4. Build INSERT arrays (no Decimal.js, no uuid, no redundant JSON.stringify)
 *   5. Let PostgreSQL compute tax_amount/total_amount via ROUND()
 *   6. Let PostgreSQL generate UUIDs via gen_random_uuid()
 */
async function processChunkOptimized(
    chunk: ValidatedRow[],
    globalTaxCache: Map<string, CachedTaxEntry>
): Promise<{ imported: number; errors: number }> {
    if (chunk.length === 0) return { imported: 0, errors: 0 };

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── Step 1: Identify uncached unique coordinates ──
        const uncachedUnique = new Map<string, { lat: number; lon: number; subtotal: string; timestamp: Date }>();

        for (const row of chunk) {
            const key = taxCacheKey(row.lat, row.lon, row.timestamp);
            if (!globalTaxCache.has(key) && !uncachedUnique.has(key)) {
                uncachedUnique.set(key, {
                    lat: row.lat,
                    lon: row.lon,
                    subtotal: row.subtotal,
                    timestamp: row.timestamp,
                });
            }
        }

        // ── Step 2: Batch-query ONLY new unique coordinates ──
        if (uncachedUnique.size > 0) {
            const uniqueBatch = Array.from(uncachedUnique.values());
            const taxResults = await calculateBatchTaxes(uniqueBatch, client);

            // Store in global cache WITH pre-serialized JSON (Bottleneck #4 fix)
            const keys = Array.from(uncachedUnique.keys());
            for (let i = 0; i < keys.length; i++) {
                globalTaxCache.set(keys[i], {
                    result: taxResults[i],
                    breakdownJson: JSON.stringify(taxResults[i].breakdown),
                    jurisdictionsJson: JSON.stringify(taxResults[i].jurisdictions_applied),
                });
            }
        }

        // ── Step 3: Build INSERT arrays ──
        // No UUIDs (PostgreSQL gen_random_uuid()), no Decimal.js, no redundant JSON.stringify
        const lats: number[] = new Array(chunk.length);
        const lons: number[] = new Array(chunk.length);
        const subtotals: string[] = new Array(chunk.length);
        const compositeRates: string[] = new Array(chunk.length);
        const breakdowns: string[] = new Array(chunk.length);
        const jurisdictionsApplied: string[] = new Array(chunk.length);
        const timestamps: string[] = new Array(chunk.length);

        for (let i = 0; i < chunk.length; i++) {
            const row = chunk[i];
            const key = taxCacheKey(row.lat, row.lon, row.timestamp);
            const cached = globalTaxCache.get(key)!;

            lats[i] = row.lat;
            lons[i] = row.lon;
            subtotals[i] = row.subtotal;
            compositeRates[i] = cached.result.composite_tax_rate;
            breakdowns[i] = cached.breakdownJson;              // pre-serialized!
            jurisdictionsApplied[i] = cached.jurisdictionsJson; // pre-serialized!
            timestamps[i] = row.timestamp.toISOString();
        }

        // ── Step 4: Batch INSERT — tax math + UUIDs done in PostgreSQL ──
        // PostgreSQL ROUND(subtotal * rate, 2) matches Commercial Rounding
        // gen_random_uuid() replaces Node.js crypto.randomUUID/uuidv4
        const insertSql = `
            INSERT INTO orders (
                id, lat, lon, subtotal,
                composite_tax_rate, tax_amount, total_amount,
                breakdown, jurisdictions_applied, timestamp
            )
            SELECT
                gen_random_uuid(),
                lat, lon, subtotal,
                composite_rate,
                ROUND(subtotal * composite_rate, 2),
                subtotal + ROUND(subtotal * composite_rate, 2),
                breakdown, jurisdictions_applied, ts
            FROM UNNEST(
                $1::decimal[],
                $2::decimal[],
                $3::decimal[],
                $4::decimal[],
                $5::jsonb[],
                $6::jsonb[],
                $7::timestamptz[]
            ) AS t(lat, lon, subtotal, composite_rate, breakdown, jurisdictions_applied, ts);
        `;

        await client.query(insertSql, [
            lats,
            lons,
            subtotals,
            compositeRates,
            breakdowns,
            jurisdictionsApplied,
            timestamps,
        ]);

        await client.query('COMMIT');
        return { imported: chunk.length, errors: 0 };
    } catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('Chunk import failed, rolling back:', (err as Error).message);
        return { imported: 0, errors: chunk.length };
    } finally {
        client.release();
    }
}
