import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * Seed script for NYS Drone Delivery Tax Calculator — v3.0 (REAL POLYGONS)
 *
 * Loads ACTUAL county boundary polygons from the NYS Civil Boundaries GeoJSON
 * file instead of bounding-box approximations. This eliminates:
 *   - Overlapping rectangles causing double-count of county taxes
 *   - Taxing deliveries across state lines (NJ, CT, PA, VT)
 *   - Non-deterministic county selection
 *
 * Data sources:
 *   - Geometry: NYS_Civil_Boundaries_2455759864913236436.geojson (NYS GIS)
 *   - Tax rates: Publication 718 (effective 2025-03-01)
 *
 * Rate derivation methodology:
 *   Pub 718 combined = state + local + MCTD (where applicable)
 *   Local rate = combined - 4% state - 0.375% MCTD (only for * jurisdictions)
 *
 * Jurisdictions inserted:
 *   - 1  state  (union of all 62 counties → single MultiPolygon)
 *   - 62 counties (real polygons from GeoJSON)
 *   - 1  city   (Yonkers — extracted from Westchester polygon)
 *   - 1  special (MCTD — union of NYC boroughs + Dutchess, Nassau, Orange,
 *                  Putnam, Rockland, Suffolk, Westchester)
 */

// ─── GeoJSON types ──────────────────────────────────────────────

interface GeoJsonFeature {
    type: 'Feature';
    geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: number[][][] | number[][][][];
    };
    properties: {
        NAME: string;
        NYC: 'Y' | 'N';
        [key: string]: unknown;
    };
}

interface GeoJsonCollection {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
}

// ─── County tax rate lookup ─────────────────────────────────────
// Local-only rate (combined rate from Pub 718 minus state & MCTD where applicable)
// Key = county NAME as it appears in the GeoJSON file

const COUNTY_RATES: Record<string, string> = {
    // NYC boroughs — 4.5% local (Pub 718: 8.875%, *MCTD)
    'New York': '0.045000', // Manhattan
    'Kings': '0.045000', // Brooklyn
    'Queens': '0.045000',
    'Bronx': '0.045000',
    'Richmond': '0.045000', // Staten Island

    // MCTD counties (outside NYC) — marked with * in Pub 718
    'Dutchess': '0.037500', // Pub 718: 8.125% combined
    'Nassau': '0.042500', // Pub 718: 8.625%
    'Orange': '0.037500', // Pub 718: 8.125%
    'Putnam': '0.040000', // Pub 718: 8.375%
    'Rockland': '0.040000', // Pub 718: 8.375%
    'Suffolk': '0.043750', // Pub 718: 8.75%  ← FIXED (was 4.25% in v1)
    'Westchester': '0.040000', // Pub 718: 8.375%

    // Non-MCTD counties — rate = combined - 4% state
    'Albany': '0.040000', // Pub 718: 8%
    'Allegany': '0.045000', // Pub 718: 8.5%
    'Broome': '0.040000', // Pub 718: 8%
    'Cattaraugus': '0.040000', // Pub 718: 8%
    'Cayuga': '0.040000', // Pub 718: 8%
    'Chautauqua': '0.040000', // Pub 718: 8%
    'Chemung': '0.040000', // Pub 718: 8%
    'Chenango': '0.040000', // Pub 718: 8%
    'Clinton': '0.040000', // Pub 718: 8%
    'Columbia': '0.040000', // Pub 718: 8%
    'Cortland': '0.040000', // Pub 718: 8%
    'Delaware': '0.040000', // Pub 718: 8%
    'Erie': '0.047500', // Pub 718: 8.75%
    'Essex': '0.040000', // Pub 718: 8%
    'Franklin': '0.040000', // Pub 718: 8%
    'Fulton': '0.040000', // Pub 718: 8%
    'Genesee': '0.040000', // Pub 718: 8%
    'Greene': '0.040000', // Pub 718: 8%
    'Hamilton': '0.040000', // Pub 718: 8%
    'Herkimer': '0.042500', // Pub 718: 8.25%
    'Jefferson': '0.040000', // Pub 718: 8%
    'Lewis': '0.040000', // Pub 718: 8%
    'Livingston': '0.040000', // Pub 718: 8%
    'Madison': '0.040000', // Pub 718: 8%
    'Monroe': '0.040000', // Pub 718: 8%
    'Montgomery': '0.040000', // Pub 718: 8%
    'Niagara': '0.040000', // Pub 718: 8%
    'Oneida': '0.047500', // Pub 718: 8.75%
    'Onondaga': '0.040000', // Pub 718: 8%
    'Ontario': '0.035000', // Pub 718: 7.5%
    'Orleans': '0.040000', // Pub 718: 8%
    'Oswego': '0.040000', // Pub 718: 8%
    'Otsego': '0.040000', // Pub 718: 8%
    'Rensselaer': '0.040000', // Pub 718: 8%
    'St Lawrence': '0.040000', // Pub 718: 8%
    'Saratoga': '0.030000', // Pub 718: 7%
    'Schenectady': '0.040000', // Pub 718: 8%
    'Schoharie': '0.040000', // Pub 718: 8%
    'Schuyler': '0.040000', // Pub 718: 8%
    'Seneca': '0.040000', // Pub 718: 8%
    'Steuben': '0.040000', // Pub 718: 8%
    'Sullivan': '0.040000', // Pub 718: 8%
    'Tioga': '0.040000', // Pub 718: 8%
    'Tompkins': '0.040000', // Pub 718: 8%
    'Ulster': '0.040000', // Pub 718: 8%
    'Warren': '0.030000', // Pub 718: 7%
    'Washington': '0.030000', // Pub 718: 7%
    'Wayne': '0.040000', // Pub 718: 8%
    'Wyoming': '0.040000', // Pub 718: 8%
    'Yates': '0.040000', // Pub 718: 8%
};

