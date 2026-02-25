-- 004_simplify_geometries.sql
-- Simplify all jurisdiction geometries to reduce vertex count by ~90%,
-- which dramatically speeds up ST_Intersects queries.
-- 
-- 0.0005 degrees tolerance ≈ ~55 meters. This is highly accurate for tax boundaries
-- while eliminating unnecessarily dense vertex clusters from the raw GeoJSON.

UPDATE jurisdictions
SET geom = ST_Multi(ST_SimplifyPreserveTopology(geom, 0.0005))
WHERE type IN ('state', 'county', 'city', 'special');
