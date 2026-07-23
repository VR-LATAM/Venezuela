-- ============================================================
-- Migración 018 — Políticas RLS explícitas
-- El backend usa el superusuario postgres que bypasea RLS.
-- Estas políticas bloquean explícitamente el acceso directo
-- via Supabase REST API / anon key / authenticated role.
-- ============================================================

-- ── USUARIOS ──────────────────────────────────────────────
CREATE POLICY "deny_anon_users" ON users
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_users" ON users
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── PASAJEROS ─────────────────────────────────────────────
CREATE POLICY "deny_anon_passengers" ON passengers
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_passengers" ON passengers
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── CONDUCTORES ───────────────────────────────────────────
CREATE POLICY "deny_anon_drivers" ON drivers
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_drivers" ON drivers
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── VIAJES ────────────────────────────────────────────────
CREATE POLICY "deny_anon_rides" ON rides
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_rides" ON rides
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── CALIFICACIONES ────────────────────────────────────────
CREATE POLICY "deny_anon_ratings" ON ratings
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_ratings" ON ratings
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── GANANCIAS ─────────────────────────────────────────────
CREATE POLICY "deny_anon_earnings" ON driver_earnings
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_earnings" ON driver_earnings
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── TOKENS PUSH ───────────────────────────────────────────
CREATE POLICY "deny_anon_push_tokens" ON push_tokens
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_push_tokens" ON push_tokens
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── MÉTODOS DE PAGO ───────────────────────────────────────
CREATE POLICY "deny_anon_payment_methods" ON passenger_payment_methods
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_payment_methods" ON passenger_payment_methods
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── EVENTOS SOS ───────────────────────────────────────────
CREATE POLICY "deny_anon_sos" ON sos_events
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_sos" ON sos_events
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── AUDIT LOGS ────────────────────────────────────────────
CREATE POLICY "deny_anon_audit" ON audit_logs
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_authenticated_audit" ON audit_logs
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ── US_STATES (solo lectura pública permitida) ─────────────
CREATE POLICY "allow_read_states" ON us_states
  FOR SELECT TO anon, authenticated USING (true);
