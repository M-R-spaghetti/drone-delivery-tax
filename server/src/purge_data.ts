import pool from './config/db';

async function purgeData() {
    try {
        console.log('Purging orders and import logs...');
        await pool.query('TRUNCATE orders, import_logs CASCADE');
        console.log('Purge successful.');
    } catch (err) {
        console.error('Error purging data:', err);
    } finally {
        process.exit();
    }
}

purgeData();
