import pool from './config/db';

async function checkImports() {
    try {
        const result = await pool.query('SELECT * FROM import_logs ORDER BY created_at DESC');
        console.log('Import Logs:', JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error('Error checking imports:', err);
    } finally {
        process.exit();
    }
}

checkImports();
