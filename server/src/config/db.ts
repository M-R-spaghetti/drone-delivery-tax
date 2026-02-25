import dotenv from 'dotenv';
import { Pool, QueryResult, QueryResultRow } from 'pg';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                       // 2-3x CONCURRENCY headroom
    idleTimeoutMillis: 30000,      // release idle connections after 30s
    connectionTimeoutMillis: 5000, // fail fast if DB unreachable
    statement_timeout: 60000,      // accommodate large batches
});

pool.on('error', (err: Error) => {
    // Log but do NOT crash — transient DB errors should not kill the server.
    // The pool will automatically attempt to reconnect on next query.
    console.error('[DB POOL ERROR] Unexpected error on idle client:', err.message);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> {
    return pool.query<T>(text, params);
}

export async function getClient() {
    const client = await pool.connect();
    return client;
}

export default pool;
