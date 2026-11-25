import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
export const digest = (s) => createHash("sha256").update(s).digest("hex");
export function encrypt(s, key) {
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(s, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((x) => x.toString("base64")).join(".");
}
export function decrypt(s, key) {
  if (typeof s !== "string" || s.split(".").length !== 3)
    throw Error("Invalid ciphertext");
  const [iv, tag, data] = s.split(".").map((x) => Buffer.from(x, "base64"));
  if (iv.length !== 12 || tag.length !== 16) throw Error("Invalid ciphertext");
  const c = createDecipheriv("aes-256-gcm", key, iv);
  c.setAuthTag(tag);
  return Buffer.concat([c.update(data), c.final()]).toString("utf8");
}
