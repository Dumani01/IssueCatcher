# Informe OWASP Top 10 2025

Fecha: 25 de noviembre de 2026. Alcance: aplicación propia y PostgreSQL local aislado; esquema/permisos del proyecto Supabase exclusivo. Controles y pruebas no constituyen certificación ni pentest exhaustivo. Categorías contrastadas con [OWASP oficial](https://top10.owasp.org/2025/).

| Categoría | Control | Evidencia real y límite |
|---|---|---|
| A01 Broken Access Control | Sesión, rol y propietario en GET/PATCH/DELETE; sin destinos arbitrarios | IDOR 404 en tres operaciones, no-admin 403, CSRF 403, runtime mínimo. RLS bloquea Data API; propietario se verifica en Express |
| A02 Security Misconfiguration | Helmet/CSP; sin X-Powered-By; mismo origen; errores genéricos | Cabeceras y origen probados. SecurityHeaders y host público pendientes |
| A03 Software Supply Chain Failures | Lockfile, npm ci/audit, Dependabot, CI y Gitleaks | ci/audit aprobados, cero vulnerabilidades. CI remoto pendiente; revisión de entrega en TEST_REPORT |
| A04 Cryptographic Failures | Argon2id 19456/2/1; AES-GCM IV12/tag16; secretos externos | Hash, cifrado persistente, máscara, IV distinto y manipulación probados. TLS público/SSL Labs pendientes |
| A05 Injection | SQL parametrizado, Zod, escape React, CSP | SQL/script literal no altera consultas; UUID inválido 400; XSS no ejecuta en Chrome |
| A06 Insecure Design | STRIDE; 100 notas con bloqueo transaccional; contenido 5000; cuerpo 16kb | Dos creaciones en límite dan 201/409; entrada grande 400/413 |
| A07 Authentication Failures | Límites persistentes IP/cuenta; bloqueo progresivo; hash ficticio; sesión 15 min | Sexto intento 429; logout/revocación/expiración; reset único y concurrente. Sin refresh ni MFA por alcance |
| A08 Software or Data Integrity Failures | HS256/issuer/audience; tag GCM; CI; sin scripts CDN | JWT inválido/sin firma/expirado rechazado; tag alterado rechazado. SRI no aplica a assets locales; CI remoto pendiente |
| A09 Security Logging and Alerting Failures | Eventos fijos JSON/BD; login, roles y denegaciones; alerta al quinto intento | login_failed, role_changed y alertas verificados; runtime sin DELETE de auditoría. Sin SIEM/WORM |
| A10 Mishandling of Exceptional Conditions | Manejador global, errores genéricos, timeouts, salida ante unhandledRejection | JSON inválido 400; cifrado corrupto 500 genérico; pool sanitizado. Reinicio administrado de producción pendiente |

## Ataques bloqueados

IDOR: B lee/edita/borra nota de A y recibe 404 sin contenido, test RF04. Inyección/XSS: SQL y script literal permanecen datos; Chrome no ejecuta window.pwned y UUID inválido recibe 400. Fuerza bruta: sexto fallo recibe 429 con Retry-After y alerta/auditoría persistentes. JWT sin firma y GCM manipulado también se rechazan. Son pruebas locales reproducibles, no evidencia pública inventada.

Pino recibe solo eventos definidos y actor UUID, sin req.body, correo, contraseña, cookie, JWT o cifrado. El inspector oculta cuerpos privados y conserva método/ruta/estado/tiempo; historial temporal en memoria. El panel de usuarios requiere administrador. Los logs no se incluyen en el ZIP.

Riesgos residuales en THREAT_MODEL.md y CRYPTOGRAPHY.md: proceso comprometido con llave puede descifrar; RLS no protege frente al rol API comprometido; IP compartida y bloqueo de cuenta pueden causar denegación; retención/backup requieren operación. No hay MFA, rotación por versión ni alertas externas. Registro/recuperación no prometen tiempo constante.

Pendientes: CA/conexión TLS Supabase, enforcement/red, SMTP externo, hosting HTTPS, CI remoto, ZAP, SecurityHeaders y SSL Labs. La fase de producción del laboratorio no se da por cumplida.
