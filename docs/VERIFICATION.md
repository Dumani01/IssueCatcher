# Verificación del flujo completo

Historia: React llama Express en un origen; Express valida sesión/propietario, cifra y consulta PostgreSQL; React representa respuestas como texto seguro.

| Límite | Evidencia |
|---|---|
| UI | Chrome completa registro/login/CRUD/perfil/criptografía/laboratorio/logout; sin pageerror; móvil 390px |
| Cliente/API | Fetch real y contratos 200/201/204, denegaciones 403/404 |
| API/datos | PostgreSQL real: cifrado, Argon2id, máscara y errores cerrados |
| Datos/UI | Solo dueño accede a notas; inspector oculta cuerpos privados |
| Operación | Health ok, runtime sin DDL/borrado de auditoría, build y audit aprobados |

Detalle en ../TEST_REPORT.md. Simulaciones no son evidencia de API. Supabase tiene esquema preparado sin conexión web TLS verificada. CI, Docker y escaneos externos permanecen pendientes.
