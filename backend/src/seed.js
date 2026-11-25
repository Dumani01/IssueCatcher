import { db } from "./db.js";
import pg from "pg";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { encrypt } from "./crypto.js";
if (process.env.NODE_ENV === "production")
  throw Error("Demo seed is local only");
const c = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
await c.connect();
mkdirSync(".local", { recursive: true });
const f = ".local/demo-accounts.json";
const accounts = existsSync(f)
  ? JSON.parse(readFileSync(f))
  : ["admin", "user", "user2"].map((role) => ({
      email: role + "@issuecatcher.test",
      role: role === "admin" ? "admin" : "user",
      password: randomBytes(20).toString("base64url") + "9a",
    }));
try {
  for (const a of accounts) {
    const r = await c.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id",
      [
        a.email.split("@")[0],
        a.email,
        await argon2.hash(a.password, {
          type: argon2.argon2id,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        }),
        a.role,
      ],
    );
    if (r.rowCount)
      await c.query(
        "INSERT INTO notes(owner_id,title,content_encrypted) VALUES($1,$2,$3)",
        [
          r.rows[0].id,
          "Bienvenido a IssueCatcher",
          encrypt(
            "Nota ficticia cifrada. Puedes editarla o eliminarla.",
            Buffer.from(process.env.DATA_ENCRYPTION_KEY, "base64"),
          ),
        ],
      );
  }
  writeFileSync(f, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  console.log(
    "Demo accounts stored privately in backend/.local/demo-accounts.json",
  );
} finally {
  await c.end();
  await db.end();
}
