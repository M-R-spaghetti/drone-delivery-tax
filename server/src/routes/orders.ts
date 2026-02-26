import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler';
import { calculateTax } from '../services/taxCalculator';
import { parseCsvAndImport } from '../services/csvParser';
import { query } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── Multer: disk storage to server/uploads/ ────────────────────
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}-${file.originalname}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Helper to build dynamic WHERE clause for orders
function buildFilters(req: Request) {
    const dateFrom = (req.query.dateFrom as string) || undefined;
    const dateTo = (req.query.dateTo as string) || undefined;
    const minRate = req.query.minRate !== undefined ? parseFloat(req.query.minRate as string) : undefined;
    const maxRate = req.query.maxRate !== undefined ? parseFloat(req.query.maxRate as string) : undefined;
    const searchText = req.query.searchText as string;
    const taxVal = req.query.taxVal !== undefined ? parseFloat(req.query.taxVal as string) : undefined;
    const taxOp = req.query.taxOp as string;
    const amountVal = req.query.amountVal !== undefined ? parseFloat(req.query.amountVal as string) : undefined;
    const amountOp = req.query.amountOp as string;
    const amountVal2 = req.query.amountVal2 !== undefined ? parseFloat(req.query.amountVal2 as string) : undefined;
    const taxVal2 = req.query.taxVal2 !== undefined ? parseFloat(req.query.taxVal2 as string) : undefined;
    const sourceFilter = req.query.sourceFilter as string;
    const idSearch = req.query.idSearch as string;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (dateFrom) {
        conditions.push(`timestamp >= $${paramIdx}::timestamptz`);
        values.push(dateFrom);
        paramIdx++;
    }
    if (dateTo) {
        conditions.push(`timestamp < ($${paramIdx}::date + interval '1 day')`);
        values.push(dateTo);
        paramIdx++;
    }
    if (minRate !== undefined && !isNaN(minRate)) {
        conditions.push(`composite_tax_rate >= $${paramIdx}`);
        values.push(minRate);
        paramIdx++;
    }
    if (maxRate !== undefined && !isNaN(maxRate)) {
        conditions.push(`composite_tax_rate <= $${paramIdx}`);
        values.push(maxRate);
        paramIdx++;
    }

    // OmniSearch Dynamic Filters
    if (searchText) {
        conditions.push(`(id::text ILIKE $${paramIdx} OR jurisdictions_applied::text ILIKE $${paramIdx})`);
        values.push(`%${searchText}%`);
        paramIdx++;
    }
    if (taxVal !== undefined && !isNaN(taxVal) && taxOp) {
        if (taxOp === '=') {
            conditions.push(`ABS(composite_tax_rate - $${paramIdx}) < 0.0001`);
            values.push(taxVal);
        } else {
            conditions.push(`composite_tax_rate ${taxOp} $${paramIdx}`);
            values.push(taxVal);
        }
        paramIdx++;
    }
    if (amountVal !== undefined && !isNaN(amountVal) && amountOp) {
        if (amountOp === '=') {
            conditions.push(`ABS(total_amount - $${paramIdx}) < 0.01`);
            values.push(amountVal);
        } else {
            conditions.push(`total_amount ${amountOp} $${paramIdx}`);
            values.push(amountVal);
        }
        paramIdx++;
    }

    // BETWEEN support for amounts
    if (amountVal2 !== undefined && !isNaN(amountVal2) && amountOp === '>=') {
        conditions.push(`total_amount <= $${paramIdx}`);
        values.push(amountVal2);
        paramIdx++;
    }

    // BETWEEN support for tax
    if (taxVal2 !== undefined && !isNaN(taxVal2)) {
        conditions.push(`composite_tax_rate <= $${paramIdx}`);
        values.push(taxVal2);
        paramIdx++;
    }

    // Source filter
    if (sourceFilter) {
        conditions.push(`source = $${paramIdx}`);
        values.push(sourceFilter);
        paramIdx++;
    }

    // ID search
    if (idSearch) {
        conditions.push(`id::text ILIKE $${paramIdx}`);
        values.push(`%${idSearch}%`);
        paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values, paramIdx };
}

