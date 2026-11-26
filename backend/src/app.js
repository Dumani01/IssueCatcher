import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import pino from "pino";
import { db } from "./db.js";
import { encrypt, decrypt, digest } from "./crypto.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const app = express(),
  log = pino({ level: process.env.NODE_ENV === "test" ? "silent" : "info" }),
  prod = process.env.NODE_ENV === "production",
  origin = process.env.APP_ORIGIN,
  secret = process.env.JWT_SECRET,
  key = Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "base64");
const configErrors = [];
if (!origin) configErrors.push("APP_ORIGIN missing");
else if (prod && (!origin.startsWith("https://") || origin.includes("CONFIGURE_")))
  configErrors.push("APP_ORIGIN must be the deployed HTTPS origin");
if (!secret || secret.length < 43) configErrors.push("JWT_SECRET missing or too short");
if (key.length !== 32) configErrors.push("DATA_ENCRYPTION_KEY must decode to 32 bytes");
if (!process.env.DATABASE_URL) configErrors.push("DATABASE_URL missing");
if (prod) {
  if (process.env.DB_TLS !== "true") configErrors.push("DB_TLS must be true");
  if (!process.env.DB_CA?.includes("BEGIN CERTIFICATE")) configErrors.push("DB_CA missing or invalid PEM");
  for (const name of ["SMTP_HOST", "SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD"])
    if (!process.env[name]) configErrors.push(`${name} missing`);
}
if (configErrors.length) throw Error(`Configuration: ${configErrors.join("; ")}`);
if (prod && process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    strictTransportSecurity: prod ? undefined : false,
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: prod ? [] : null },
    },
  }),
);
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas solicitudes" },
  }),
);
app.use(express.json({ limit: "16kb" }), cookieParser());
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("origin") !== origin
  )
    return res.status(403).json({ error: "Acceso denegado" });
  next();
});
const audit = async (event, id = null) => {
  await db.query("INSERT INTO audit_logs(event,user_id) VALUES($1,$2)", [
    event,
    id,
  ]);
  log.info({ event, userId: id });
};
const password = z
  .string()
  .min(12)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/);
