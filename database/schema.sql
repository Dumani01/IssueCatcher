BEGIN;
CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, name text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')), phone_encrypted text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, title text NOT NULL, content_encrypted text NOT NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS notes_owner ON notes(owner_id);
CREATE TABLE IF NOT EXISTS sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, revoked_at timestamptz);
CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, used_at timestamptz);
CREATE TABLE IF NOT EXISTS audit_logs (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE SET NULL, event text NOT NULL, created_at timestamptz DEFAULT now());
ALTER TABLE users ENABLE ROW LEVEL SECURITY; ALTER TABLE notes ENABLE ROW LEVEL SECURITY; ALTER TABLE sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY; ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS auth_attempts(key text PRIMARY KEY,count integer NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS security_alerts(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,event text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS reset_user ON password_reset_tokens(user_id);
REVOKE ALL ON users,notes,sessions,password_reset_tokens,audit_logs,auth_attempts,security_alerts FROM PUBLIC;
DO $$ DECLARE t text; r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON users,notes,sessions,password_reset_tokens,audit_logs,auth_attempts,security_alerts FROM %I',r);
  END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['users','notes','sessions','password_reset_tokens','audit_logs','auth_attempts','security_alerts'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 END LOOP;
END $$;
COMMIT;