// ─── GET /api/orders/summary ────────────────────────────────────
router.get(
    '/summary',
    asyncHandler(async (req: Request, res: Response) => {
        const { whereClause, values } = buildFilters(req);

        const sql = `
            SELECT 
                COALESCE(SUM(subtotal), 0)::numeric(12,2) AS total_sales,
                COALESCE(SUM(tax_amount), 0)::numeric(12,2) AS total_tax,
                COUNT(*) AS processed_orders
            FROM orders
            ${whereClause};
        `;
        const result = await query(sql, values);
        const row = result.rows[0] as Record<string, unknown>;
        // Ensure consistent "0.00" format even when no rows match
        const totalSales = String(row.total_sales);
        const totalTax = String(row.total_tax);
        res.json({
            total_sales: totalSales.includes('.') ? totalSales : totalSales + '.00',
            total_tax: totalTax.includes('.') ? totalTax : totalTax + '.00',
            processed_orders: Number(row.processed_orders),
        });
    })
);

// ─── GET /api/orders/export ─────────────────────────────────────
router.get(
    '/export',
    asyncHandler(async (req: Request, res: Response) => {
        const { whereClause, values, paramIdx } = buildFilters(req);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="tax_ledger.csv"');
        res.write('ID,Timestamp,Lat,Lon,Subtotal,State_Rate,County_Rate,City_Rate,MCTD_Rate,Total_Tax,Total_Amount\n');

        let offset = 0;
        const limit = 1000;

        while (true) {
            const sql = `
                SELECT * FROM orders
                ${whereClause}
                ORDER BY timestamp DESC
                LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
            `;
            const result = await query(sql, [...values, limit, offset]);
            if (result.rows.length === 0) break;

            for (const row of result.rows as any[]) {
                const id = row.id;
                const timestamp = new Date(row.timestamp).toISOString();
                const lat = row.lat;
                const lon = row.lon;
                const subtotal = row.subtotal;
                const b = row.breakdown || {};
                const stateTax = b.state_rate || 0;
                const countyTax = b.county_rate || 0;
                const cityTax = b.city_rate || 0;
                const mctdTax = b.special_rate || 0;
                const totalTax = row.tax_amount;
                const totalAmount = row.total_amount;

                res.write(`${id},${timestamp},${lat},${lon},${subtotal},${stateTax},${countyTax},${cityTax},${mctdTax},${totalTax},${totalAmount}\n`);
            }
            offset += limit;
        }
        res.end();
    })
);

// ─── GET /api/orders ────────────────────────────────────────────
// Paginated list with optional filters.
// Uses COUNT(*) OVER() window function to get total in one query.
router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        console.log("INCOMING QUERY PARAMS:", req.query);
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;

        const { whereClause, values, paramIdx } = buildFilters(req);

        // Single query with COUNT(*) OVER() window function
        const sql = `
            SELECT *, COUNT(*) OVER() AS total_count
            FROM orders
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
        `;
        values.push(limit, offset);

        const result = await query(sql, values);

        const total = result.rows.length > 0
            ? parseInt(String((result.rows[0] as Record<string, unknown>).total_count), 10)
            : 0;
        const totalPages = Math.ceil(total / limit) || 1;

        // Format rows — all numeric fields as strings
        const data = result.rows.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            lat: String(row.lat),
            lon: String(row.lon),
            subtotal: String(row.subtotal),
            timestamp: (row.timestamp as Date).toISOString(),
            composite_tax_rate: String(row.composite_tax_rate),
            tax_amount: String(row.tax_amount),
            total_amount: String(row.total_amount),
            breakdown: row.breakdown as Record<string, unknown>,
            jurisdictions_applied: row.jurisdictions_applied as unknown[],
            created_at: (row.created_at as Date).toISOString(),
            source: String(row.source),
        }));

        res.json({ data, total, page, limit, totalPages });
    })
);

