import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import ordersRouter from './routes/orders';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

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
app.use('/api/orders', ordersRouter);

import statsRouter from './routes/stats';
app.use('/api/stats', statsRouter);

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