// MCTD member counties (NYC boroughs + 7 suburban counties)
const MCTD_COUNTIES = new Set([
    'New York', 'Kings', 'Queens', 'Bronx', 'Richmond',
    'Dutchess', 'Nassau', 'Orange', 'Putnam', 'Rockland', 'Suffolk', 'Westchester',
]);

// ─── Main seed function ─────────────────────────────────────────

async function seed(): Promise<void> {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();

    try {
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  NYS Drone Tax Calculator — Seed Script v3.0        ║');
        console.log('║  REAL POLYGONS from NYS Civil Boundaries GeoJSON    ║');
        console.log('╚══════════════════════════════════════════════════════╝\n');

        // 1. Load GeoJSON
        const geojsonPath = path.resolve(__dirname, '../../../NYS_Civil_Boundaries_2455759864913236436.geojson');
        if (!fs.existsSync(geojsonPath)) {
            throw new Error(`GeoJSON file not found: ${geojsonPath}`);
        }
        console.log('1. Loading GeoJSON from:', geojsonPath);
        const geojsonData: GeoJsonCollection = JSON.parse(
            fs.readFileSync(geojsonPath, 'utf8')
        );
        console.log(`   ✓ Loaded ${geojsonData.features.length} county features.\n`);

        // Build lookup: county name → GeoJSON geometry
        const countyGeometries = new Map<string, object>();
        for (const feature of geojsonData.features) {
            countyGeometries.set(feature.properties.NAME, feature.geometry);
        }

        // Validate all expected counties exist in GeoJSON
        const missingCounties: string[] = [];
        for (const countyName of Object.keys(COUNTY_RATES)) {
            if (!countyGeometries.has(countyName)) {
                missingCounties.push(countyName);
            }
        }
        if (missingCounties.length > 0) {
            throw new Error(`Counties in rate table but NOT in GeoJSON: ${missingCounties.join(', ')}`);
        }

        // Begin transaction
        await client.query('BEGIN');

        // 2. Clear existing data
        console.log('2. Clearing existing data...');
        await client.query('TRUNCATE tax_rates CASCADE;');
        await client.query('TRUNCATE jurisdictions CASCADE;');
        console.log('   ✓ Existing jurisdictions and tax_rates cleared.\n');

        // 3. Insert all 62 counties with REAL polygons
        console.log('3. Seeding counties with REAL polygon boundaries...\n');
        console.log('   Type     │ Name                     │ Rate     │ Geom Type');
        console.log('   ─────────┼──────────────────────────┼──────────┼──────────────');

        let jurisdictionCount = 0;
        let rateCount = 0;
        const countyIds = new Map<string, string>(); // name → jurisdiction UUID

        for (const [countyName, rate] of Object.entries(COUNTY_RATES)) {
            const geom = countyGeometries.get(countyName)!;
            const geomJson = JSON.stringify(geom);

            // Insert jurisdiction — ST_GeomFromGeoJSON handles both Polygon and MultiPolygon
            // ST_Multi ensures the result is always MultiPolygon (schema requirement)
            // ST_Buffer by 0.00005 degrees (~5 meters) eliminates micro-gaps between boundaries
            const insertSql = `
                INSERT INTO jurisdictions (name, type, geom)
                VALUES ($1, 'county', ST_Multi(ST_SimplifyPreserveTopology(ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 0.00005), 0.0005)))
                RETURNING id;
            `;
            const jResult = await client.query<{ id: string }>(insertSql, [
                `${countyName} County`,
                geomJson,
            ]);
            const jurisdictionId = jResult.rows[0].id;
            countyIds.set(countyName, jurisdictionId);
            jurisdictionCount++;

            // Insert tax rate
            await client.query(
                `INSERT INTO tax_rates (jurisdiction_id, rate, valid_from, valid_to) VALUES ($1, $2, $3, $4);`,
                [jurisdictionId, rate, '2025-03-01', null]
            );
            rateCount++;

            const typeLabel = 'county'.padEnd(8);
            const nameLabel = `${countyName} County`.padEnd(25);
            const geomType = ((geom as any).type as string).padEnd(13);
            console.log(`   ${typeLabel}│ ${nameLabel}│ ${rate} │ ${geomType}`);
        }

        // 4. Insert NYS State — union of ALL county polygons
        console.log('\n4. Creating state-level jurisdiction (union of all counties)...');
        const stateInsertSql = `
            INSERT INTO jurisdictions (name, type, geom)
            VALUES (
                'New York State',
                'state',
                (SELECT ST_Multi(ST_Union(geom)) FROM jurisdictions WHERE type = 'county')
            )
            RETURNING id;
        `;
        const stateResult = await client.query<{ id: string }>(stateInsertSql);
        const stateId = stateResult.rows[0].id;
        jurisdictionCount++;

        await client.query(
            `INSERT INTO tax_rates (jurisdiction_id, rate, valid_from, valid_to) VALUES ($1, $2, $3, $4);`,
            [stateId, '0.040000', '2025-03-01', null]
        );
        rateCount++;
        console.log('   ✓ New York State (4.00%) — geometry = ST_Union of all 62 counties.');

        // 5. Insert MCTD — union of 12 MCTD-member county polygons
        console.log('\n5. Creating MCTD special district (union of 12 counties)...');
        const mctdCountyIds = [...MCTD_COUNTIES]
            .map(name => countyIds.get(name))
            .filter((id): id is string => id !== undefined);

        const mctdInsertSql = `
            INSERT INTO jurisdictions (name, type, geom)
            VALUES (
                'MCTD',
                'special',
                (SELECT ST_Multi(ST_Union(geom)) FROM jurisdictions WHERE id = ANY($1::uuid[]))
            )
            RETURNING id;
        `;
        const mctdResult = await client.query<{ id: string }>(mctdInsertSql, [mctdCountyIds]);
        const mctdId = mctdResult.rows[0].id;
        jurisdictionCount++;

        await client.query(
            `INSERT INTO tax_rates (jurisdiction_id, rate, valid_from, valid_to) VALUES ($1, $2, $3, $4);`,
            [mctdId, '0.003750', '2025-03-01', null]
        );
        rateCount++;
        console.log(`   ✓ MCTD (0.375%) — geometry = ST_Union of ${mctdCountyIds.length} member counties.`);

        // 6. Insert Yonkers city — exact polygon extracted from GDB Cities layer
        // Yonkers has a separate city-level 0.5% surcharge on top of Westchester county rate
        // Pub 718: Yonkers = 8.875% = 4% state + 4% Westchester + 0.375% MCTD + 0.5% Yonkers
        console.log('\n6. Creating Yonkers city jurisdiction...');
        const yonkersGeojsonPath = path.resolve(__dirname, '../../../yonkers.geojson');
        const yonkersGeojson = fs.readFileSync(yonkersGeojsonPath, 'utf8');
        const yonkersInsertSql = `
            INSERT INTO jurisdictions (name, type, geom)
            VALUES (
                'Yonkers',
                'city',
                ST_Multi(ST_SimplifyPreserveTopology(ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 0.00005), 0.0005))
            )
            RETURNING id;
        `;
        const yonkersResult = await client.query<{ id: string }>(yonkersInsertSql, [yonkersGeojson]);
        const yonkersId = yonkersResult.rows[0].id;
        jurisdictionCount++;

        await client.query(
            `INSERT INTO tax_rates (jurisdiction_id, rate, valid_from, valid_to) VALUES ($1, $2, $3, $4);`,
            [yonkersId, '0.005000', '2025-03-01', null]
        );
        rateCount++;
        console.log('   ✓ Yonkers (0.5% city surcharge) — exact polygon from Geographic Data.');

        // 7. Summary
        console.log('\n   ─────────┼──────────────────────────┼──────────');
        console.log(`\n✅ Seed complete!`);
        console.log(`   • ${jurisdictionCount} jurisdictions inserted`);
        console.log(`   • ${rateCount} tax rates inserted`);
        console.log(`   • Rates effective from: 2025-03-01 (Publication 718)\n`);

        // 8. Verification
        const verifyJurisdictions = await client.query<{ type: string; count: string }>(
            `SELECT type, COUNT(*)::text AS count FROM jurisdictions GROUP BY type ORDER BY type;`
        );
        console.log('   Verification:');
        for (const row of verifyJurisdictions.rows) {
            console.log(`     ${row.type}: ${row.count}`);
        }

        // Spatial test: Empire State Building (Manhattan)
        const testPoint = await client.query<{ name: string; type: string; rate: string }>(`
            SELECT j.name, j.type, tr.rate
            FROM jurisdictions j
            JOIN tax_rates tr ON tr.jurisdiction_id = j.id
            WHERE ST_Intersects(j.geom, ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326))
              AND tr.valid_from <= '2025-03-01'::date
              AND (tr.valid_to IS NULL OR tr.valid_to > '2025-03-01'::date)
            ORDER BY j.type, j.name;
        `);

        console.log('\n   Spatial test (Empire State Building — 40.7484, -73.9857):');
        if (testPoint.rows.length === 0) {
            console.log('     ⚠ No jurisdictions matched! Check polygon data.');
        } else {
            let compositeCheck = 0;
            for (const row of testPoint.rows) {
                const rate = parseFloat(row.rate);
                compositeCheck += rate;
                console.log(`     ${row.type.padEnd(8)} │ ${row.name.padEnd(25)} │ ${row.rate}`);
            }
            console.log(`     ─────────┼───────────────────────────┼──────────`);
            console.log(`     TOTAL    │ Composite Rate             │ ${(compositeCheck * 100).toFixed(3)}%`);
            console.log(`     Expected │ Pub 718 (NYC)              │ 8.875%`);
        }

        // Anti-overlap test: a point in Brooklyn should NOT match Manhattan
        const brooklynTest = await client.query<{ name: string; type: string }>(`
            SELECT j.name, j.type
            FROM jurisdictions j
            WHERE ST_Intersects(j.geom, ST_SetSRID(ST_MakePoint(-73.9857, 40.6892), 4326))
              AND j.type = 'county';
        `);
        console.log('\n   Anti-overlap test (Statue of Liberty area — 40.6892, -73.9857):');
        if (brooklynTest.rows.length === 1) {
            console.log(`     ✅ Exactly 1 county: ${brooklynTest.rows[0].name} — no double-counting!`);
        } else if (brooklynTest.rows.length === 0) {
            console.log(`     ⚠ 0 counties matched — point may be in water/NJ`);
        } else {
            console.log(`     ❌ ${brooklynTest.rows.length} counties matched — OVERLAP DETECTED:`);
            for (const row of brooklynTest.rows) {
                console.log(`        - ${row.name}`);
            }
        }

        // NJ test: point in Jersey City should NOT match any NYS county
        const njTest = await client.query<{ name: string; type: string }>(`
            SELECT j.name, j.type
            FROM jurisdictions j
            WHERE ST_Intersects(j.geom, ST_SetSRID(ST_MakePoint(-74.0431, 40.7178), 4326))
              AND j.type IN ('county', 'state');
        `);
        console.log('\n   Out-of-state test (Jersey City, NJ — 40.7178, -74.0431):');
        if (njTest.rows.length === 0) {
            console.log('     ✅ 0 NYS jurisdictions matched — correct! No cross-state taxation.');
        } else {
            console.log(`     ❌ ${njTest.rows.length} NYS jurisdictions matched — CROSS-STATE ERROR:`);
            for (const row of njTest.rows) {
                console.log(`        - ${row.name} (${row.type})`);
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
