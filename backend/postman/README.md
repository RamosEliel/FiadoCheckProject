# Postman — FiadoCheck

Colecciones y runner Newman para pruebas de API.

## Qué SÍ va al repositorio

| Archivo | Descripción |
|---------|-------------|
| `FiadoCheck-*.postman_collection.json` | Colecciones de prueba |
| `FiadoCheck-*.postman_environment.json` | Entornos (URLs + variables; ver credenciales abajo) |
| `CREDENCIALES-PRUEBAS.md` | Cuentas de la base de desarrollo |
| `package.json` / `package-lock.json` | Dependencias Newman (solo dev) |
| `run-postman-docs.ps1` | Script de corrida + reporte |
| `generate-obsidian-report.js` | Genera nota en Obsidian |
| `.gitignore` / `README.md` | Esta documentación |

## Qué NO subir al repo

| Carpeta / archivo | Motivo |
|-------------------|--------|
| `node_modules/` | Se regenera con `npm install` |
| `reports/` | Salida de Newman (HTML + JSON) |
| `*.log` | Logs locales |
| `*.postman_environment.local.json` | Overrides personales (tokens, URLs privadas) |

Los reportes Obsidian se escriben **fuera** del repo (`Obsidian Vault/Sistema_Fiado/`), no en esta carpeta.
La documentación de desarrollo vive en `Sistema_Fiado/02 - Desarrollo/` vía MCP Obsidian, no en la ruta Windows de Fiury.

## Colecciones

| Colección | Alcance |
|-----------|---------|
| `FiadoCheck-SCRUM-52-Auth` | Auth, registro, perfil |
| `FiadoCheck-SCRUM-66-Sesion` | Sesiones y revocación |
| `FiadoCheck-SCRUM-110-Scoring` | Scoring + ML |
| `FiadoCheck-SCRUM-111-Recomendacion` | Recomendación IA |
| `FiadoCheck-SV-Pruebas` | Sprint validación (ALE, ASIS, GC, ANA) |

Entornos base: `FiadoCheck-Local` / `FiadoCheck-Azure` (solo URLs).  
Entornos SV: `FiadoCheck-SV-Pruebas` (Azure) / `FiadoCheck-SV-Pruebas-Local`.

Credenciales de prueba: ver `CREDENCIALES-PRUEBAS.md`.

## Ejecutar pruebas SV (Newman + Obsidian)

```powershell
cd backend/postman
.\run-postman-docs.ps1              # Azure (default)
.\run-postman-docs.ps1 -Environment Local
```

La primera vez instala dependencias en `node_modules/` (ignorado por git).

Alternativa npm:

```powershell
npm run docs:sv
```

## Postman GUI

Importar colección + entorno (`Local` o `Azure`). Para SCRUM-52/110/111 las contraseñas están en variables de colección; para SV ver `CREDENCIALES-PRUEBAS.md`.
