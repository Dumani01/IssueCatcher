import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import pg from "pg";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { createMailbox } from "../../scripts/mailbox.mjs";
import { digest } from "../src/crypto.js";
if (
  process.env.NODE_ENV !== "test" ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith("/issuecatcher_test")
)
  throw Error("Tests require the isolated issuecatcher_test database");
const { app } = await import("../src/app.js");
const { db } = await import("../src/db.js");
const origin = process.env.APP_ORIGIN;
const password = "Integration123!Secure";
const agents = [request.agent(app), request.agent(app)];
let ids = [],
  note,
  sessionCookie,
  messages = [];
const mailbox = createMailbox((m) => messages.push(m));
const send = (a, path, data, method = "post") =>
  a[method](path).set("Origin", origin).send(data);
before(async () => {
  await new Promise((resolve) => mailbox.listen(0, "127.0.0.1", resolve));
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(mailbox.address().port);
  process.env.SMTP_FROM = "security@example.test";
  await db.query(
    "TRUNCATE users,notes,sessions,password_reset_tokens,audit_logs,security_alerts,auth_attempts RESTART IDENTITY CASCADE",
  );
});
after(async () => {
  await db.end();
  await new Promise((resolve) => mailbox.close(resolve));
});
test("RF01 register validates and stores Argon2id; no role assignment", async () => {
  assert.equal(
    (
      await send(agents[0], "/api/auth/register", {
        name: "x",
        email: "bad",
        password: "short",
      })
    ).status,
    400,
  );
  for (let i = 0; i < 2; i++) {
    assert.equal(
      (
        await send(agents[i], "/api/auth/register", {
          name: "Example " + i,
          email: `user${i}@example.test`,
          password,
          role: "admin",
        })
      ).status,
      202,
    );
  }
  const users = (await db.query("SELECT * FROM users ORDER BY email")).rows;
  ids = users.map((u) => u.id);
  for (const u of users) {
    assert.match(u.password_hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1/);
    assert.equal(u.role, "user");
    assert.ok(await argon2.verify(u.password_hash, password));
  }
});
test("RF02 login generic failures, signed HttpOnly cookie and authentication", async () => {
  await db.query("TRUNCATE auth_attempts");
  for (const email of ["missing@example.test", "user0@example.test"]) {
    const r = await send(agents[0], "/api/auth/login", {
      email,
      password: "wrong",
    });
    assert.equal(r.status, 401);
    assert.deepEqual(r.body, { error: "Credenciales inválidas" });
  }
  for (let i = 0; i < 2; i++) {
    const r = await send(agents[i], "/api/auth/login", {
      email: `user${i}@example.test`,
      password,
    });
    assert.equal(r.status, 200);
    assert.match(r.headers["set-cookie"][0], /HttpOnly/);
    assert.match(r.headers["set-cookie"][0], /SameSite=Strict/);
    if (i === 0) sessionCookie = r.headers["set-cookie"][0].split(";")[0];
  }
  assert.equal((await agents[0].get("/api/auth/me")).status, 200);
});
test("A01/RF03 rejects non-admin, CSRF missing/wrong origin; no permissive CORS", async () => {
  assert.equal((await agents[0].get("/api/admin/users")).status, 403);
  assert.equal(
    (await agents[0].post("/api/notes").send({ title: "No", content: "No" }))
      .status,
    403,
  );
  assert.equal(
    (
      await agents[0]
        .post("/api/notes")
        .set("Origin", "https://evil.invalid")
        .send({})
    ).status,
    403,
  );
  assert.equal(
    (await agents[0].get("/api/notes").set("Origin", "https://evil.invalid"))
      .headers["access-control-allow-origin"],
    undefined,
  );
});
test("RF04 CRUD encrypted; A01 IDOR read/update/delete; A05 SQL and XSS inert", async () => {
  const payload = "<script>alert(1)</script>' OR 1=1 --";
  const r = await send(agents[0], "/api/notes", {
    title: payload,
    content: payload,
  });
  assert.equal(r.status, 201);
  note = r.body.id;
  const stored = (
    await db.query("SELECT content_encrypted FROM notes WHERE id=$1", [note])
  ).rows[0];
  assert.ok(!stored.content_encrypted.includes(payload));
  assert.equal(stored.content_encrypted.split(".").length, 3);
  assert.equal(
    (await agents[0].get("/api/notes/" + note)).body.content,
    payload,
  );
  assert.equal((await agents[1].get("/api/notes/" + note)).status, 404);
  assert.equal(
    (
      await send(
        agents[1],
        "/api/notes/" + note,
        { title: "steal", content: "steal" },
        "patch",
      )
    ).status,
    404,
  );
  assert.equal(
    (await send(agents[1], "/api/notes/" + note, {}, "delete")).status,
    404,
  );
  assert.equal((await agents[0].get("/api/notes/' OR 1=1 --")).status, 400);
  assert.equal(
    (
      await send(
        agents[0],
        "/api/notes/" + note,
        { title: "edited", content: "updated" },
        "patch",
      )
    ).status,
    200,
  );
  assert.equal(
    (await send(agents[0], "/api/notes/" + note, {}, "delete")).status,
    204,
  );
});
test("RF05 phone encrypted and masked", async () => {
  assert.equal(
    (await send(agents[0], "/api/profile", { phone: "+50688881234" }, "patch"))
      .status,
    200,
  );
  const r = await agents[0].get("/api/profile");
  assert.equal(r.body.phone, "***-***-1234");
  assert.ok(
    !(
      await db.query("SELECT phone_encrypted FROM users WHERE id=$1", [ids[0]])
    ).rows[0].phone_encrypted.includes("88881234"),
  );
});
test("A06 note cap serialized under concurrency and input/body limits", async () => {
  await db.query(
    "INSERT INTO notes(owner_id,title,content_encrypted) SELECT $1,'test','fixture' FROM generate_series(1,99)",
    [ids[0]],
  );
  const out = await Promise.all(
    [1, 2].map(() =>
      send(agents[0], "/api/notes", { title: "last", content: "last" }),
    ),
  );
  assert.deepEqual(out.map((x) => x.status).sort(), [201, 409]);
  assert.equal(
    Number(
      (await db.query("SELECT count(*) FROM notes WHERE owner_id=$1", [ids[0]]))
        .rows[0].count,
    ),
    100,
  );
  assert.equal(
    (
      await send(agents[0], "/api/notes", {
        title: "x",
        content: "x".repeat(5001),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await send(agents[0], "/api/notes", {
        title: "x",
        content: "x".repeat(20000),
      })
    ).status,
    413,
  );
  await db.query("DELETE FROM notes WHERE owner_id=$1", [ids[0]]);
});
test("A02/RF08 security headers, sanitized health and errors", async () => {
  const r = await request(app).get("/health");
  assert.deepEqual(r.body, { status: "ok" });
  assert.equal(r.headers["x-powered-by"], undefined);
  assert.ok(r.headers["content-security-policy"]);
  assert.equal(r.headers["x-content-type-options"], "nosniff");
  const bad = await agents[0]
    .post("/api/notes")
    .set("Origin", origin)
    .set("Content-Type", "application/json")
    .send("{");
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.body, { error: "Datos inválidos" });
});
test("A08 rejects unsigned, altered and expired JWT; expired and revoked database sessions", async () => {
  assert.equal(
    (await request(app).get("/api/auth/me").set("Cookie", "session=invalid"))
      .status,
    401,
  );
  const claims = jwt.decode(sessionCookie.slice(8));
  const expired = jwt.sign({ sid: claims.sid }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    subject: ids[0],
    issuer: "issuecatcher",
    audience: "issuecatcher-web",
    expiresIn: -1,
  });
  assert.equal(
    (
      await request(app)
        .get("/api/auth/me")
        .set("Cookie", "session=" + expired)
    ).status,
    401,
  );
  const unsigned = jwt.sign({ sid: claims.sid, sub: ids[0] }, "", {
    algorithm: "none",
  });
  assert.equal(
    (
      await request(app)
        .get("/api/auth/me")
        .set("Cookie", "session=" + unsigned)
    ).status,
    401,
  );
  await db.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [claims.sid],
  );
  assert.equal((await agents[0].get("/api/auth/me")).status, 401);
  await db.query(
    "UPDATE sessions SET expires_at=now()+interval '15 minutes' WHERE id=$1",
    [claims.sid],
  );
  assert.equal((await send(agents[0], "/api/auth/logout", {})).status, 204);
  assert.equal(
    (await request(app).get("/api/auth/me").set("Cookie", sessionCookie))
      .status,
    401,
  );
});
test("RF06 reset tokens hashed, one use, expiration, sibling revocation and sessions revoked", async () => {
  await db.query("TRUNCATE auth_attempts");
  assert.equal(
    (
      await send(agents[0], "/api/auth/forgot-password", {
        email: "user1@example.test",
      })
    ).status,
    202,
  );
  assert.equal(messages.length, 1);
  const token = messages[0]
      .replace(/=\n/g, "")
      .replace(/=([0-9A-F]{2})/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16)),
      )
      .match(/reset=([a-f0-9]{64})/)[1],
    sibling = randomBytes(32).toString("hex"),
    expired = randomBytes(32).toString("hex");
  for (const t of [sibling, expired])
    await db.query(
      "INSERT INTO password_reset_tokens VALUES($1,$2,now()+interval '15 minutes',NULL)",
      [digest(t), ids[1]],
    );
  await db.query(
    "UPDATE password_reset_tokens SET expires_at=now()-interval '1 minute' WHERE token_hash=$1",
    [digest(expired)],
  );
  assert.equal(
    (
      await send(agents[0], "/api/auth/reset-password", {
        token: expired,
        password,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await send(agents[0], "/api/auth/reset-password", {
        token,
        password: "Changed123!Secure",
      })
    ).status,
    204,
  );
  assert.equal((await agents[1].get("/api/auth/me")).status, 401);
  for (const t of [token, sibling])
    assert.equal(
      (
        await send(agents[0], "/api/auth/reset-password", {
          token: t,
          password,
        })
      ).status,
      400,
    );
  await db.query("TRUNCATE auth_attempts");
  assert.equal(
    (
      await send(agents[0], "/api/auth/forgot-password", {
        email: "missing@example.test",
      })
    ).status,
    202,
  );
});
test("A07/A09 persistent rate limiting returns 429 and writes alerts/audits", async () => {
  await db.query("TRUNCATE auth_attempts");
  let r;
  for (let i = 0; i < 6; i++)
    r = await send(agents[0], "/api/auth/login", {
      email: "user0@example.test",
      password: "wrong",
    });
  assert.equal(r.status, 429);
  assert.ok((await db.query("SELECT 1 FROM security_alerts")).rowCount);
  assert.ok(
    (await db.query("SELECT 1 FROM audit_logs WHERE event='login_failed'"))
      .rowCount,
  );
});
test("RF07 admin lists, audited role changes and last-admin protection", async () => {
  await db.query("TRUNCATE auth_attempts");
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [ids[0]]);
  assert.equal(
    (
      await send(agents[0], "/api/auth/login", {
        email: "user0@example.test",
        password,
      })
    ).status,
    200,
  );
  for (const endpoint of ["users", "audit", "alerts", "sessions"])
    assert.equal((await agents[0].get("/api/admin/" + endpoint)).status, 200);
  assert.equal(
    (
      await send(
        agents[0],
        "/api/admin/users/" + ids[0] + "/role",
        { role: "user" },
        "patch",
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await send(
        agents[0],
        "/api/admin/users/" + ids[1] + "/role",
        { role: "admin" },
        "patch",
      )
    ).status,
    204,
  );
  assert.ok(
    (await db.query("SELECT 1 FROM audit_logs WHERE event='role_changed'"))
      .rowCount,
  );
});
test("A10 database errors fail closed without stack or SQL", async () => {
  await db.query("UPDATE users SET phone_encrypted='corrupt' WHERE id=$1", [
    ids[0],
  ]);
  const r = await agents[0].get("/api/profile");
  assert.equal(r.status, 500);
  assert.deepEqual(r.body, { error: "Error interno" });
});

test('RF06 concurrent sibling reset tokens: exactly one is consumed',async()=>{
 await db.query('TRUNCATE auth_attempts');const user=(await db.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id',['Race','race@example.test',await argon2.hash(password)])).rows[0].id;
 const tokens=[randomBytes(32).toString('hex'),randomBytes(32).toString('hex')];for(const t of tokens)await db.query("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')",[digest(t),user]);
 const r=await Promise.all(tokens.map(token=>send(agents[0],'/api/auth/reset-password',{token,password})));assert.deepEqual(r.map(x=>x.status).sort(),[204,400]);
 await db.query('DELETE FROM users WHERE id=$1',[user]);
});
