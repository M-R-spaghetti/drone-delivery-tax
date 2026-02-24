-- 001_init.sql
-- NYS Drone Delivery Tax Calculator — Database Schema

-- ─── Extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Jurisdictions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jurisdictions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('state', 'county', 'city', 'special')),
    geom        GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jurisdictions_geom
    ON jurisdictions USING GiST (geom);

CREATE INDEX IF NOT EXISTS idx_jurisdictions_type
    ON jurisdictions (type);

-- ─── Tax Rates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id) ON DELETE CASCADE,
    rate            DECIMAL(10,6) NOT NULL,
    valid_from      DATE NOT NULL,
    valid_to        DATE,
    UNIQUE (jurisdiction_id, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_jurisdiction
    ON tax_rates (jurisdiction_id);

CREATE INDEX IF NOT EXISTS idx_tax_rates_validity
    ON tax_rates (valid_from, valid_to);

-- ─── Orders ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lat                 DECIMAL(9,6) NOT NULL,
    lon                 DECIMAL(10,6) NOT NULL,
    subtotal            DECIMAL(12,2) NOT NULL,
    composite_tax_rate  DECIMAL(10,6) NOT NULL,
    tax_amount          DECIMAL(12,2) NOT NULL,
    total_amount        DECIMAL(12,2) NOT NULL,
    breakdown           JSONB NOT NULL DEFAULT '{}',
    jurisdictions_applied JSONB NOT NULL DEFAULT '[]',
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_timestamp
    ON orders (timestamp);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders (created_at);

CREATE INDEX IF NOT EXISTS idx_orders_composite_tax_rate
    ON orders (composite_tax_rate);
