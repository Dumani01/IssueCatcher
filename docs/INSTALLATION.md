# Instalación Windows

Requiere Node 24 LTS, npm, PowerShell e Internet. No requiere Docker ni privilegios administrativos para PostgreSQL portátil. Desde la raíz IssueCatcher:

```powershell
powershell -NoProfile -File scripts/setup-windows.ps1
npm run local:start
```

El script instala con npm ci, preserva secretos, descarga PostgreSQL 17.12 oficial de EDB con SHA-256 fijado, inicializa un cluster propio SCRAM en loopback:55432, provisiona bases issuecatcher e issuecatcher_test, migra, crea cuentas ficticias y compila. No ejecutarlo sobre datos de otra aplicación.

App: http://localhost:3001. Buzón de desarrollo: http://localhost:8025. Cuentas ficticias privadas: backend/.local/demo-accounts.json. También puedes registrar tu propia cuenta. El buzón no entrega correos a Internet; muestra mensajes de desarrollo. No compartir enlaces de recuperación.

```powershell
npm test
npm run test:browser
npm run test:runtime
npm run audit
npm run build
```

Las pruebas backend y navegador borran datos exclusivamente de issuecatcher_test. Las del navegador usan Chrome instalado; alternativa: npx playwright install chromium y PLAYWRIGHT_CHANNEL=chromium. Nunca apuntar las pruebas a datos reales. test:runtime necesita app levantada y cuentas demo.

Para Vite: APP_ORIGIN=http://localhost:5173 en backend/.env y npm run dev. Para Express con build: APP_ORIGIN=http://localhost:3001 y SERVE_FRONTEND=true, después npm run local:start.

Reinicio: .local/pgsql/bin/pg_ctl -D .local/pgdata -l .local/postgres.log -w start y npm run local:start. En la instancia instalada durante este trabajo los binarios están en work/postgres/pgsql/bin fuera del proyecto; setup-windows.ps1 acepta -PgBin con esa ruta existente. No se instaló servicio Windows ni autoinicio al encender.

Apagado: Ctrl+C en terminal de app/buzón y pg_ctl -D .local/pgdata -m fast -w stop. Conservar .local/pgdata y backend/.env en respaldos seguros; regenerar llaves no repara descifrado.

Variables: PORT, NODE_ENV, APP_ORIGIN, DATABASE_URL, JWT_SECRET, DATA_ENCRYPTION_KEY, DB_TLS, DB_CA, MIGRATION_DATABASE_URL, HOST, SERVE_FRONTEND, TRUST_PROXY, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_FROM, SMTP_USER, SMTP_PASSWORD. Los ejemplos solo contienen marcadores. Nunca usar VITE_ para secretos. setup preserva .env; local-db.mjs está limitado a desarrollo y ajusta las URLs locales, no ejecutarlo sobre producción.

El ZIP incluye código, lockfile y build, sin dependencias, PostgreSQL, BD ni secretos. Cada instalación genera sus propias credenciales.

Las credenciales del migrador se guardan solo en backend/.env.migrate y se cargan en comandos migrate/seed; el proceso web no las recibe. Detener la app antes de repetir npm ci en Windows para liberar el módulo nativo Argon2.
