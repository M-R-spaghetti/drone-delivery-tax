-- 003_temporal_constraints.sql
-- Prevent overlapping tax rate date ranges for the same jurisdiction.
--
-- Uses btree_gist extension + EXCLUDE constraint with daterange.
-- This makes it impossible to insert two tax rates for the same jurisdiction
-- whose [valid_from, valid_to) intervals overlap.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent temporal overlaps
-- The daterange uses [) (inclusive start, exclusive end) semantics,
-- matching the query logic: valid_from <= date AND (valid_to IS NULL OR valid_to > date)
ALTER TABLE tax_rates
    ADD CONSTRAINT no_overlapping_rates
    EXCLUDE USING gist (
        jurisdiction_id WITH =,
        daterange(valid_from, valid_to, '[)') WITH &&
    );
