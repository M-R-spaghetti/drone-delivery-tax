import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

/**
 * Seed script for NYS Drone Delivery Tax Calculator.
 *
 * Inserts simplified bounding-box polygons for NYS jurisdictions
 * and tax rates from Publication 718 (effective 2025-03-01).
 *
 * Jurisdictions:
 *   - 1 state (New York State)
 *   - 10 counties (Manhattan, Brooklyn, Queens, Bronx, Staten Island,
 *                   Nassau, Suffolk, Westchester, Albany, Erie)
 *   - 1 special district (MCTD)
 *
 *   NOTE: NYC's city tax is NOT separate from the county tax.
 *   The 4.5% county rate for NYC boroughs already includes the city portion.
 */

interface JurisdictionSeed {
    name: string;
    type: 'state' | 'county' | 'city' | 'special';
    wkt: string;
    rate: string;
}

// ─── Jurisdiction data with approximate bounding-box polygons ───
const JURISDICTIONS: JurisdictionSeed[] = [

    // ════════════════════════════════════════════════════════════
    //  STATE
    // ════════════════════════════════════════════════════════════
    {
        name: 'New York State',
        type: 'state',
        // Entire state: SW corner to NE corner
        wkt: 'MULTIPOLYGON(((-79.763 40.496, -71.856 40.496, -71.856 45.016, -79.763 45.016, -79.763 40.496)))',
        rate: '0.040000', // 4%
    },

    // ════════════════════════════════════════════════════════════
    //  COUNTIES
    // ════════════════════════════════════════════════════════════

    // New York County (Manhattan)
    {
        name: 'New York County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-74.020 40.698, -73.907 40.698, -73.907 40.882, -74.020 40.882, -74.020 40.698)))',
        rate: '0.045000', // 4.5%
    },

    // Kings County (Brooklyn)
    {
        name: 'Kings County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-74.042 40.570, -73.833 40.570, -73.833 40.739, -74.042 40.739, -74.042 40.570)))',
        rate: '0.045000', // 4.5%
    },

    // Queens County
    {
        name: 'Queens County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-73.963 40.541, -73.700 40.541, -73.700 40.812, -73.963 40.812, -73.963 40.541)))',
        rate: '0.045000', // 4.5%
    },

    // Bronx County
    {
        name: 'Bronx County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-73.934 40.785, -73.748 40.785, -73.748 40.917, -73.934 40.917, -73.934 40.785)))',
        rate: '0.045000', // 4.5%
    },

    // Richmond County (Staten Island)
    {
        name: 'Richmond County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-74.260 40.496, -74.052 40.496, -74.052 40.649, -74.260 40.649, -74.260 40.496)))',
        rate: '0.045000', // 4.5%
    },

    // Nassau County
    {
        name: 'Nassau County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-73.770 40.520, -73.425 40.520, -73.425 40.940, -73.770 40.940, -73.770 40.520)))',
        rate: '0.042500', // 4.25%
    },

    // Suffolk County
    {
        name: 'Suffolk County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-73.425 40.600, -71.856 40.600, -71.856 41.200, -73.425 41.200, -73.425 40.600)))',
        rate: '0.042500', // 4.25%
    },

    // Westchester County
    {
        name: 'Westchester County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-73.984 40.882, -73.615 40.882, -73.615 41.177, -73.984 41.177, -73.984 40.882)))',
        rate: '0.040000', // 4%
    },

    // Albany County
    {
        name: 'Albany County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-74.260 42.400, -73.640 42.400, -73.640 42.800, -74.260 42.800, -74.260 42.400)))',
        rate: '0.040000', // 4%
    },

    // Erie County (Buffalo area)
    {
        name: 'Erie County',
        type: 'county',
        wkt: 'MULTIPOLYGON(((-79.060 42.460, -78.460 42.460, -78.460 43.010, -79.060 43.010, -79.060 42.460)))',
        rate: '0.047500', // 4.75%
    },

    // NOTE: No separate "city" jurisdiction for NYC.
    // NYC's 4.5% is already the county rate for each borough.
    // Adding a city type would double-count: county 4.5% + city 4.5% = 9% instead of 4.5%.

    // ════════════════════════════════════════════════════════════
    //  SPECIAL DISTRICT
    // ════════════════════════════════════════════════════════════

    // MCTD — Metropolitan Commuter Transportation District
    // Covers NYC + Dutchess, Nassau, Orange, Putnam, Rockland, Suffolk, Westchester
    {
        name: 'MCTD',
        type: 'special',
        wkt: 'MULTIPOLYGON(((-74.690 40.496, -71.856 40.496, -71.856 41.880, -74.690 41.880, -74.690 40.496)))',
        rate: '0.003750', // 0.375%
    },
];

