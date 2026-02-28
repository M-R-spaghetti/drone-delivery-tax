-- 005_admin_features.sql
-- Up Migration

-- 1. Create import_logs table for CSV tracking and deduplication
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_hash TEXT NOT NULL UNIQUE,  -- SHA-256 for dedup
    rows_imported INT NOT NULL DEFAULT 0,
    rows_failed INT NOT NULL DEFAULT 0,
    processing_time_ms INT NOT NULL DEFAULT 0,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast deduplication checks
CREATE INDEX IF NOT EXISTS idx_import_logs_file_hash ON import_logs(file_hash);

-- 2. Add import_id to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES import_logs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_orders_import_id ON orders(import_id);

-- Note on Tax Rates (SCD Type 2):
-- The tax_rates table defined in 001_init.sql and 003_temporal_constraints.sql 
-- ALREADY implements SCD Type 2 with valid_from, valid_to, and EXCLUDE using gist.
-- No schema changes are required to support the Tax Rate Manager feature.
