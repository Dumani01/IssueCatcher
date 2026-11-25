# Despliegue seguro de IssueCatcher

Investigación académica contrastada con documentación oficial. Fecha de consulta: 25 de noviembre de 2026. Adaptación del laboratorio SecureVault. Preparación local verificada; publicación de producción aplazada por decisión del usuario.

## Resumen ejecutivo

Se propone un servicio Node persistente que entregue React y Express bajo el mismo origen, con PostgreSQL gestionado en Supabase. Esta separación simplifica cookies, autorización y mantenimiento. La elección de Render para una futura demostración responde a la facilidad de desplegar Express [1]. No se ha contratado ni publicado ese servicio. Los planes gratuitos deben evaluarse como recursos limitados de laboratorio, sin prometer disponibilidad durante toda la evaluación.

## 1. PaaS, contenedores y VPS

Un PaaS administra infraestructura, despliegues y reinicios a cambio de límites y menor control del sistema. Docker empaqueta aplicación y dependencias; no reemplaza el hosting, TLS ni los respaldos. Un VPS ofrece control del sistema operativo, pero exige administrar parches, firewall, proxy y supervisión. El costo real incluye operación, base de datos y tráfico, además de la cuota del servidor. Para este laboratorio, un PaaS reduce trabajo operativo; un contenedor conserva una alternativa reproducible [2].

## 2. Comparación de tres plataformas

Render Free: 750 horas de instancia por workspace/mes; duerme tras 15 minutos sin tráfico. Puede alojar Express y conectarse a PostgreSQL; las bases gratuitas tienen restricciones propias [3]. Regiones de servicios: Oregon, Ohio, Virginia, Frankfurt y Singapur [4].

Railway Free: US$0/mes, US$1 de uso incluido, hasta 0.5 GB RAM y 1 vCPU; el servicio gratuito puede dormir. Se distingue del crédito inicial de prueba de US$5. PostgreSQL se despliega como servicio adicional y consume recursos [5]. Revisar disponibilidad regional del plan en el panel antes de provisionar [6].

Koyeb Free: una instancia por organización, 512 MB RAM, 0.1 vCPU y 2 GB SSD; Washington D.C. o Frankfurt. Escala a cero tras una hora inactiva; no admite volúmenes persistentes [7]. La BD debe contratarse o conectarse por separado. Los tres proveedores ofrecen dominios de plataforma y TLS gestionado, pero eso no sustituye verificar cookies, redirección y conexión a la BD [1,8,9].

# Secretos y operación

## 3. Variables de entorno y gestores de secretos

Las variables separan configuración del código. Un gestor de secretos añade permisos, trazabilidad y rotación; el proceso recibe solo lo necesario. Un .env local excluido del repositorio no controla por sí solo copias, backups, permisos de CI ni exposiciones en logs. En IssueCatcher, runtime y migrador deben tener credenciales distintas; el navegador nunca recibe llaves AES, JWT ni DATABASE_URL. La configuración privada del host sustituye al .env distribuido [10].

## 4. TLS, Let’s Encrypt y HSTS

Un certificado vincula una identidad de dominio con una clave pública validada por una autoridad. TLS autentica al servidor y protege el transporte. Let’s Encrypt automatiza validación de dominio y emisión mediante ACME; la renovación también debe automatizarse [11]. HSTS indica al navegador usar HTTPS en visitas futuras. No protege el primer acceso por sí solo ni cifra la conexión entre API y PostgreSQL: esta requiere su propio TLS.

## 5. Proxy inverso y trust proxy

El proxy recibe conexiones públicas, termina TLS, redirige HTTP y reenvía tráfico a Node. Puede gestionar límites y distribución de carga. Express usa trust proxy para interpretar IP y protocolo enviados por proxies. Confiar en cabeceras arbitrarias permite falsificar IP y debilitar rate limiting. La configuración debe representar la topología real y el proxy debe sobrescribir cabeceras no confiables [12].

## 6. Supervisión y reinicio

PM2 o systemd supervisan un proceso en un VPS, reiniciándolo y administrando logs. En PaaS o contenedores un supervisor de infraestructura puede cumplir esa función, por lo que no se necesita duplicar gestores dentro del contenedor. Docker por sí solo necesita una política de reinicio o un orquestador. El healthcheck comprueba disponibilidad; no demuestra autorización ni integridad. La instalación local entregada no crea servicio Windows ni autoinicio.

## Decisión criptográfica relacionada

