const { Pool } = require('pg');
require('dotenv').config();

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const res = await pool.query('SELECT COUNT(*) FROM jurisdictions');
    console.log('Jurisdiction count:', res.rows[0].count);
    await pool.end();
}
check().catch(console.error);
