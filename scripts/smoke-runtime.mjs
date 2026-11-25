import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import pg from "pg";
process.loadEnvFile("backend/.env");
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  const role = (
    await c.query(
      "SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  assert.ok(Object.values(role).every((v) => v === false));
  await assert.rejects(
    c.query("CREATE TABLE forbidden_probe(id integer)"),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    c.query("DELETE FROM audit_logs WHERE false"),
    (e) => e.code === "42501",
  );
  const account = JSON.parse(
      readFileSync("backend/.local/demo-accounts.json"),
    )[0],
    origin = process.env.APP_ORIGIN;
  const login = await fetch(origin + "/api/auth/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const r = await fetch(origin + "/api/notes", { headers: { Cookie: cookie } });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(await r.json()));
  assert.equal(
    (await fetch(origin + "/api/admin/audit", { headers: { Cookie: cookie } }))
      .status,
    200,
  );
  assert.equal(
    (
      await fetch(origin + "/api/auth/logout", {
        method: "POST",
        headers: { Cookie: cookie, Origin: origin },
      })
    ).status,
    204,
  );
  console.log(
    "PASS runtime role: no superuser/bypass/DDL/audit delete; live admin login, encrypted notes, audit and logout.",
  );
} finally {
  await c.end();
}
