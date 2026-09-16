# FiadoCheck

App móvil para gestionar el crédito informal ("fiado") en tiendas de barrio. Registra clientes, créditos y abonos, controla la cartera, clasifica el riesgo crediticio con un modelo Random Forest y automatiza alertas de mora y un asistente por chat con n8n. React Native, Node.js y PostgreSQL. Proyecto de grado — Ingeniería de Sistemas.

---

## Estado del proyecto

| Componente | Estado |
|------------|--------|
| **Backend API** | Funcional — Express 5 con 12 módulos de rutas |
| **App móvil** | Funcional — Expo/React Native con roles tendero y cliente |
| **Microservicio ML** | Operativo — Random Forest con reentrenamiento por eventos |
| **Asistente n8n** | Operativo — consultas y operaciones por chat |
| **Despliegue** | Azure App Service con CI/CD desde `develop` |

---

## Estructura

```
Sistema_Fiado/
├── backend/                  # API REST (Express + PostgreSQL)
│   ├── src/
│   │   ├── index.js                 # Entry point, monta /api/*
│   │   ├── config/database.js       # Pool de conexiones (NeonDB)
│   │   ├── middleware/auth.js       # JWT + validación de sesión
│   │   ├── routes/                  # auth, dashboard, cartera, clientes,
│   │   │                            # creditos, abonos, pagos, scoring,
│   │   │                            # alertas, analitica, reportes, asistente
│   │   └── utils/                   # mlServiceClient, mlScoring, mlTrigger
│   ├── ml_service/           # Microservicio Python (FastAPI)
│   │   ├── model.py                 # Entrenamiento del Random Forest
│   │   ├── predict.py               # /predict y /ml/retrain
│   │   ├── features.py              # Extracción de features y estado
│   │   └── test_ml.py               # Verificación sin curl
│   ├── postman/              # Colecciones de pruebas (ver sección Pruebas)
│   └── scripts/              # Seeds y migraciones SQL
│
├── mobile/                   # App Expo / React Native (expo-router)
│   └── app/
│       ├── (auth)/                  # login, registerChoice, registerTendero,
│       │                            # registerClientes, TiendasAsociadas
│       ├── (tabs)/                  # dashboard, clientes, pagos, wallet,
│       │                            # vistaUsuario, perfilCliente, Analitica,
│       │                            # reportes, Asistenteia, profile
│       ├── addcredit.tsx            # Nuevo crédito con recomendación IA
│       ├── registerpayment.tsx      # Registro de abonos
│       ├── creditoDetalle.tsx       # Detalle e historial del crédito
│       └── notificaciones.tsx       # Bandeja de alertas
│
├── n8n/workflows/            # Workflow del asistente IA
└── visual/                   # Mockups de referencia
```

---

## Módulos

### Gestión de clientes
Registro y vinculación de clientes a un tendero mediante la tabla `tendero_cliente`. Búsqueda por nombre o cédula, filtros por estado (`mora`, `al_dia`, `sin_deuda`) y orden por deuda total. Cada tendero solo accede a su propia cartera.

### Créditos y abonos
Registro de fiados con fecha límite, abonos parciales o totales y actualización transaccional del saldo. Al liquidarse un crédito, el estado pasa a `pagado` automáticamente, se invalida la caché de scoring de ese par cliente–tendero y se dispara el reentrenamiento del modelo.

### Recomendación IA (Random Forest)

El Random Forest es la **única fuente** de `nivel_riesgo`, `puntaje` (0–100, uso interno) y `confianza`. No hay un scoring paralelo por reglas de 25 puntos. La tabla `scoring` es solo una **caché** de la última predicción por par (cliente, tendero). Las features se calculan en cada llamada desde `creditos` / `abonos` / `clientes`, no se leen de esa tabla.

**Cuándo hay predicción real:** el cliente debe estar registrado, vinculado a la tienda (`tendero_cliente` activo) y tener **al menos un crédito cerrado** (`pagado` o `vencido`) con ese tendero. Un crédito solo `vigente` no alcanza: no hay desenlace que el modelo pueda evaluar.

**Cliente nuevo o sin créditos cerrados** (regla fija, no se llama al RF):

| Campo | Valor |
|-------|--------|
| nivel_riesgo | `medio` |
| puntaje interno | 50 |
| confianza | `null` (en la UI: “Sin historial suficiente”, no 0%) |
| límite sugerido | $50.000 |

