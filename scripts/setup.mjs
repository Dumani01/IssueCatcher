import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync("backend/.env")) {
  let s = readFileSync("backend/.env.example", "utf8")
    .replace(
      "JWT_SECRET=REPLACE",
      "JWT_SECRET=" + randomBytes(48).toString("base64url"),
    )
    .replace(
      "DATA_ENCRYPTION_KEY=REPLACE",
      "DATA_ENCRYPTION_KEY=" + randomBytes(32).toString("base64"),
    );
  writeFileSync("backend/.env", s, { mode: 0o600 });
}
console.log(
  "Configure DATABASE_URL before migrations. Existing secrets preserved.",
);
