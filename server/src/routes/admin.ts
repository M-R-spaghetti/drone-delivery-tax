import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { query } from '../config/db';

const router = Router();

// ─── ADMIN DASHBOARD STATS ──────────────────────────────────────────────────
router.get(
    '/stats',
    asyncHandler(async (_req: Request, res: Response) => {
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM jurisdictions) as total_jurisdictions,
                (SELECT COUNT(*) FROM tax_rates) as total_tax_rates,
                (SELECT COUNT(*) FROM import_logs) as total_imports,
                (SELECT MAX(created_at) FROM import_logs) as last_import_date,
                pg_database_size(current_database()) as db_size_bytes;
        `;
        const result = await query(statsQuery);
        res.json(result.rows[0]);
    })
);

// ─── SYSTEM CONFIGURATION ───────────────────────────────────────────────────
router.get(
    '/health',
    asyncHandler(async (_req: Request, res: Response) => {
        const start = performance.now();
        const result = await query('SELECT version()');
        const end = performance.now();
        res.json({
            status: 'nominal',
            ping_ms: Math.round(end - start),
            version: result.rows[0].version
        });
    })
);

// ─── DATA MANAGEMENT ────────────────────────────────────────────────────────
router.delete(
    '/purge-all',
    asyncHandler(async (_req: Request, res: Response) => {
        // Double confirm should be handled by the UI, but we provide the atomic wipe here.
        await query('TRUNCATE orders CASCADE');
        await query('TRUNCATE import_logs CASCADE');
        res.json({ message: 'All ledger data purged successfully.' });
    })
);

router.delete(
    '/purge-date-range',
    asyncHandler(async (req: Request, res: Response) => {
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;
        if (!startDate || !endDate) {
            res.status(400).json({ error: 'startDate and endDate query params are required' });
            return;
        }

        const result = await query(
            'DELETE FROM orders WHERE timestamp >= $1::timestamptz AND timestamp <= $2::timestamptz RETURNING id',
            [startDate, endDate]
        );
        res.json({ message: `Purged ${result.rowCount} records.`, count: result.rowCount });
    })
);

// ─── IMPORT MANAGEMENT ──────────────────────────────────────────────────────
router.get(
    '/imports',
    asyncHandler(async (_req: Request, res: Response) => {
        const result = await query(`
            SELECT * FROM import_logs 
            ORDER BY created_at DESC 
            LIMIT 50
        `);
        res.json(result.rows);
    })
);

router.delete(
    '/imports/:id/rollback',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        // The cascading delete on import_logs will automatically delete linked orders
        // BUT, since we added the column with ON DELETE CASCADE, deleting from import_logs
        // will wipe the orders. Wait, the migration was `REFERENCES import_logs(id) ON DELETE CASCADE`.
        // So we can just delete the import log!
        const result = await query('DELETE FROM import_logs WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Import log not found.' });
            return;
        }
        res.json({ message: 'Import rolled back successfully. Linked orders removed.' });
    })
);

// ─── TAX RATE MANAGEMENT ────────────────────────────────────────────────────
router.get(
    '/tax-rates',
    asyncHandler(async (_req: Request, res: Response) => {
        const result = await query(`
            SELECT 
                j.id as jurisdiction_id,
                j.name,
                j.type,
                tr.id as rate_id,
                tr.rate,
                tr.valid_from,
                tr.valid_to
            FROM jurisdictions j
            JOIN tax_rates tr ON tr.jurisdiction_id = j.id
            ORDER BY j.type, j.name, tr.valid_from DESC
        `);

        // Group by jurisdiction
        const grouped = result.rows.reduce((acc: any, row: any) => {
            if (!acc[row.jurisdiction_id]) {
                acc[row.jurisdiction_id] = {
                    jurisdiction_id: row.jurisdiction_id,
                    name: row.name,
                    type: row.type,
                    rates: []
                };
            }
            acc[row.jurisdiction_id].rates.push({
                rate_id: row.rate_id,
                rate: row.rate,
                valid_from: row.valid_from,
                valid_to: row.valid_to
            });
            return acc;
        }, {});

        res.json(Object.values(grouped));
    })
);

router.post(
    '/tax-rates/update',
    asyncHandler(async (req: Request, res: Response) => {
        const { jurisdiction_id, new_rate, effective_date } = req.body;

        if (!jurisdiction_id || new_rate === undefined || !effective_date) {
            res.status(400).json({ error: 'jurisdiction_id, new_rate, effective_date required' });
            return;
        }

        const client = await require('../config/db').getClient();
        try {
            await client.query('BEGIN');

            // 1. Expire the currently active rate exactly BEFORE the new effective date
            await client.query(`
                UPDATE tax_rates 
                SET valid_to = $1::date 
                WHERE jurisdiction_id = $2 
                  AND valid_to IS NULL
            `, [effective_date, jurisdiction_id]);

            // 2. Insert the new rate
            const insertResult = await client.query(`
                INSERT INTO tax_rates (jurisdiction_id, rate, valid_from, valid_to)
                VALUES ($1, $2, $3::date, NULL)
                RETURNING *
            `, [jurisdiction_id, new_rate, effective_date]);

            await client.query('COMMIT');
            res.json(insertResult.rows[0]);
        } catch (err: any) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: 'Failed to update rate. ' + err.message });
        } finally {
            client.release();
        }
    })
);

router.get(
    '/tax-ledger',
    asyncHandler(async (_req: Request, res: Response) => {
        const result = await query(`
            SELECT 
                tr.id as rate_id,
                j.name as jurisdiction_name,
                j.type,
                tr.rate,
                tr.valid_from,
                tr.valid_to,
                (
                    SELECT prev_tr.rate 
                    FROM tax_rates prev_tr 
                    WHERE prev_tr.jurisdiction_id = tr.jurisdiction_id 
                      AND prev_tr.valid_to = tr.valid_from
                    LIMIT 1
                ) as previous_rate
            FROM tax_rates tr
            JOIN jurisdictions j ON tr.jurisdiction_id = j.id
            ORDER BY tr.valid_from DESC, j.name ASC
        `);
        res.json(result.rows);
    })
);

router.delete(
    '/tax-ledger/:id/revert',
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const client = await query('BEGIN').then(() => require('../config/db').getClient());

        try {
            // 1. Get the rate we are trying to delete and make sure it's the CURRENT active one
            // (If it's not the active one, reverting it would break history, so we only allow reverting the HEAD)
            const targetRes = await client.query('SELECT * FROM tax_rates WHERE id = $1', [id]);
            if (targetRes.rowCount === 0) {
                await client.query('ROLLBACK');
                res.status(404).json({ error: 'Rate mutation not found' });
                return;
            }

            const targetRate = targetRes.rows[0];
            if (targetRate.valid_to !== null) {
                await client.query('ROLLBACK');
                res.status(400).json({ error: 'Can only revert the currently active tax rate (HEAD).' });
                return;
            }

            // 2. Delete the target rate
            await client.query('DELETE FROM tax_rates WHERE id = $1', [id]);

            // 3. Find the previous rate (the one that ended exactly when this one started) and make it active again
            await client.query(`
                UPDATE tax_rates 
                SET valid_to = NULL 
                WHERE jurisdiction_id = $1 AND valid_to = $2
            `, [targetRate.jurisdiction_id, targetRate.valid_from]);

            await client.query('COMMIT');
            res.json({ message: 'Mutation reverted. Previous rate restored.' });
        } catch (err: any) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: 'Failed to revert mutation: ' + err.message });
        } finally {
            client.release();
        }
    })
);

export default router;