// ─── POST /api/orders ───────────────────────────────────────────
// Create a single order with tax calculation.
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const { lat, lon, subtotal, timestamp } = req.body;

        // Validate required fields
        if (lat === undefined || lon === undefined || subtotal === undefined) {
            res.status(400).json({ error: 'lat, lon, and subtotal are required' });
            return;
        }

        const latNum = Number(lat);
        const lonNum = Number(lon);
        // Validate subtotal as number but keep as string for precision
        const subtotalStr = String(subtotal).trim();
        const subtotalCheck = Number(subtotalStr);

        // Validate types & bounds
        if (isNaN(latNum) || latNum < 40.0 || latNum > 45.1) {
            res.status(400).json({ error: 'lat must be a number within NY State bounds (40.0 – 45.1)' });
            return;
        }
        if (isNaN(lonNum) || lonNum < -80.0 || lonNum > -71.0) {
            res.status(400).json({ error: 'lon must be a number within NY State bounds (-80.0 – -71.0)' });
            return;
        }
        if (isNaN(subtotalCheck) || subtotalCheck <= 0) {
            res.status(400).json({ error: 'subtotal must be a positive number' });
            return;
        }

        const orderTimestamp = timestamp ? new Date(timestamp) : new Date();
        if (isNaN(orderTimestamp.getTime())) {
            res.status(400).json({ error: 'timestamp must be a valid ISO 8601 date string' });
            return;
        }

        // Calculate tax
        // Pass subtotal as string to calculateTax to avoid float precision loss
        const taxResult = await calculateTax(latNum, lonNum, subtotalStr, orderTimestamp);

        // Insert into orders
        const id = uuidv4();
        const insertSql = `
            INSERT INTO orders (
                id, lat, lon, subtotal,
                composite_tax_rate, tax_amount, total_amount,
                breakdown, jurisdictions_applied, timestamp, source
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'manual')
            RETURNING *;
        `;

        const result = await query(insertSql, [
            id,
            latNum,
            lonNum,
            subtotalStr,  // string — DB casts to DECIMAL(12,2) without float noise
            taxResult.composite_tax_rate,
            taxResult.tax_amount,
            taxResult.total_amount,
            JSON.stringify(taxResult.breakdown),
            JSON.stringify(taxResult.jurisdictions_applied),
            orderTimestamp.toISOString(),
        ]);

        const row = result.rows[0] as Record<string, unknown>;

        // Return with all numeric fields as strings
        res.status(201).json({
            id: String(row.id),
            lat: String(row.lat),
            lon: String(row.lon),
            subtotal: String(row.subtotal),
            timestamp: (row.timestamp as Date).toISOString(),
            composite_tax_rate: String(row.composite_tax_rate),
            tax_amount: String(row.tax_amount),
            total_amount: String(row.total_amount),
            breakdown: row.breakdown,
            jurisdictions_applied: row.jurisdictions_applied,
            created_at: (row.created_at as Date).toISOString(),
            source: String(row.source),
        });
    })
);

// ─── POST /api/orders/import ────────────────────────────────────
// CSV file upload → chunked batch import.
router.post(
    '/import',
    upload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
            return;
        }

        const filePath = req.file.path;
        const startTimeMs = Date.now();

        try {
            // Batch CSV processing: chunked UNNEST read + write
            const result = await parseCsvAndImport(filePath);

            const endTimeMs = Date.now();
            const timeTakenSec = ((endTimeMs - startTimeMs) / 1000).toFixed(2);

            res.json({
                message: `Import complete. ${result.imported} imported, ${result.errors} errors. Time taken: ${timeTakenSec} seconds.`,
                imported: result.imported,
                errors: result.errors,
                timeTakenSec: timeTakenSec
            });
        } finally {
            // Always clean up the temp file
            fs.unlink(filePath, (err) => {
                if (err) console.error('Failed to delete temp file:', filePath, err.message);
            });
        }
    })
);

export default router;
