# Arquitectura y diccionario de datos

React presenta notas, perfil, administración y experimentos educativos. Express valida identidad, rol y propietario. PostgreSQL almacena hashes, cifrado y eventos. El modo vulnerable construye objetos ficticios en React y nunca apaga controles del servidor.

```mermaid
flowchart LR
 B[Navegador React] -->|mismo origen y cookie HttpOnly| E[Express y Helmet]
 E --> V[Zod y JWT HS256]
 V --> A[Sesión activa y autorización]
 A -->|SQL parametrizado| P[(PostgreSQL con RLS)]
 E -->|SMTP con timeout| M[Correo de recuperación]
 L[Simulación y Web Crypto local] --> B
 C[CI pruebas y audit] --> R[Release manual]
```

Local: Express sirve el build en localhost:3001; PostgreSQL 17.12 usa SCRAM y loopback:55432. El buzón SMTP no envía correos a Internet. Producción requiere HTTPS y Supabase con CA verificada; no está desplegada.

```mermaid
erDiagram
 users ||--o{ notes : owns
 users ||--o{ sessions : authenticates
 users ||--o{ password_reset_tokens : recovers
 users ||--o{ audit_logs : generates
 users { uuid id PK
 text email UK
 text name
 text password_hash
 text role
 text phone_encrypted }
 notes { uuid id PK
 uuid owner_id FK
 text title
 text content_encrypted }
 sessions { uuid id PK
 uuid user_id FK
 timestamptz expires_at
 timestamptz revoked_at }
 password_reset_tokens { text token_hash PK
 uuid user_id FK
 timestamptz expires_at
 timestamptz used_at }
 audit_logs { bigint id PK
 uuid user_id FK
 text event
 timestamptz created_at }
 auth_attempts { text key PK
 int count
 timestamptz expires_at }
 security_alerts { bigint id PK
 text event
 timestamptz created_at }
```

| Tabla | Campos y restricciones |
|---|---|
| users | UUID generado; email único normalizado; nombre 2-80; hash Argon2id; rol user/admin; teléfono cifrado opcional; created_at |
| notes | UUID; FK owner_id con CASCADE; título 1-100 legible; contenido 1-5000 cifrado; created_at/updated_at; índice de propietario |
| sessions | UUID nuevo por login; FK usuario; expires_at obligatorio de 15 min; revoked_at nullable |
| password_reset_tokens | SHA-256 hexadecimal PK; FK usuario; expires_at obligatorio de 15 min; used_at nullable |
| audit_logs | Identidad bigint; evento fijo sin payload; FK usuario nullable con SET NULL; created_at |
| auth_attempts | SHA-256 de IP/cuenta con prefijo; contador entero; expiración persistente |
| security_alerts | Identidad bigint; evento fijo; created_at |

Longitudes se validan en Zod; relaciones y roles también en SQL. El título, nombre y correo permanecen legibles: no incluir secretos en títulos. No hay job automático de retención: definirlo antes de producción, por ejemplo purgar sesiones/tokens expirados tras 30 días, ventanas de bloqueo diariamente y auditar 90 días según política institucional.

El migrador posee el esquema; el runtime no tiene superuser, BYPASSRLS, DDL ni eliminación de auditoría. RLS admite al rol confiable del backend y bloquea Data API. El aislamiento entre usuarios se implementa con WHERE owner_id en Express; no se atribuye a RLS un aislamiento entre usuarios que comparten el rol backend.