const email = z.string().trim().toLowerCase().email().max(254);
const hash = (p) =>
  argon2.hash(p, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
const cookie = {
  httpOnly: true,
  secure: prod,
  sameSite: "strict",
  path: "/api",
  maxAge: 900000,
};
const dummyHash = await hash(randomBytes(32).toString("hex"));
const limiter = async (req, res, next) => {
  const account =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const keys = [
    digest("ip:" + req.ip),
    ...(account ? [digest("account:" + account)] : []),
  ];
  for (const k of keys) {
    const r = await db.query(
      `INSERT INTO auth_attempts(key,count,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires_at<now() THEN 1 ELSE auth_attempts.count+1 END, expires_at=CASE WHEN auth_attempts.expires_at<now() THEN now()+interval '15 minutes' ELSE auth_attempts.expires_at END RETURNING count,expires_at`,
      [k],
    );
    const n = r.rows[0].count;
    if (n === 5) {
      await db.query(
        "INSERT INTO security_alerts(event) VALUES('authentication_threshold')",
      );
      await audit("authentication_threshold");
    }
    if (n > 5) {
      await db.query(
        "UPDATE auth_attempts SET expires_at=GREATEST(expires_at,now()+interval '15 minutes'+make_interval(secs=>LEAST(60*power(2,LEAST(count-6,6)),3600)::integer)) WHERE key=$1",
        [k],
      );
      res.set("Retry-After", "4500");
      return res.status(429).json({ error: "Demasiados intentos" });
    }
  }
  next();
};
async function auth(req, res, next) {
  let claims;
  try {
    claims = jwt.verify(req.cookies.session, secret, {
      algorithms: ["HS256"],
      issuer: "issuecatcher",
      audience: "issuecatcher-web",
    });
  } catch {
    return res.status(401).json({ error: "Sesión inválida" });
  }
  const r = await db.query(
    "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND u.id=$2 AND s.revoked_at IS NULL AND s.expires_at>now()",
    [claims.sid, claims.sub],
  );
  if (!r.rowCount) return res.status(401).json({ error: "Sesión inválida" });
  req.user = r.rows[0];
  req.sid = claims.sid;
  next();
}
async function admin(req, res, next) {
  if (req.user.role !== "admin") {
    await audit("access_denied", req.user.id);
    return res.status(403).json({ error: "Acceso denegado" });
  }
  next();
}
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    log.warn({ event: "database_health_failed", code: typeof error?.code === "string" ? error.code : "unknown" });
    res.status(503).json({ status: "unavailable" });
  }
});
app.post("/api/auth/register", limiter, async (req, res) => {
  const d = z
    .object({ name: z.string().trim().min(2).max(80), email, password })
    .parse(req.body);
  await db.query(
    "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING",
    [d.name, d.email, await hash(d.password)],
  );
  res.status(202).json({ message: "Solicitud procesada" });
});
app.post("/api/auth/login", limiter, async (req, res) => {
  const d = z.object({ email, password: z.string().max(128) }).parse(req.body);
  const u = (await db.query("SELECT * FROM users WHERE email=$1", [d.email]))
    .rows[0];
  const valid = await argon2.verify(u?.password_hash || dummyHash, d.password);
  if (!u || !valid) {
    await audit("login_failed", u?.id);
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  await db.query("DELETE FROM auth_attempts WHERE key=$1", [
    digest("account:" + d.email),
  ]);
  const s = (
    await db.query(
      "INSERT INTO sessions(user_id,expires_at) VALUES($1,now()+interval '15 minutes') RETURNING id",
      [u.id],
    )
  ).rows[0];
  const token = jwt.sign({ sid: s.id }, secret, {
    algorithm: "HS256",
    subject: u.id,
    issuer: "issuecatcher",
    audience: "issuecatcher-web",
    expiresIn: "15m",
  });
  await audit("login_success", u.id);
  res
    .cookie("session", token, cookie)
    .json({ id: u.id, name: u.name, role: u.role, email: u.email });
});
app.post("/api/auth/logout", auth, async (req, res) => {
  await db.query("UPDATE sessions SET revoked_at=now() WHERE id=$1", [req.sid]);
  await audit("logout", req.user.id);
  res.clearCookie("session", { ...cookie, maxAge: undefined }).sendStatus(204);
});
app.get("/api/auth/me", auth, (req, res) => res.json(req.user));
app.get("/api/profile", auth, async (req, res) => {
  const r = (
    await db.query("SELECT phone_encrypted FROM users WHERE id=$1", [
      req.user.id,
    ])
  ).rows[0];
  res.json({
    ...req.user,
    phone: r.phone_encrypted
      ? "***-***-" + decrypt(r.phone_encrypted, key).slice(-4)
      : null,
  });
});
app.patch("/api/profile", auth, async (req, res) => {
  const { phone } = z
    .object({ phone: z.string().regex(/^\+?[0-9]{8,15}$/) })
    .parse(req.body);
  await db.query("UPDATE users SET phone_encrypted=$1 WHERE id=$2", [
    encrypt(phone, key),
    req.user.id,
  ]);
  res.json({ phone: "***-***-" + phone.slice(-4) });
});
const note = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().min(1).max(5000),
});
const uuid = z.string().uuid();
const view = (r) => ({
  id: r.id,
  title: r.title,
  content: decrypt(r.content_encrypted, key),
});
app.get("/api/notes", auth, async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT * FROM notes WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100",
        [req.user.id],
      )
    ).rows.map(view),
  ),
);
app.get("/api/notes/:id", auth, async (req, res) => {
  const r = (
    await db.query("SELECT * FROM notes WHERE id=$1 AND owner_id=$2", [
      uuid.parse(req.params.id),
      req.user.id,
    ])
  ).rows[0];
  if (!r) {
    await audit("note_access_denied", req.user.id);
    return res.status(404).json({ error: "No encontrado" });
  }
  res.json(view(r));
});
app.post("/api/notes", auth, async (req, res) => {
  const d = note.parse(req.body),
    c = await db.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [req.user.id]);
    const n = (
      await c.query("SELECT count(*) FROM notes WHERE owner_id=$1", [
        req.user.id,
      ])
    ).rows[0];
    if (Number(n.count) >= 100) {
      await c.query("ROLLBACK");
      return res.status(409).json({ error: "Límite de notas" });
    }
    const r = await c.query(
      "INSERT INTO notes(owner_id,title,content_encrypted) VALUES($1,$2,$3) RETURNING *",
      [req.user.id, d.title, encrypt(d.content, key)],
    );
    await c.query("COMMIT");
    res.status(201).json(view(r.rows[0]));
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
});
app.patch("/api/notes/:id", auth, async (req, res) => {
  const d = note.parse(req.body),
    r = await db.query(
      "UPDATE notes SET title=$1,content_encrypted=$2,updated_at=now() WHERE id=$3 AND owner_id=$4 RETURNING *",
      [
        d.title,
        encrypt(d.content, key),
        uuid.parse(req.params.id),
        req.user.id,
      ],
    );
  if (!r.rowCount) {
    await audit("note_access_denied", req.user.id);
    return res.status(404).json({ error: "No encontrado" });
  }
  res.json(view(r.rows[0]));
});
app.delete("/api/notes/:id", auth, async (req, res) => {
  const r = await db.query("DELETE FROM notes WHERE id=$1 AND owner_id=$2", [
    uuid.parse(req.params.id),
    req.user.id,
  ]);
  if (!r.rowCount) {
    await audit("note_access_denied", req.user.id);
    return res.status(404).json({ error: "No encontrado" });
  }
  res.sendStatus(204);
});
app.post("/api/auth/forgot-password", limiter, async (req, res) => {
  const d = z.object({ email }).parse(req.body),
    u = (await db.query("SELECT id FROM users WHERE email=$1", [d.email]))
      .rows[0];
  if (u) {
    const t = randomBytes(32).toString("hex");
    await db.query(
      "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')",
      [digest(t), u.id],
    );
    try {
      const mail = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        requireTLS: prod,
        tls: {minVersion: 'TLSv1.2', rejectUnauthorized: true},
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        disableFileAccess: true,
        disableUrlAccess: true,
        ...(process.env.SMTP_USER
          ? {
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
              },
            }
          : {}),
      });
      await mail.sendMail({
        from: process.env.SMTP_FROM,
        to: d.email,
        subject: "Recuperar contraseña",
        text: `${origin}/?reset=${t}`,
      });
    } catch {
      log.warn({ event: "mail_failed" });
    }
  }
  res
    .status(202)
    .json({ message: "Si existe una cuenta, se enviará un correo" });
});
app.post("/api/auth/reset-password", limiter, async (req, res) => {
  const d = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })
      .parse(req.body),
    c = await db.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      "SELECT id FROM users WHERE id=(SELECT user_id FROM password_reset_tokens WHERE token_hash=$1) FOR UPDATE",
      [digest(d.token)],
    );
    const r = await c.query(
      "UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING user_id",
      [digest(d.token)],
    );
    if (!r.rowCount) {
      await c.query("ROLLBACK");
      return res.status(400).json({ error: "Token inválido" });
    }
    await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      await hash(d.password),
      r.rows[0].user_id,
    ]);
    await c.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
      r.rows[0].user_id,
    ]);
    await c.query(
      "UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL",
      [r.rows[0].user_id],
    );
    await c.query("INSERT INTO audit_logs(event,user_id) VALUES($1,$2)", [
      "password_reset",
      r.rows[0].user_id,
    ]);
    await c.query("COMMIT");
    res.sendStatus(204);
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
});
app.get("/api/admin/users", auth, admin, async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id,email,name,role FROM users ORDER BY created_at DESC LIMIT 100",
      )
    ).rows,
  ),
);
app.get("/api/admin/audit", auth, admin, async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id,user_id,event,created_at FROM audit_logs ORDER BY id DESC LIMIT 100",
      )
    ).rows,
  ),
);
app.get("/api/admin/alerts", auth, admin, async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id,event,created_at FROM security_alerts ORDER BY id DESC LIMIT 100",
      )
    ).rows,
  ),
);
app.get("/api/admin/sessions", auth, admin, async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id,user_id,expires_at,revoked_at FROM sessions ORDER BY expires_at DESC LIMIT 100",
      )
    ).rows,
  ),
);
app.delete("/api/admin/sessions/:id", auth, admin, async (req, res) => {
  await db.query("UPDATE sessions SET revoked_at=now() WHERE id=$1", [
    uuid.parse(req.params.id),
  ]);
  await audit("session_revoked", req.user.id);
  res.sendStatus(204);
});
app.patch("/api/admin/users/:id/role", auth, admin, async (req, res) => {
  const id = uuid.parse(req.params.id),
    { role } = z.object({ role: z.enum(["user", "admin"]) }).parse(req.body),
    c = await db.connect();
  try {
    await c.query("BEGIN");
    await c.query("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE");
    const active = (
      await c.query(
        "SELECT u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND s.revoked_at IS NULL AND s.expires_at>now()",
        [req.user.id, req.sid],
      )
    ).rows[0];
    if (active?.role !== "admin") {
      await c.query("ROLLBACK");
      return res.status(403).json({ error: "Acceso denegado" });
    }
    const target = (await c.query("SELECT role FROM users WHERE id=$1", [id]))
      .rows[0];
    if (!target) {
      await c.query("ROLLBACK");
      return res.status(404).json({ error: "No encontrado" });
    }
    if (
      target.role === "admin" &&
      role === "user" &&
      Number(
        (await c.query("SELECT count(*) FROM users WHERE role='admin'")).rows[0]
          .count,
      ) <= 1
    ) {
      await c.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "Debe permanecer un administrador" });
    }
    await c.query("UPDATE users SET role=$1 WHERE id=$2", [role, id]);
    await c.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
      id,
    ]);
    await c.query("INSERT INTO audit_logs(event,user_id) VALUES($1,$2)", [
      "role_changed",
      req.user.id,
    ]);
    await c.query("COMMIT");
    res.sendStatus(204);
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
});
app.use("/api", (req, res) => res.status(404).json({ error: "No encontrado" }));
if (prod || process.env.SERVE_FRONTEND === "true") {
  const dist = fileURLToPath(new URL("../../frontend/dist/", import.meta.url));
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) => res.sendFile(resolve(dist, "index.html")));
}
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof z.ZodError || err.status === 400)
    return res.status(400).json({ error: "Datos inválidos" });
  if (err.status === 413)
    return res.status(413).json({ error: "Solicitud demasiado grande" });
  log.error({ event: "internal_error", code: err.code || "UNKNOWN" });
  res.status(500).json({ error: "Error interno" });
});
process.on("unhandledRejection", () => {
  log.fatal({ event: "unhandled_rejection" });
  process.exit(1);
});