**Etiqueta de entrenamiento** (desenlace real del crédito cerrado, no un umbral de features):

- `bueno`: pagado y el último abono llegó dentro de `fecha_limite_pago`
- `regular`: pagado pero el último abono llegó después del plazo
- `malo`: el crédito quedó `vencido`

**Features** (por par cliente–tendero, calculables antes de otorgar un crédito nuevo; no se usan monto ni plazo):

- `num_creditos_previos_cerrados`
- `ratio_pagados_a_tiempo_previo`
- `dias_atraso_promedio_previo` (`vencido` cuenta como 31 días)
- `antiguedad_meses`

**Puntaje interno** (no se muestra en la app; el nivel de riesgo se deriva de él):

```
puntaje = round(100 * (P(bueno)*1.0 + P(regular)*0.5 + P(malo)*0.0))
```

| nivel_riesgo | puntaje | recomendación |
|--------------|---------|---------------|
| bajo | ≥ 80 | `aprobar` |
| medio | 50–79 | `con_precaucion` |
| alto | &lt; 50 | `rechazar` |

`confianza` es la probabilidad máxima entre las tres clases (0–1). En la app se muestra como porcentaje.

**En la interfaz** (perfil del cliente, nuevo crédito y vista del cliente) se muestran **nivel de riesgo** y **confianza**. El puntaje no se presenta al usuario.

**Límite sugerido:** `max(0, min(base × factor − saldo_pendiente, 300.000))`, donde `base` es el promedio de los últimos 3 créditos cerrados y el factor es 1.5 / 1.0 / 0.5 según el nivel.

El reentrenamiento ocurre **por eventos**, no por tiempo:

1. Crédito pagado (`POST /api/creditos/:id/abonos` cuando el saldo llega a cero).
2. Mora mayor a 30 días (`GET /api/creditos/:id`).

El servicio verifica que el volumen de créditos cerrados haya crecido al menos un 20% antes de reentrenar, y lo hace en segundo plano con *model swapping*. Tras un reentrenamiento exitoso se invalida la caché (`confianza = NULL`) para forzar recálculo.

Si el microservicio no responde y no hay predicción cacheada, el backend responde **503**.

### Alertas y notificaciones
Alertas clasificadas en `critica`, `proxima` e `informativa` según el rango de mora. Notificaciones push vía Expo con enlace profundo a la pantalla correspondiente. El icono de notificación en Android (`expo-notifications` en `app.json`) forma parte del build nativo: un cambio de logo exige un **nuevo development build**, no solo un reload de Metro.

### Asistente IA
Chat integrado en la app que consulta la cartera en lenguaje natural ("¿quién me debe más?", "créditos vencidos") y ejecuta operaciones de escritura: vincular clientes, registrar créditos y pagos. Implementado como workflow de n8n al que el backend accede por proxy.

---

## Tecnologías

| Capa | Stack |
|------|-------|
| **Backend** | Node.js 18+, Express 5, `pg`, JWT con hash SHA256 de sesión, bcryptjs |
| **Base de datos** | PostgreSQL (NeonDB) |
| **Machine Learning** | Python 3.11, FastAPI, Uvicorn, scikit-learn, psycopg2 |
| **Móvil** | Expo, React Native, expo-router, AsyncStorage |
| **Automatización** | n8n |
| **Infraestructura** | Azure App Service, GitHub Actions |

---

## Primeros pasos

### 1. Backend

```bash
cd backend
npm install
npm run dev        # nodemon, puerto 3000
```

Crear `backend/.env`:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:password@host/basedatos?sslmode=require
DB_SSL=true
JWT_SECRET=tu_secret_jwt_seguro
JWT_EXPIRES_IN=24h
ML_SERVICE_URL=http://localhost:8000
N8N_WEBHOOK_URL=https://tu-instancia-n8n/webhook/...
```

> `ML_SERVICE_URL` y `N8N_WEBHOOK_URL` son opcionales en local. Sin la primera, el backend usa `http://localhost:8000` por defecto; sin la segunda, el asistente responde 503.
>
> Los cambios en `.env` **requieren reiniciar el proceso**: nodemon vigila los `.js` pero no las variables de entorno.

### 2. Microservicio ML

```bash
cd backend/ml_service
python -m venv venv
venv\Scripts\activate            # Windows
source venv/bin/activate         # macOS/Linux
pip install -r requirements.txt

python model.py                  # genera modelo.pkl y ml_state.json
python predict.py                # levanta FastAPI en el puerto 8000
```

