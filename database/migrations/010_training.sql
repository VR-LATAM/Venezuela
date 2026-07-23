-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 010: Sistema de entrenamiento de conductores
-- Módulos de lectura + tests con preguntas de opción múltiple
-- ═══════════════════════════════════════════════════════════════

-- Módulos de entrenamiento (contenido + metadatos)
CREATE TABLE training_modules (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(20)   UNIQUE NOT NULL,
  title           VARCHAR(200)  NOT NULL,
  content         JSONB         NOT NULL DEFAULT '[]',  -- [{title, body}]
  version         VARCHAR(10)   NOT NULL DEFAULT '1.0',
  passing_score   INTEGER       NOT NULL,               -- e.g. 8 o 9 de 10
  total_questions INTEGER       NOT NULL DEFAULT 10,
  order_index     INTEGER       NOT NULL,
  is_required     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Preguntas de opción múltiple por módulo
CREATE TABLE training_questions (
  id              SERIAL PRIMARY KEY,
  module_id       INTEGER       NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question_text   TEXT          NOT NULL,
  option_a        TEXT          NOT NULL,
  option_b        TEXT          NOT NULL,
  option_c        TEXT          NOT NULL,
  option_d        TEXT          NOT NULL,
  correct_option  CHAR(1)       NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  order_index     INTEGER       NOT NULL
);

-- Progreso del conductor por módulo
CREATE TABLE driver_training_progress (
  id          SERIAL PRIMARY KEY,
  driver_id   VARCHAR(128)  NOT NULL,   -- Firebase UID
  module_id   INTEGER       NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status      VARCHAR(20)   NOT NULL DEFAULT 'not_started'
                CHECK (status IN ('not_started','reading','passed','failed')),
  attempts    INTEGER       NOT NULL DEFAULT 0,
  last_score  INTEGER,
  passed_at   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,              -- renovación anual
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, module_id)
);

-- Historial de intentos del quiz
CREATE TABLE driver_quiz_attempts (
  id           SERIAL PRIMARY KEY,
  driver_id    VARCHAR(128)  NOT NULL,
  module_id    INTEGER       NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  answers      JSONB         NOT NULL,  -- {question_id: selected_option 'A'|'B'|'C'|'D'}
  score        INTEGER       NOT NULL,
  passed       BOOLEAN       NOT NULL,
  attempted_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_training_questions_module  ON training_questions(module_id);
CREATE INDEX idx_training_progress_driver   ON driver_training_progress(driver_id);
CREATE INDEX idx_quiz_attempts_driver       ON driver_quiz_attempts(driver_id, module_id);

-- Triggers updated_at
CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_driver_training_progress_updated_at
  BEFORE UPDATE ON driver_training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
