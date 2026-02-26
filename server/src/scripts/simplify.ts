import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    try {
        // Vertex count BEFORE
        const before = await pool.query(
            `SELECT type, SUM(ST_NPoints(geom))::int AS total_vertices
             FROM jurisdictions GROUP BY type ORDER BY type`
        );
        console.log('=== BEFORE simplification ===');
        for (const r of before.rows) {
            console.log(`  ${r.type}: ${r.total_vertices} vertices`);
        }

        // Apply simplification
        const result = await pool.query(
            `UPDATE jurisdictions
             SET geom = ST_Multi(ST_SimplifyPreserveTopology(geom, 0.0005))
             WHERE type IN ('state', 'county', 'city', 'special')`
        );
        console.log(`\nSimplified ${result.rowCount} jurisdiction geometries.\n`);

        // Vertex count AFTER
        const after = await pool.query(
            `SELECT type, SUM(ST_NPoints(geom))::int AS total_vertices
             FROM jurisdictions GROUP BY type ORDER BY type`
        );
        console.log('=== AFTER simplification ===');
        for (const r of after.rows) {
            console.log(`  ${r.type}: ${r.total_vertices} vertices`);
        }

        // Clear orders for clean benchmark
        await pool.query('DELETE FROM orders');
        console.log('\nOrders cleared for benchmark.');
    } finally {
        await pool.end();
    }
})();
