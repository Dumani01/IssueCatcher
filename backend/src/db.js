import pg from "pg";
export const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 5000,
  idle_in_transaction_session_timeout: 10000,
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
db.on("error", () => {
  console.error(JSON.stringify({ event: "database_pool_error" }));
});
