import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { query } from '../config/db';

const router = Router();

// ─── GET /api/stats ─────────────────────────────────────────────
router.get(
    '/',
    asyncHandler(async (_req: Request, res: Response) => {
        // 1. Overall Summary (Total Revenue, Total Orders, Total Tax, AOV)
        const summarySql = `
            SELECT 
                COUNT(*) AS total_orders,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(SUM(tax_amount), 0) AS total_tax,
                COALESCE(AVG(total_amount), 0) AS average_order_value
            FROM orders
        `;
        const summaryResult = await query(summarySql, []);
        const summaryRow = summaryResult.rows[0];

        // 2. Top Cities (By number of orders)
        // Extract city name from jurisdictions_applied jsonb array
        const topCitiesSql = `
            SELECT 
                j->>'name' as city,
                COUNT(*) as orders,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM orders,
            jsonb_array_elements(jurisdictions_applied) as j
            WHERE j->>'type' = 'city'
            GROUP BY j->>'name'
            ORDER BY orders DESC, revenue DESC
            LIMIT 5
        `;
        const topCitiesResult = await query(topCitiesSql, []);

        // 3. Top Transactions
        // Find the city name for the transaction to display in the UI
        const topTransactionsSql = `
            SELECT 
                id as order_id, 
                total_amount as amount, 
                (
                    SELECT j->>'name'
                    FROM jsonb_array_elements(jurisdictions_applied) as j
                    WHERE j->>'type' = 'city'
                    LIMIT 1
                ) as city,
                timestamp
            FROM orders
            ORDER BY total_amount DESC
            LIMIT 5
        `;
        const topTransactionsResult = await query(topTransactionsSql, []);

        // 4. Revenue by Day (Last 30 days)
        // Group by day for the area chart
        const revenueByDaySql = `
            SELECT 
                TO_CHAR(timestamp, 'YYYY-MM-DD') as date, 
                COALESCE(SUM(total_amount), 0) as revenue
            FROM orders
            WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD')
            ORDER BY date ASC
        `;
        const revenueByDayResult = await query(revenueByDaySql, []);

        // Formatting Response
        res.json({
            summary: {
                totalOrders: Number(summaryRow.total_orders),
                totalRevenue: Number(summaryRow.total_revenue),
                totalTax: Number(summaryRow.total_tax),
                averageOrderValue: Number(summaryRow.average_order_value)
            },
            topCities: topCitiesResult.rows.map(row => ({
                city: String(row.city),
                orders: Number(row.orders),
                revenue: Number(row.revenue)
            })),
            topTransactions: topTransactionsResult.rows.map(row => ({
                order_id: String(row.order_id).substring(0, 8), // Short ID for UI
                amount: Number(row.amount),
                city: row.city ? String(row.city) : 'Unknown',
                timestamp: (row.timestamp as Date).toISOString()
            })),
            revenueByDay: revenueByDayResult.rows.map(row => ({
                date: String(row.date),
                revenue: Number(row.revenue)
            }))
        });
    })
);

export default router;
