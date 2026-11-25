# Resultados ejecutados

25 de noviembre de 2026. Windows; Node v24.19.0; npm 11.17.0; PostgreSQL 17.12; Chrome. Base ficticia exclusiva issuecatcher_test.

| Comprobación | Resultado final real |
|---|---|
| npm install / npm ci | Aprobados; lockfile guardado |
| npm test | 16 pruebas, 16 aprobadas, cero fallos/omitidas |
| npm run build | Vite 6.4.6; aprobado, 24 módulos |
| npm run test:browser | Dos pruebas Chrome aprobadas; flujo completo y privacidad al cambiar cuenta; 9.1s total |
| npm run test:runtime | Aprobado: sin superuser/BYPASSRLS/DDL/DELETE auditoría; login admin, notas, auditoría y logout |
| npm audit --audit-level=high | Cero vulnerabilidades |
| Migración idempotente | Aplicada y repetida con éxito, migrador separado |
| setup-windows.ps1 | Parser PowerShell aprobado; provisión de componentes ejecutada localmente |
| PostgreSQL portátil | Checksum SHA-256 EDB verificado; SCRAM en loopback:55432 |
| Supabase | Proyecto exclusivo creado; dos migraciones; siete tablas RLS; asesor sin avisos; rol web NOLOGIN |
| Servicio local | /health status ok; raíz HTTP 200 |

Cobertura backend: registro válido/inválido y exclusión de rol; Argon2id; login genérico y cookie; admin/CSRF; CRUD y cifrado; IDOR GET/PATCH/DELETE; SQL/XSS literal; teléfono cifrado/enmascarado; límite concurrente de notas y tamaño; cabeceras/health; JWT inválido/sin firma/expirado; sesiones expiradas/revocadas; reset vía SMTP local con hash, expiración, uso único, tokens hermanos/sesiones revocados y concurrencia; 429 persistente; alertas/auditoría; cambios de rol/último admin; error genérico.

Chrome: registro/login, crear/editar/borrar, XSS no ejecuta, máscara, Web Crypto, laboratorio, móvil 390px sin overflow y logout; sin pageerror. Se verifica que un borrador editado de A no permanezca visible al entrar como B. La suite usa propietario de la BD de pruebas para fixtures; el rol mínimo se comprueba por separado contra servicio local real.

Incidencias resueltas: Nodemailer y Zod tenían vulnerabilidades altas, actualizados a 10.6.1 y 4.6.7; prueba de correo corregida para quoted-printable; ventanas de rate limit separadas entre casos. npm ci encontró EPERM por Argon2 cargado en Windows: se detuvo el proceso propio, reinstaló y repitió toda la batería con éxito. No se cuentan los fallos intermedios como aprobados.

No ejecutado: Docker/Compose, CI remoto, ZAP, SecurityHeaders, SSL Labs y SMTP externo. Node/Supabase falló ENOTFOUND o SELF_SIGNED_CERT_IN_CHAIN con validación activa. El usuario eligió continuar local y dejar producción pendiente. No hay URL pública ni historial de equipo ficticio. Gitleaks y validación del ZIP se registran en la nota de cierre de entrega.


## Cierre de la entrega

Gitleaks 8.30.1 descargado de su repositorio oficial, checksum SHA-256 verificado: escaneo dir sobre la carpeta saneada de entrega, sin hallazgos. Se incluye el resultado JSON vacío en docs/evidence/gitleaks.json. La búsqueda exacta de las credenciales/llaves generadas tampoco encontró valores privados en los archivos entregables. No es un escaneo de historial Git.

ZIP comprobado mediante CRC de todas las entradas, manifiesto SHA-256, validación JSON y exclusión de .env reales, node_modules, .local y logs. Documento oficial comparado byte a byte con el paquete recibido. Evidencia móvil sanitizada y resumen del navegador en docs/evidence/. La prueba de privacidad inicialmente requirió corregir un selector de textarea a su rol accesible; pasó después de la corrección.