// ─── Main seed function ─────────────────────────────────────────

async function seed(): Promise<void> {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();

    try {
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║  NYS Drone Tax Calculator — Seed Script         ║');
        console.log('╚══════════════════════════════════════════════════╝\n');

        // Wrap entire seed in a transaction to prevent partial seeding
        await client.query('BEGIN');

        // 1. Clear existing data
        console.log('1. Clearing existing data...');
        await client.query('TRUNCATE tax_rates CASCADE;');
        await client.query('TRUNCATE jurisdictions CASCADE;');
        console.log('   ✓ Existing jurisdictions and tax_rates cleared.\n');

        // 2. Insert jurisdictions and their tax rates
        console.log('2. Seeding jurisdictions and tax rates...\n');
        console.log('   Type     │ Name                     │ Rate');
        console.log('   ─────────┼──────────────────────────┼──────────');

        let jurisdictionCount = 0;
        let rateCount = 0;

        for (const j of JURISDICTIONS) {
            // Insert jurisdiction with polygon geometry
            const insertJurisdiction = `
                INSERT INTO jurisdictions (name, type, geom)
                VALUES ($1, $2, ST_GeomFromText($3, 4326))
                RETURNING id;
            `;
            const jResult = await client.query<{ id: string }>(
                insertJurisdiction,
                [j.name, j.type, j.wkt]
            );
            const jurisdictionId = jResult.rows[0].id;
            jurisdictionCount++;

            // Insert tax rate for this jurisdiction
            const insertRate = `
                INSERT INTO tax_rates (jurisdiction_id, rate, valid_from, valid_to)
                VALUES ($1, $2, $3, $4);
            `;
            await client.query(insertRate, [
                jurisdictionId,
                j.rate,
                '2025-03-01',  // Publication 718 effective date
                null,          // Currently active (no end date)
            ]);
            rateCount++;

            const typeLabel = j.type.padEnd(8);
            const nameLabel = j.name.padEnd(25);
            console.log(`   ${typeLabel}│ ${nameLabel}│ ${j.rate}`);
        }

        // 3. Summary
        console.log('\n   ─────────┼──────────────────────────┼──────────');
        console.log(`\n✅ Seed complete!`);
        console.log(`   • ${jurisdictionCount} jurisdictions inserted`);
        console.log(`   • ${rateCount} tax rates inserted`);
        console.log(`   • Rates effective from: 2025-03-01 (Publication 718)\n`);

        // 4. Verification query
        const verifyJurisdictions = await client.query<{ type: string; count: string }>(
            `SELECT type, COUNT(*)::text AS count FROM jurisdictions GROUP BY type ORDER BY type;`
        );
        console.log('   Verification:');
        for (const row of verifyJurisdictions.rows) {
            console.log(`     ${row.type}: ${row.count}`);
        }

        // Quick spatial test: Manhattan point
        const testPoint = await client.query<{ name: string; type: string; rate: string }>(`
            SELECT j.name, j.type, tr.rate
            FROM jurisdictions j
            JOIN tax_rates tr ON tr.jurisdiction_id = j.id
            WHERE ST_Intersects(j.geom, ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326))
              AND tr.valid_from <= '2025-03-01'::date
              AND (tr.valid_to IS NULL OR tr.valid_to > '2025-03-01'::date)
            ORDER BY j.type;
        `);

        console.log('\n   Spatial test (Empire State Building — 40.7484, -73.9857):');
        if (testPoint.rows.length === 0) {
            console.log('     ⚠ No jurisdictions matched! Check polygon coordinates.');
        } else {
            for (const row of testPoint.rows) {
                console.log(`     ${row.type.padEnd(8)} │ ${row.name.padEnd(20)} │ ${row.rate}`);
            }
        }

        console.log('');

        await client.query('COMMIT');

    } catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('\n❌ Seed failed (transaction rolled back):', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
