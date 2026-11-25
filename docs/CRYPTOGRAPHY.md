# Criptografía y rotación

Contraseñas: Argon2id con 19456 KiB, dos iteraciones y paralelismo uno; sal generada por la librería. El login verifica un hash ficticio cuando falta la cuenta para reducir diferencias temporales evidentes.

Notas y teléfono: AES-256-GCM con llave de 32 bytes desde entorno, IV aleatorio de 12 bytes por operación y tag de 16 bytes. Formato original IV.tag.ciphertext en base64, validado antes de descifrar. La manipulación falla al autenticar. El título permanece legible.

Recuperación: 32 bytes aleatorios, solo SHA-256 persistido, 15 minutos, consumo transaccional serializado por usuario. Restablecer invalida los demás tokens y sesiones. JWT: 15 minutos, HS256, issuer y audience fijos, con comprobación de sesión activa en BD. Se eligió sesión corta sin refresh para mantener pequeño el laboratorio.

El experimento Web Crypto usa llaves efímeras no exportables de AES-GCM y HMAC-SHA256, independientes del backend. Muestra roundtrip, manipulación rechazada e integridad HMAC. La persistencia cifrada se verifica mediante pruebas contra PostgreSQL.

Perder DATA_ENCRYPTION_KEY hace irrecuperables notas y teléfonos: respaldar BD y llave separadamente con cifrado y acceso controlado. No regenerarla sobre datos existentes. Rotación propuesta: respaldo; añadir key_version por fila; leer con llaves anterior/nueva; escribir con la nueva; migrar por lotes transaccionales; verificar descifrado y conteos; mantener llave anterior para backups durante su retención y retirarla después. No se implementó versionado ni se ejecutó esta rotación.

Cambiar JWT_SECRET invalida JWT y debe acompañarse de revocación de sesiones. Rotar contraseña de BD no requiere cambiar AES. Producción exige TLS con CA/hostname verificados, nunca rejectUnauthorized:false.

Fuentes: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Node crypto](https://nodejs.org/api/crypto.html), [Supabase TLS](https://supabase.com/docs/guides/platform/ssl-enforcement).

SMTP de producción exige TLS y verificación de certificado con mínimo TLS 1.2; el buzón local de pruebas usa loopback sin TLS y nunca debe publicarse.