El puerto se resuelve en este orden: `ML_PORT`, luego `PORT`, y por defecto `8000`. La variable `ML_PORT` existe para fijar el puerto en local sin interferir con `PORT`, que es la que inyecta Azure App Service.

El microservicio **no carga** `backend/.env` completo (evitaría arrancar en el puerto 3000). Toma solo `DATABASE_URL` de ese archivo si no está ya definida. Opcionalmente se puede usar `backend/ml_service/.env`.

Verificación rápida:

```bash
venv\Scripts\python test_ml.py
```

### 3. App móvil

```bash
cd mobile
npm install
npm run start      # Expo dev server
```

Actualizar `mobile/config/config.ts` con la URL del backend (IP local o Azure).

---

## Pruebas

Las colecciones de Postman en `backend/postman/` cubren el plan de pruebas del proyecto:

| Colección | Cubre |
|-----------|-------|
| `FiadoCheck-SCRUM-52-Auth` | Registro, login, perfil y push token |
| `FiadoCheck-SCRUM-66-Sesion` | Revocación e invalidación de sesión |
| `FiadoCheck-SCRUM-110-Scoring` | Cálculo de scoring e integración con el ML |
| `FiadoCheck-SCRUM-111-Recomendacion` | Recomendación IA por nivel de riesgo |
| `FiadoCheck-SV-Pruebas` | Sprint validación (alertas, asistente, analítica, cartera) — ver `run-postman-docs.ps1` |

Importar junto con `FiadoCheck-Local.postman_environment.json` o `FiadoCheck-Azure.postman_environment.json` y ejecutar con el Collection Runner. Las credenciales de prueba están documentadas en `backend/postman/CREDENCIALES-PRUEBAS.md`.

Para la colección SV con Newman y reporte automático a Obsidian:

```powershell
cd backend/postman
.\run-postman-docs.ps1
```

Ver `backend/postman/README.md` para qué archivos van al repo y cuáles no (`node_modules/`, `reports/`).

---

## Modelo de datos

```
roles → usuario → sesiones
                → tenderos → tendero_cliente ↔ clientes
                                  ↘ creditos → abonos
                                  ↘ scoring
                                  ↘ metricas_cartera
                                  ↘ alertas
                                  ↘ recordatorios
```

---

## API

Prefijo: `/api`. Auth con `Bearer` salvo login y registros públicos.

| Categoría | Endpoints |
|-----------|-----------|
| Auth | `POST /login`, `POST /logout`, `POST /registerTendero`, `POST /registerClientes`, `GET/PUT /profile`, `PUT /change-password`, `PUT /push-token` |
| Dashboard | `GET /dashboard` |
| Cartera | `GET /cartera`, `/cartera/cliente/:id`, `/cartera/vencidos` |
| Clientes | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `GET /me`, `GET /me/historial` |
| Créditos | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `GET /cliente/:id`, `POST /:id/abonos`, `GET /:id/abonos` |
| Pagos | `GET /pagos` |
| Scoring | `GET /:id`, `GET /:id/recomendacion` (cálculo on-demand; no hay `POST /calcular`) |
| Alertas | `GET /`, `PATCH /:id/leer` |
| Analítica | `GET /indicadores`, `/pagos-diarios`, `/prediccion-flujo` |
| Reportes | `GET /`, `GET /export/pdf` |
| Asistente | `POST /asistente/chat` |

Documentación ampliada en [backend/README.md](backend/README.md).

---

## Despliegue

GitHub Actions despliega automáticamente en Azure App Service al hacer push a `develop` (si cambia `backend/` o `backend/ml_service/`):

- `.github/workflows/develop_fiadocheck-api.yml` — API
- `.github/workflows/develop_fiadocheck-ml.yml` — microservicio ML

El login a Azure usa OIDC (`azure/login@v2`) y secrets `AZUREAPPSERVICE_CLIENTID_*`, `TENANTID_*` y `SUBSCRIPTIONID_*`. Si faltan, el job de deploy falla en “Login to Azure” aunque el build haya pasado. Para configurarlos una vez: `scripts/setup-azure-oidc-deploy.ps1` (requiere `az login` y `gh auth login`).

Las variables de entorno se configuran como App Settings en el portal de Azure. A diferencia del entorno local, modificar una App Setting reinicia el contenedor automáticamente.

---

## Licencia

ISC
