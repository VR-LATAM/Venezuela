-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 001: Extensiones PostgreSQL requeridas
-- Ejecutar PRIMERO en la base de datos Supabase/PostgreSQL
-- ═══════════════════════════════════════════════════════════════

-- PostGIS: soporte geoespacial para búsqueda de conductores
-- por coordenadas GPS en cualquier punto de EE.UU.
CREATE EXTENSION IF NOT EXISTS postgis;

-- uuid-ossp: generación de UUIDs v4 para primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: búsqueda de texto difuso (para buscar conductores por nombre)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
