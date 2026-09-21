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
│   │   ├── features.py              # Features desde creditos/abonos y estado
│   │   └── test_ml.py               # Verificación sin curl
│   ├── postman/              # Colecciones de pruebas (ver sección Pruebas)
│   └── scripts/              # Seeds y migraciones SQL
│
├── mobile/                   # App Expo / React Native (expo-router)
│   └── app/
│       ├── (auth)/                  # login, registerTendero, registerClientes
│       ├── (tabs)/                  # dashboard, clientes, pagos, wallet,
│       │                            # vistaUsuario, perfilCliente, Asistenteia
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
Registro de fiados con fecha límite, abonos parciales o totales y actualización transaccional del saldo. Al liquidarse un crédito, el estado pasa a `pagado` automáticamente y se dispara el reentrenamiento del modelo.

### Scoring y recomendación IA
La única fuente de `nivel_riesgo`, `puntaje` y `confianza` es el Random Forest. La tabla `scoring` guarda la última predicción por par (cliente, tendero). Un cliente sin créditos con ese tendero recibe puntaje 50, nivel medio, recomendación `con_precaucion` y límite de $50.000, sin llamar al modelo.

| Nivel | Puntaje | Recomendación |
|-------|---------|---------------|
| bajo | ≥ 80 | aprobar |
| medio | 50–79 | con precaución |
| alto | < 50 | rechazar |

El **límite sugerido** es `max(0, min(base × factor − saldo_pendiente, 300.000))`, donde `base` es el promedio de los últimos 3 créditos cerrados y el factor es 1.5 / 1.0 / 0.5 según el nivel.

### Predicción con Random Forest
Microservicio Python (`backend/ml_service/`) que lee `creditos`, `abonos` y `clientes` directo. Entrena con créditos **cerrados** (`pagado` o `vencido`): una fila por crédito.

**Features** (calculables antes de otorgar un crédito nuevo; no usan monto ni plazo del crédito que se está evaluando):

- `num_creditos_previos_cerrados`
- `ratio_pagados_a_tiempo_previo`
- `dias_atraso_promedio_previo` (`vencido` cuenta 31 días)
- `antiguedad_meses` (registro del cliente hasta la fecha del crédito, en entrenamiento)

**Etiqueta** (desenlace observado):

- `bueno`: pagado y el último abono llegó dentro de `fecha_limite_pago`
- `regular`: pagado con el último abono después del plazo
- `malo`: el crédito quedó `vencido`

`POST /predict` responde `nivel_riesgo` (`bajo` / `medio` / `alto`), `puntaje_rf` (0–100), `confianza` (0–1, probabilidad máxima entre las tres clases) y `limite_sugerido`. El puntaje pondera las probabilidades del bosque:

```
puntaje = round(100 × (P(bueno)×1.0 + P(regular)×0.5 + P(malo)×0.0))
```

El nivel de riesgo es el bucket de ese puntaje (tabla de arriba).

El reentrenamiento ocurre **por eventos**, no por tiempo: crédito pagado o mora superior a 30 días. El servicio verifica que el volumen de créditos cerrados haya crecido al menos un 20% antes de reentrenar, y lo hace en segundo plano con *model swapping*: el modelo anterior sigue atendiendo peticiones mientras se entrena el nuevo. Entrenamiento inicial: `python model.py` (genera `modelo.pkl` y `ml_state.json`).

### Alertas y notificaciones
Alertas clasificadas en `critica`, `proxima` e `informativa` según el rango de mora. Notificaciones push vía Expo con enlace profundo a la pantalla correspondiente.

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

Actualizar `mobile/config/config.ts` con la IP del backend en la red local.

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

| Categoría | Endpoints |
|-----------|-----------|
| Auth | `POST /login`, `POST /logout`, `POST /registerTendero`, `POST /registerClientes`, `GET/PUT /profile`, `PUT /change-password`, `PUT /push-token` |
| Dashboard | `GET /dashboard` |
| Cartera | `GET /cartera`, `/cartera/cliente/:id`, `/cartera/vencidos` |
| Clientes | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `GET /me`, `GET /me/historial` |
| Créditos | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `GET /cliente/:id`, `POST /:id/abonos`, `GET /:id/abonos` |
| Pagos | `GET /pagos` |
| Scoring | `GET /:id`, `POST /:id/calcular`, `GET /:id/recomendacion` |
| Alertas | `GET /`, `PATCH /:id/leer` |
| Analítica | `GET /indicadores`, `/pagos-diarios`, `/prediccion-flujo` |
| Reportes | `GET /`, `GET /export/pdf` |
| Asistente | `POST /asistente/chat` |

Documentación ampliada en [backend/README.md](backend/README.md).

---

## Despliegue

GitHub Actions despliega automáticamente en Azure App Service:

- `.github/workflows/develop_fiadocheck-api.yml` — API al hacer push a `develop`
- `.github/workflows/develop_fiadocheck-ml.yml` — microservicio ML

Las variables de entorno se configuran como App Settings en el portal de Azure. A diferencia del entorno local, modificar una App Setting reinicia el contenedor automáticamente.

---

## Licencia

ISC
