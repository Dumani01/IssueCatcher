# Preparación del despliegue

Al 25 de noviembre de 2026 el usuario eligió Render para producción. Se añadió `render.yaml` con build, health check, proxy y variables privadas. No hay URL pública, SMTP externo, certificado web ni escaneos públicos ejecutados: Render y Supabase requieren inicio de sesión en sus paneles.

Proyecto Supabase exclusivo IssueCatcher: sgymhkvpeduerydkeqnn, us-east-1. Costo consultado por conector: US$0/mes al crearlo. Esquema y políticas aplicados; siete tablas con RLS; permisos revocados a PUBLIC, anon y authenticated; asesor de seguridad sin avisos. El runtime queda NOLOGIN hasta terminar configuración. Los materiales privados generados permanecen en .local y fuera del ZIP.

La conexión directa falló ENOTFOUND y los poolers probados SELF_SIGNED_CERT_IN_CHAIN. La verificación TLS permaneció activa. Confirmar host exacto y descargar CA oficial desde Connect/Database Settings; no adoptar hosts inferidos como configuración final.

## Pasos pendientes

1. Acceder al dashboard Supabase; descargar CA oficial; activar enforcement SSL y revisar restricciones de red. Configurar DB_CA y verificar cadena y hostname.
2. Activar runtime con credencial nueva guardada en gestor de secretos. Confirmar DATABASE_URL del pooler, conexión TLS, CRUD y denegación de DDL. No usar postgres como runtime.
3. Separar migrador dueño del esquema; sus secretos solo en release, nunca en proceso web. Respaldar antes de migrar.
4. Conectar un repositorio privado propio a Render y crear el Blueprint de `render.yaml`. El plan gratuito sirve para demostración; revisar disponibilidad antes de contratar otro plan. No se creó hosting web.
5. Build npm ci && npm run build; start node backend/src/server.js. NODE_ENV=production, HOST=0.0.0.0 y APP_ORIGIN con dominio HTTPS exacto. Crear llaves independientes de desarrollo; configurar SMTP externo y remitente verificado. No ejecutar seed de demo en producción.
6. Ajustar TRUST_PROXY a la topología real; valor 1 solo con un salto confiable que sobrescriba cabeceras de forwarding. El proxy debe redirigir HTTP a HTTPS; cookies Secure, HttpOnly, SameSite=Strict y HSTS se activan en producción.
7. Crear primer administrador mediante proceso privado, entregar cuenta al profesor por canal privado. Verificar login, logout, CRUD, reset con correo real, health y reinicio del proceso.
8. Contra URL propia autorizada: ZAP baseline, SecurityHeaders objetivo A, SSL Labs y pruebas IDOR, inyección y 429. Guardar fecha/alcance/resultados sanitizados. No existen calificaciones públicas todavía.

Dockerfile multi-stage con usuario node, healthcheck y exclusión de secretos. Preparado, no construido: Docker no está instalado. Compose original mantiene PostgreSQL/Mailpit en loopback; requiere provisión de roles y variables y no se presenta como alternativa ya validada.

CI configura PostgreSQL efímero, secretos aleatorios de prueba, npm ci, migración, tests, build, navegador, audit y Gitleaks. Ejecución remota pendiente de repositorio; Gitleaks Action puede requerir licencia según organización. Antes de producción fijar acciones/imágenes por SHA/digest revisado, proteger rama y aprobar release. No se inventó historial de commits de estudiantes.

Fuentes: [Render Express](https://render.com/docs/deploy-node-express-app), [Supabase conexión](https://supabase.com/docs/guides/database/connecting-to-postgres), [Express proxy](https://expressjs.com/en/guide/behind-proxies/), [Docker multi-stage](https://docs.docker.com/build/building/multi-stage/).
