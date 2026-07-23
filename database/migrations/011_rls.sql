-- ============================================================
-- Migración 011 — Row Level Security en todas las tablas
-- El backend usa postgres (superusuario) y bypasea RLS.
-- Esto bloquea acceso directo via Supabase REST API / anon key.
-- ============================================================

ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_rides          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_withdrawals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_warnings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE passenger_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_campaigns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_states                ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_quiz_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_questions       ENABLE ROW LEVEL SECURITY;
