# Estado del proyecto



2026-11-25: instrucciones, contexto y documento oficial leídos; paquete original preservado fuera de entrega. Se reutilizaron React/Vite, Express, SQL y criptografía originales.

Terminado local: dependencias/lockfile, secretos privados, PostgreSQL 17.12 en loopback:55432 con SCRAM, bases local/pruebas separadas, migrador/runtime, políticas, migraciones idempotentes, tres cuentas ficticias privadas, RF01-08, frontend oscuro sencillo, administración, criptografía real, simulaciones e inspector sanitizado.

Controles completados: hash ficticio, límites persistentes/progresivos, alertas, roles y último admin, invalidación de tokens/sesiones, reset concurrente, timeouts y errores. Migrador privado en backend/.env.migrate, sin cargarlo al proceso web.

Verificación: npm ci; 16/16 tests backend; 2/2 Chrome con móvil; runtime mínimo; build; audit cero. Consultar TEST_REPORT.md.

Documentación: arquitectura/DER/diccionario, STRIDE, matriz OWASP, criptografía/rotación, instalación/despliegue, Postman, demo y Deep Research de cuatro páginas con fuentes verificadas; documento oficial intacto.

Supabase: proyecto IssueCatcher exclusivo creado con costo consultado US$0/mes; esquema/políticas y asesor sin avisos. El usuario eligió Render y se añadió `render.yaml`. Acceso a los paneles, CA/TLS, enforcement/red, SMTP externo y publicación siguen pendientes; runtime de nube NOLOGIN. No se publicaron escaneos ni historial ficticios.

Servicio local en http://localhost:3001; buzón http://localhost:8025. Sin servicio Windows/autoinicio. ZIP sin secretos, datos locales, logs ni node_modules.


Cierre: borradores eliminados de memoria al cambiar/cerrar sesión, con regresión de navegador aprobada. SMTP de producción exige TLS y certificado válido. Gitleaks de entrega sin hallazgos; paquete validado sin valores privados.
