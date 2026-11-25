# IssueCatcher v1.0

Laboratorio de seguridad basado en SecureVault: React/Vite, Express y PostgreSQL. Diseño oscuro monocromático inspirado en la referencia. Se conserva JavaScript/CSS sin añadir WebGL ni dependencias visuales innecesarias.

## Ejecutar en Windows

```powershell
powershell -NoProfile -File scripts/setup-windows.ps1
npm run local:start
```

Abrir http://localhost:3001. Buzón de desarrollo: http://localhost:8025. Cuentas ficticias privadas: backend/.local/demo-accounts.json, generadas por setup. Puedes registrar otra cuenta en la interfaz. El ZIP no contiene credenciales.

## Verificación y documentación

npm test: criptografía e integración en issuecatcher_test. npm run test:browser: Chrome. npm run test:runtime: rol mínimo y API levantada. npm run audit y npm run build: dependencias y compilación. Resultados reales y límites en TEST_REPORT.md.

RF01-08 verificados localmente; diez categorías OWASP con controles y evidencia. El proyecto Supabase de Dumani01 tiene esquema/RLS y conexión runtime TLS verificada; el despliegue público en Render requiere acceso al panel y SMTP real. GitHub Actions aprobó CI; Docker, ZAP, SecurityHeaders y SSL Labs no se presentan como ejecutados.

Consultar docs/Laboratorio_Oficial.docx, INSTALLATION.md, DEPLOYMENT.md, ARCHITECTURE.md, THREAT_MODEL.md, CRYPTOGRAPHY.md, SECURITY_REPORT.md, Deep_Research.pdf y DEMO.md. Colección API en postman/. `render.yaml` prepara Render, sin credenciales. PROJECT_STATUS.md refleja el estado final; los archivos de contexto conservan el punto de partida anterior.

El modo vulnerable es una simulación etiquetada y no desactiva controles de Express. Las pruebas intensivas solo deben ejecutarse contra entornos propios aislados. Los requisitos académicos de URL pública, historial del equipo y escaneos posteriores siguen pendientes.
