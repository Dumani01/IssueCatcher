import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
appendFileSync(
  process.env.GITHUB_ENV,
  `JWT_SECRET=${randomBytes(48).toString("base64url")}\nDATA_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\n`,
);
