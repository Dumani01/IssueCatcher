import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt, digest } from "../src/crypto.js";
test("AES roundtrip and unique IV", () => {
  const k = randomBytes(32),
    a = encrypt("demo", k),
    b = encrypt("demo", k);
  assert.notEqual(a, b);
  assert.equal(decrypt(a, k), "demo");
});
test("tampering rejected", () => {
  const k = randomBytes(32),
    p = encrypt("demo", k).split(".");
  p[1] = Buffer.alloc(16).toString("base64");
  assert.throws(() => decrypt(p.join("."), k));
});
test("token hash deterministic", () => {
  assert.equal(digest("example").length, 64);
  assert.equal(digest("example"), digest("example"));
});
