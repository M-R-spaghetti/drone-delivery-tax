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

// ─── GET /api/orders ────────────────────────────────────────────
// Paginated list with optional filters.
// Uses COUNT(*) OVER() window function to get total in one query.
router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const offset = (page - 1) * limit;

        const dateFrom = (req.query.dateFrom as string) || undefined;
        const dateTo = (req.query.dateTo as string) || undefined;
        const minRate = req.query.minRate !== undefined ? parseFloat(req.query.minRate as string) : undefined;
        const maxRate = req.query.maxRate !== undefined ? parseFloat(req.query.maxRate as string) : undefined;

        // Build dynamic WHERE clause
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

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
        const subtotalNum = Number(subtotal);

        // Validate types & bounds
        if (isNaN(latNum) || latNum < 40.0 || latNum > 45.1) {
            res.status(400).json({ error: 'lat must be a number within NY State bounds (40.0 – 45.1)' });
            return;
        }
        if (isNaN(lonNum) || lonNum < -80.0 || lonNum > -71.0) {
            res.status(400).json({ error: 'lon must be a number within NY State bounds (-80.0 – -71.0)' });
            return;
        }
        if (isNaN(subtotalNum) || subtotalNum <= 0) {
            res.status(400).json({ error: 'subtotal must be a positive number' });
            return;
        }

        const orderTimestamp = timestamp ? new Date(timestamp) : new Date();
        if (isNaN(orderTimestamp.getTime())) {
            res.status(400).json({ error: 'timestamp must be a valid ISO 8601 date string' });
            return;
        }

        // Calculate tax
        const taxResult = await calculateTax(latNum, lonNum, subtotalNum, orderTimestamp);

        // Insert into orders
        const id = uuidv4();
        const insertSql = `
            INSERT INTO orders (
                id, lat, lon, subtotal,
                composite_tax_rate, tax_amount, total_amount,
                breakdown, jurisdictions_applied, timestamp
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;

        const result = await query(insertSql, [
            id,
            latNum,
            lonNum,
            subtotalNum,
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

        try {
            // Batch CSV processing: chunked UNNEST read + write
            const result = await parseCsvAndImport(filePath);

            res.json({
                message: `Import complete. ${result.imported} imported, ${result.errors} errors.`,
                imported: result.imported,
                errors: result.errors,
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
