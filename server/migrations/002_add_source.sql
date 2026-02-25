-- 002_add_source.sql
-- Add source column to track origin of order data

ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'batch';
