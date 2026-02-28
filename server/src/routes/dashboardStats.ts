import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { query } from '../config/db';

const router = Router();

// ─── Helper: build WHERE clause with dateFrom/dateTo ────────────
function buildDateFilter(req: Request) {
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dateFrom) {
        conditions.push(`timestamp >= ($${idx}::date)::timestamp AT TIME ZONE 'UTC'`);
        values.push(dateFrom);
        idx++;
    }
    if (dateTo) {
        conditions.push(`timestamp < (($${idx}::date + interval '1 day'))::timestamp AT TIME ZONE 'UTC'`);
        values.push(dateTo);
        idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values, nextIdx: idx };
}

// ─── GET /api/dashboard-stats ───────────────────────────────────
// Single endpoint that returns ALL dashboard pre-computed data.
// All heavy aggregation happens in PostgreSQL, not on the client.
router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const { whereClause, values, nextIdx } = buildDateFilter(req);

        // ────────────────────────────────────────────────
        // 1. KPIs: total revenue, total tax, avg rate, order count
        // ────────────────────────────────────────────────
        const kpiSql = `
            SELECT
                COALESCE(SUM(total_amount), 0) AS total_rev,
                COALESCE(SUM(tax_amount), 0) AS total_tax,
                COALESCE(AVG(composite_tax_rate), 0) AS avg_rate,
                COUNT(*) AS orders
            FROM orders ${whereClause}
        `;

        // ────────────────────────────────────────────────
        // 2. Revenue & Tax by day (for RevenueVsTaxChart)
        // ────────────────────────────────────────────────
        const revenueByDaySql = `
            SELECT
                TO_CHAR(timestamp, 'YYYY-MM-DD') AS date,
                COALESCE(SUM(total_amount), 0) AS revenue,
                COALESCE(SUM(tax_amount), 0) AS tax
            FROM orders ${whereClause}
            GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD')
            ORDER BY date ASC
        `;

        // ────────────────────────────────────────────────
        // 3. Tax breakdown (state, county, city, special)
        // ────────────────────────────────────────────────
        const taxBreakdownSql = `
            SELECT
                COALESCE(SUM(subtotal * (breakdown->>'state_rate')::numeric), 0) AS state,
                COALESCE(SUM(subtotal * (breakdown->>'county_rate')::numeric), 0) AS county,
                COALESCE(SUM(subtotal * (breakdown->>'city_rate')::numeric), 0) AS city,
                COALESCE(SUM(subtotal * COALESCE((breakdown->>'special_rate')::numeric, (breakdown->>'special_rates')::numeric, 0)), 0) AS special
            FROM orders ${whereClause}
        `;

        // ────────────────────────────────────────────────
        // 4. Daily order counts (for heatmap)
        // ────────────────────────────────────────────────
        const heatmapSql = `
            SELECT
                TO_CHAR(timestamp, 'YYYY-MM-DD') AS date,
                COUNT(*) AS count
            FROM orders ${whereClause}
            GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD')
            ORDER BY date ASC
        `;

        // ────────────────────────────────────────────────
        // 5. AOV by day
        // ────────────────────────────────────────────────
        const aovByDaySql = `
            SELECT
                TO_CHAR(timestamp, 'YYYY-MM-DD') AS date,
                AVG(total_amount) AS aov
            FROM orders ${whereClause}
            GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD')
            ORDER BY date ASC
        `;

        // ────────────────────────────────────────────────
        // 6. Geo revenue by region (lat/lon → region mapping in SQL)
        // ────────────────────────────────────────────────
        const geoRevenueSql = `
            SELECT
                CASE
                    WHEN lat < 41.5 AND lon > -74.0 THEN 'NYC / LI'
                    WHEN lat < 41.5 AND lon > -76.0 THEN 'MID-HUDSON'
                    WHEN lat < 41.5 THEN 'SOUTHERN TIER'
                    WHEN lat < 43.0 AND lon > -74.0 THEN 'CAPITAL REGION'
                    WHEN lat < 43.0 AND lon > -76.5 THEN 'CENTRAL NY'
                    WHEN lat < 43.0 AND lon > -78.0 THEN 'FINGER LAKES'
                    WHEN lat < 43.0 THEN 'WESTERN NY'
                    WHEN lon > -74.5 THEN 'NORTH COUNTRY'
                    ELSE 'MOHAWK VALLEY'
                END AS region,
                COALESCE(SUM(total_amount), 0) AS revenue,
                COUNT(*) AS orders,
                COALESCE(SUM(tax_amount), 0) AS tax
            FROM orders ${whereClause}
            GROUP BY region
            ORDER BY revenue DESC
            LIMIT 8
        `;

        // ────────────────────────────────────────────────
        // 7. Recent orders for LiveMatrixLedger (only 20, pre-sorted)
        // ────────────────────────────────────────────────
        const recentOrdersSql = `
            SELECT id, total_amount, tax_amount, timestamp
            FROM orders ${whereClause}
            ORDER BY timestamp DESC
            LIMIT 20
        `;

        // ────────────────────────────────────────────────
        // 8. Month counts for CHRONO calendar (single query)
        // ────────────────────────────────────────────────
        const monthCountsSql = `
            SELECT
                TO_CHAR(timestamp, 'YYYY-MM') AS month,
                COUNT(*) AS count
            FROM orders
            GROUP BY TO_CHAR(timestamp, 'YYYY-MM')
            ORDER BY month ASC
        `;

        // ────────────────────────────────────────────────
        // 9. Tax liability breakdown (same as taxBreakdown but
        //    already handled above — reuse the same values)
        // ────────────────────────────────────────────────

        // Execute all queries in parallel
        const [
            kpiResult,
            revenueByDayResult,
            taxBreakdownResult,
            heatmapResult,
            aovByDayResult,
            geoRevenueResult,
            recentOrdersResult,
            monthCountsResult,
        ] = await Promise.all([
            query(kpiSql, values),
            query(revenueByDaySql, values),
            query(taxBreakdownSql, values),
            query(heatmapSql, values),
            query(aovByDaySql, values),
            query(geoRevenueSql, values),
            query(recentOrdersSql, values),
            query(monthCountsSql, []),  // No date filter for month counts
        ]);

        // Format response
        const kpiRow = kpiResult.rows[0] as Record<string, unknown>;
        const tbRow = taxBreakdownResult.rows[0] as Record<string, unknown>;

        const monthCounts: Record<string, number> = {};
        monthCountsResult.rows.forEach((row: any) => {
            monthCounts[row.month] = Number(row.count);
        });

        res.json({
            kpis: {
                totalRev: Number(kpiRow.total_rev),
                totalTax: Number(kpiRow.total_tax),
                avgRate: Number(kpiRow.avg_rate),
                orders: Number(kpiRow.orders),
            },
            revenueByDay: revenueByDayResult.rows.map((r: any) => ({
                date: String(r.date),
                revenue: Number(r.revenue),
                tax: Number(r.tax),
            })),
            taxBreakdown: {
                state: Number(tbRow.state),
                county: Number(tbRow.county),
                city: Number(tbRow.city),
                special: Number(tbRow.special),
            },
            dailyHeatmap: heatmapResult.rows.map((r: any) => ({
                date: String(r.date),
                count: Number(r.count),
            })),
            aovByDay: aovByDayResult.rows.map((r: any) => ({
                date: String(r.date),
                aov: Number(r.aov),
            })),
            geoRevenue: geoRevenueResult.rows.map((r: any) => ({
                name: String(r.region),
                revenue: Number(r.revenue),
                orders: Number(r.orders),
                tax: Number(r.tax),
            })),
            recentOrders: recentOrdersResult.rows.map((r: any) => ({
                id: String(r.id),
                total_amount: Number(r.total_amount),
                tax_amount: Number(r.tax_amount),
                timestamp: (r.timestamp as Date).toISOString(),
            })),
            monthCounts,
        });
    })
);

export default router;
