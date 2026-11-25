# Modelo de amenazas STRIDE

Activos: contraseñas, llaves AES/JWT, notas, teléfonos, sesiones, recuperación y auditoría. Límites de confianza: navegador/API, API/BD, API/SMTP y pipeline/producción. El administrador gestiona cuentas y eventos, sin ruta para leer notas ajenas.

| STRIDE | Abuso | Medida | Evidencia |
|---|---|---|---|
| Suplantación | Adivinar contraseña o JWT falso | Argon2id; HS256 fijo; sesión activa; límite IP/cuenta | RF02/A07/A08 en integration.test.js |
| Manipulación | Alterar cifrado o propietario | GCM; propietario tomado de sesión; SQL con owner_id | crypto.test.js e IDOR |
| Repudio | Negar cambio de rol | Evento role_changed con actor; runtime sin DELETE de auditoría | RF07 y smoke-runtime |
| Divulgación | Leer nota ajena o interceptar red | Propiedad; cifrado; máscara; HTTPS requerido | RF04/RF05; TLS público pendiente |
| Denegación | Fuerza bruta, notas ilimitadas o servicios colgados | Límites; bloqueo progresivo persistente; 100 notas transaccionales; 16kb; timeouts | 429, concurrencia y errores |
| Elevación | Enviar role al registro o degradar último admin | Esquema de registro; rol servidor; bloqueo transaccional | RF01/RF03/RF07 |

Riesgos residuales: comprometer el proceso con su llave expone datos descifrables; un operador BD puede alterar datos; IP compartida puede producir falsos positivos; un atacante puede provocar bloqueo de cuenta; auditoría no es WORM ni SIEM; no hay MFA ni recuperación de una llave perdida. Registro/recuperación no prometen tiempo constante. La base de producción preparada aún carece de conexión TLS verificada desde este equipo. El proyecto no está certificado como libre de vulnerabilidades.
