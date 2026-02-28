import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import ordersRouter from './routes/orders';
import statsRouter from './routes/stats';
import dashboardStatsRouter from './routes/dashboardStats';
import adminRouter from './routes/admin';
import { query as dbQuery } from './config/db';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Rate Limiting ──────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 200,             // 200 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,              // 20 requests per minute for admin ops
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many admin requests, please try again later.' },
});

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5173',  // Vite dev server
        'http://localhost:3000',  // Alternative dev port
    ],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────
app.use('/api/orders', apiLimiter, ordersRouter);
app.use('/api/stats', apiLimiter, statsRouter);
app.use('/api/dashboard-stats', apiLimiter, dashboardStatsRouter);
app.use('/api/admin', adminLimiter, adminRouter);

// ─── Create indexes on startup (idempotent) ────────────────────
dbQuery('CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders (timestamp)').catch((err: Error) =>
    console.error('[INDEX] Failed to create idx_orders_timestamp:', err.message)
);
dbQuery('CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders (total_amount)').catch((err: Error) =>
    console.error('[INDEX] Failed to create idx_orders_total_amount:', err.message)
);

// ─── Health Check ───────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ───────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Log full details server-side for debugging
    console.error('[ERROR]', err.message);
    console.error(err.stack);
    // Return generic message to client — never leak internal details
    // (DB connection strings, SQL errors, file paths, etc.)
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
        error: isProduction ? 'Internal Server Error' : err.message || 'Internal Server Error',
    });
});

// ─── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
