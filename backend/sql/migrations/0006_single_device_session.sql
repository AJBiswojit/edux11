-- 0006_single_device_session.sql
-- Adds the active_session_id marker used to limit each student to a single
-- signed-in device at a time. Idempotent and additive.
--
-- Replace {schema} with your configured DB schema (e.g. edux) before running,
-- or rely on app start-up (ensure_schema) which applies this automatically.

ALTER TABLE "{schema}"."users"
    ADD COLUMN IF NOT EXISTS "active_session_id" VARCHAR(36);
