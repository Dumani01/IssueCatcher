# Preparación del despliegue

Al 25 de noviembre de 2026 el usuario eligió Render para producción. Se añadió `render.yaml` con build, health check, proxy y variables privadas. No hay URL pública, SMTP externo ni escaneos públicos ejecutados. El acceso automatizado a Chrome está temporalmente indisponible.

Proyecto Supabase de la organización IssueCatcher de Dumani01: `jfanvpdmspptmtesfouq`, us-east-1. Esquema y políticas aplicados; siete tablas con RLS; permisos revocados a PUBLIC, anon y authenticated; asesor de seguridad sin avisos. Rol `issuecatcher_runtime` habilitado y conexión verificada con CA oficial y rechazo de certificados no válidos; DDL denegado con código 42501. La credencial runtime es privada y debe rotarse antes de configurar Render. El proyecto anterior `sgymhkvpeduerydkeqnn` pertenece a otra organización y no debe utilizarse.

El panel mostró el pooler de sesión `aws-1-us-east-1.pooler.supabase.com:5432`. La CA oficial se obtuvo del enlace de descarga del panel. Se pulsó la opción de exigir SSL en Supabase, pero no se observó después el estado final del interruptor: comprobarlo antes de afirmar que está activo.

## Pasos pendientes

1. Confirmar en Supabase que SSL enforcement quedó activo y revisar restricciones de red. Configurar DB_CA oficial en Render. La conexión TLS y la denegación de DDL ya se verificaron desde el equipo local.
2. Rotar la credencial del runtime y guardarla solo en Render. Confirmar CRUD desde la aplicación desplegada. No usar postgres como runtime.
3. Separar migrador dueño del esquema; sus secretos solo en release, nunca en proceso web. Respaldar antes de migrar.
4. Conectar un repositorio privado propio a Render y crear el Blueprint de `render.yaml`. El plan gratuito sirve para demostración; revisar disponibilidad antes de contratar otro plan. No se creó hosting web.
5. Build npm ci && npm run build; start node backend/src/server.js. NODE_ENV=production, HOST=0.0.0.0 y APP_ORIGIN con dominio HTTPS exacto. Crear llaves independientes de desarrollo; configurar SMTP externo y remitente verificado. No ejecutar seed de demo en producción.
6. Ajustar TRUST_PROXY a la topología real; valor 1 solo con un salto confiable que sobrescriba cabeceras de forwarding. El proxy debe redirigir HTTP a HTTPS; cookies Secure, HttpOnly, SameSite=Strict y HSTS se activan en producción.
7. Crear primer administrador mediante proceso privado, entregar cuenta al profesor por canal privado. Verificar login, logout, CRUD, reset con correo real, health y reinicio del proceso.
8. Contra URL propia autorizada: ZAP baseline, SecurityHeaders objetivo A, SSL Labs y pruebas IDOR, inyección y 429. Guardar fecha/alcance/resultados sanitizados. No existen calificaciones públicas todavía.

Dockerfile multi-stage con usuario node, healthcheck y exclusión de secretos. Preparado, no construido: Docker no está instalado. Compose original mantiene PostgreSQL/Mailpit en loopback; requiere provisión de roles y variables y no se presenta como alternativa ya validada.

CI configura PostgreSQL efímero, secretos aleatorios de prueba, npm ci, migración, tests, build, navegador, audit y Gitleaks. Ejecución remota pendiente de repositorio; Gitleaks Action puede requerir licencia según organización. Antes de producción fijar acciones/imágenes por SHA/digest revisado, proteger rama y aprobar release. No se inventó historial de commits de estudiantes.

Fuentes: [Render Express](https://render.com/docs/deploy-node-express-app), [Supabase conexión](https://supabase.com/docs/guides/database/connecting-to-postgres), [Express proxy](https://expressjs.com/en/guide/behind-proxies/), [Docker multi-stage](https://docs.docker.com/build/building/multi-stage/).
