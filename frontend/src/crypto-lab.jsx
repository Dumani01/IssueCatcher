import React, { useState } from "react";
export function CryptoLab() {
  const [plain, S] = useState("Nota ficticia del laboratorio"),
    [out, O] = useState(null),
    [busy, B] = useState(false);
  async function run() {
    B(true);
    try {
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = new TextEncoder().encode(plain);
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        key,
        data,
      );
      const clear = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        key,
        encrypted,
      );
      const altered = new Uint8Array(encrypted.slice(0));
      altered[0] ^= 1;
      let rejected = false;
      try {
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv, tagLength: 128 },
          key,
          altered,
        );
      } catch {
        rejected = true;
      }
      const hkey = await crypto.subtle.generateKey(
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      );
      const signature = await crypto.subtle.sign("HMAC", hkey, data);
      O({
        source: "Web Crypto real en este navegador",
        algorithm: "AES-256-GCM",
        ivBytes: iv.length,
        tagBits: 128,
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        roundtrip: new TextDecoder().decode(clear) === plain,
        tamperingRejected: rejected,
        hmacVerified: await crypto.subtle.verify("HMAC", hkey, signature, data),
        key: "Efímera, no exportable; independiente de las claves del servidor",
      });
    } catch {
      O({ error: "Web Crypto requiere localhost o HTTPS" });
    } finally {
      B(false);
    }
  }
  return (
    <section>
      <h1>Laboratorio de criptografía</h1>
      <p>
        Experimento local con datos ficticios. La llave se descarta al terminar;
        no cifra tus notas reales.
      </p>
      <label>
        Texto de prueba
        <textarea
          maxLength={5000}
          value={plain}
          onChange={(e) => S(e.target.value)}
        />
      </label>
      <button disabled={busy} onClick={run}>
        Cifrar, descifrar y manipular
      </button>
      <pre>{out ? JSON.stringify(out, null, 2) : "Sin ejecutar"}</pre>
    </section>
  );
}
