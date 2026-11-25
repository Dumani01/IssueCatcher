-- API-only role. Ownership checks are in Express SQL; RLS isolates Data API roles, not tenants sharing the backend role.
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='issuecatcher_runtime') THEN CREATE ROLE issuecatcher_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$;
GRANT USAGE ON SCHEMA public TO issuecatcher_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON users,notes,sessions,password_reset_tokens,auth_attempts TO issuecatcher_runtime;
GRANT SELECT,INSERT ON audit_logs,security_alerts TO issuecatcher_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO issuecatcher_runtime;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['users','notes','sessions','password_reset_tokens','audit_logs','auth_attempts','security_alerts'] LOOP
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename=t AND policyname='backend_runtime') THEN EXECUTE format('CREATE POLICY backend_runtime ON %I TO issuecatcher_runtime USING(true) WITH CHECK(true)',t); END IF;
END LOOP; END $$;
