import { readFileSync } from "node:fs";
import { db } from "./db.js";
const url = process.env.MIGRATION_DATABASE_URL;
if (!url)
  throw Error(
    "MIGRATION_DATABASE_URL required; runtime credentials cannot migrate",
  );
const { default: pg } = await import("pg");
const pool = new pg.Pool({
  connectionString: url,
  connectionTimeoutMillis: 5000,
  ...(process.env.DB_TLS === "true"
    ? {
        ssl: {
          rejectUnauthorized: true,
          ...(process.env.DB_CA
            ? { ca: process.env.DB_CA.replace(/\\n/g, "\n") }
            : {}),
        },
      }
    : {}),
});
try {
  await pool.query(
    readFileSync(new URL("../../database/schema.sql", import.meta.url), "utf8"),
  );
  console.log("Migration applied");
} finally {
  await pool.end();
  await db.end();
}
