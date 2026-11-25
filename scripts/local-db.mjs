import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import pg from "pg";
import { resolve } from "node:path";
if(process.env.NODE_ENV==='production'||existsSync('backend/.env')&&/^NODE_ENV=production\s*$/m.test(readFileSync('backend/.env','utf8')))throw Error('Local provisioning is forbidden in production');
const local = resolve(".local");
mkdirSync(local, { recursive: true });
const cfg = local + "/bootstrap.json";
const state = existsSync(cfg)
  ? JSON.parse(readFileSync(cfg))
  : Object.fromEntries(
      ["postgres", "runtime", "migrator", "test"].map((x) => [
        x,
        randomBytes(32).toString("hex"),
      ]),
    );
writeFileSync(cfg, JSON.stringify(state), { mode: 0o600 });
if(!Object.values(state).every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)))throw Error('Invalid local bootstrap configuration');
writeFileSync(local + "/pg-password", state.postgres, { mode: 0o600 });
if (process.argv.includes("--password-only")) process.exit(0);
const admin = new pg.Client({
  connectionString: `postgresql://postgres:${state.postgres}@127.0.0.1:55432/postgres`,
});
await admin.connect();
for (const [role, pass] of [
  ["issuecatcher_runtime", state.runtime],
  ["issuecatcher_migrator", state.migrator],
  ["issuecatcher_test_owner", state.test],
]) {
  if (
    !(await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [role]))
      .rowCount
  )
    await admin.query(
      `CREATE ROLE ${role} LOGIN PASSWORD '${pass}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`,
    );
}
for (const [name, owner] of [
  ["issuecatcher", "issuecatcher_migrator"],
  ["issuecatcher_test", "issuecatcher_test_owner"],
]) {
  if (
    !(await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
      .rowCount
  )
    await admin.query(`CREATE DATABASE ${name} OWNER ${owner}`);
  await admin.query(`REVOKE ALL ON DATABASE ${name} FROM PUBLIC`);
  await admin.query(
    `GRANT CONNECT ON DATABASE ${name} TO ${owner}${name === "issuecatcher" ? ",issuecatcher_runtime" : ""}`,
  );
}
await admin.end();
for (const [name, owner, pass] of [
  ["issuecatcher", "issuecatcher_migrator", state.migrator],
  ["issuecatcher_test", "issuecatcher_test_owner", state.test],
]) {
  const c = new pg.Client({
    connectionString: `postgresql://${owner}:${pass}@127.0.0.1:55432/${name}`,
  });
  await c.connect();
  await c.query(readFileSync("database/schema.sql", "utf8"));
  await c.end();
}
const prod = new pg.Client({
  connectionString: `postgresql://postgres:${state.postgres}@127.0.0.1:55432/issuecatcher`,
});
await prod.connect();
await prod.query(readFileSync("database/runtime.sql", "utf8"));
await prod.end();
const envPath = "backend/.env";
let env = readFileSync(envPath, "utf8").replace(/^MIGRATION_DATABASE_URL=.*$/gm,'').replace(
  /^DATABASE_URL=.*$/m,
  `DATABASE_URL=postgresql://issuecatcher_runtime:${state.runtime}@127.0.0.1:55432/issuecatcher`,
);
for (const [k, v] of Object.entries({
  APP_ORIGIN: "http://localhost:3001",
  SERVE_FRONTEND: "true",
  HOST: "127.0.0.1",
}))
  env = env.replace(new RegExp("^" + k + "=.*$", "m"), "") + `\n${k}=${v}`;
writeFileSync(envPath, env, { mode: 0o600 });
writeFileSync('backend/.env.migrate',`MIGRATION_DATABASE_URL=postgresql://issuecatcher_migrator:${state.migrator}@127.0.0.1:55432/issuecatcher\n`,{mode:0o600});
writeFileSync(
  "backend/.env.test",
  `NODE_ENV=test\nAPP_ORIGIN=http://localhost:5173\nDATABASE_URL=postgresql://issuecatcher_test_owner:${state.test}@127.0.0.1:55432/issuecatcher_test\nJWT_SECRET=${randomBytes(48).toString("base64url")}\nDATA_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\n`,
  { mode: 0o600 },
);
console.log(
  "Local databases migrated; runtime role separated; secrets saved privately.",
);