TLS protege tránsito; AES-GCM protege contenido persistido; Argon2id protege contraseñas mediante hash lento. Son controles distintos. Se usan los mínimos de Argon2id recomendados por OWASP: 19 MiB, dos iteraciones y paralelismo uno [13]. La integridad GCM se verifica al descifrar con node:crypto [14].

# Pipeline y verificación

## 7. CI/CD mínimo

CI integra cambios y ejecuta comprobaciones; CD prepara o publica una versión controlada. El workflow entregado propone checkout, Node 24, PostgreSQL aislado, secretos efímeros, npm ci, migraciones, tests, build, pruebas de navegador, npm audit y Gitleaks. Solo después de aprobar estas etapas debe autorizarse una release con secretos de producción. GitHub define los workflows como procesos de jobs configurados en YAML [15]. La ejecución remota aún no ocurrió; no se presenta el archivo como evidencia de un pipeline aprobado.

## 8. Bases gestionadas y conexión segura

Neon y Supabase ofrecen PostgreSQL gestionado; MongoDB Atlas ofrece un modelo documental. Para conservar SQL y el proyecto original se eligió PostgreSQL. La conexión necesita contraseña robusta, rol mínimo, restricciones de red cuando estén disponibles y verificación de certificado y hostname. En Supabase, SSL require cifra pero no autentica al servidor; se necesita CA oficial y equivalente de verify-full. Pooler y conexión directa tienen características de red distintas [16].

## 9. Diferencias entre desarrollo y producción

Producción usa NODE_ENV=production, dominio HTTPS exacto, cookies Secure/HttpOnly/SameSite, errores genéricos, logs sin cuerpos privados y secretos administrados. No se expone el servidor Vite ni el buzón local. El backend entrega el build de React y API en un origen. La BD local acepta loopback SCRAM; la de nube debe exigir TLS validado. Un proxy mal configurado puede invalidar supuestos de cookies y límites. Respaldos, retención, monitoreo y restauración son responsabilidades operativas adicionales.

## 10. Verificaciones posteriores al despliegue

Comprobar redirección HTTP, atributos de cookies, CSP/HSTS, /health, recuperación SMTP y revocación. Ejecutar npm audit, ZAP baseline contra la URL propia autorizada, SecurityHeaders y SSL Labs; probar IDOR, inyección y 429 con cuentas ficticias. Un baseline pasivo no equivale a pentest exhaustivo. Cada categoría OWASP requiere una medida y evidencia delimitada [17]. No se inventan calificaciones ni capturas de servicios no ejecutados.

## Plan propuesto y estado real

Navegador → HTTPS/proxy → Express y React → PostgreSQL Supabase por TLS; Express → SMTP verificado. La implementación y las pruebas locales están completas para RF01-08. Se creó un proyecto Supabase exclusivo y se aplicó esquema/RLS; su rol web permanece NOLOGIN. CA oficial, conexión desde la aplicación, hosting, SMTP externo, URL y escaneos públicos quedan pendientes. Un plan gratuito debe verificarse otra vez antes de usarlo en evaluación.

# Fuentes y criterio de selección

Se contrastaron las fuentes originales siguientes. Los costos y límites son los observados al consultar; no son una garantía futura ni una contratación. La decisión de PaaS es una propuesta para el tamaño del laboratorio, no una comparación de rendimiento medida. Las pruebas ejecutadas se documentan por separado en TEST_REPORT.md.

[1] [Render Express](https://render.com/docs/deploy-node-express-app)

[2] [Docker multi-stage](https://docs.docker.com/build/building/multi-stage/)

[3] [Render Free](https://render.com/docs/free)

[4] [Render regiones](https://render.com/docs/regions)

[5] [Railway planes](https://docs.railway.com/pricing/plans)

[6] [Railway regiones](https://docs.railway.com/deployments/regions)

[7] [Koyeb instancias](https://www.koyeb.com/docs/reference/instances)

[8] [Railway dominios públicos](https://docs.railway.com/networking/public-networking)

[9] [Koyeb dominios](https://www.koyeb.com/docs/run-and-scale/domains)

[10] [Render secretos](https://render.com/docs/configure-environment-variables)

[11] [Let’s Encrypt funcionamiento](https://letsencrypt.org/how-it-works/)

[12] [Express trust proxy](https://expressjs.com/en/guide/behind-proxies/)

[13] [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

[14] [Node crypto](https://nodejs.org/api/crypto.html)

[15] [GitHub workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows)

[16] [Supabase conexiones PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres)

[17] [OWASP Top 10 2025](https://top10.owasp.org/2025/)