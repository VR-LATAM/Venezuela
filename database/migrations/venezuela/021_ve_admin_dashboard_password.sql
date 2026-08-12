-- Columna para contraseña del dashboard admin (hash bcrypt)
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_password_hash TEXT;

-- Setear contraseña inicial: VRideAdmin2024
UPDATE users
SET dashboard_password_hash = '$2a$10$2WgXrDDWU4QlDABGNjCuVOaGs0ZBwdbKTFoFmHYuUgN1lNKhhROlG'
WHERE role = 'admin';
