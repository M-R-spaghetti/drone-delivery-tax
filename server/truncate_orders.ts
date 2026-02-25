import { query } from './src/config/db';

async function main() {
    try {
        await query('TRUNCATE orders RESTART IDENTITY CASCADE;');
        console.log('Orders table truncated successfully.');
    } catch (e) {
        console.error('Failed to truncate', e);
    } finally {
        process.exit(0);
    }
}
main();
