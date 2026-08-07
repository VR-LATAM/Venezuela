-- V-RIDE VENEZUELA — Migración 001
-- Extensiones PostgreSQL necesarias
-- Ejecutar primero en Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUIDs automáticos
CREATE EXTENSION IF NOT EXISTS "postgis";         -- Coordenadas GPS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- Encriptación PII
