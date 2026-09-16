# FiadoCheck - Backend API

Sistema de gestión de cartera de créditos para tenderos. Permite administrar clientes, créditos, pagos, scoring y alertas con análisis predictivo.

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm

## Instalación

```bash
cd backend
npm install
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto:

```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fiadocheck
DB_SSL=false
JWT_SECRET=tu_secret_jwt_seguro
JWT_EXPIRES_IN=24h
```

## Ejecución

```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

---

## Arquitectura del Proyecto

```
backend/
├── src/
│   ├── index.js              # Entry point - configuración de Express y rutas
│   ├── config/
│   │   └── database.js       # Pool de conexión PostgreSQL
│   ├── middleware/
│   │   └── auth.js           # Validación de JWT y sesiones
│   └── routes/
│       ├── auth.js           # Autenticación (login/logout)
│       ├── dashboard.js      # Resumen principal del tendero
│       ├── cartera.js        # Gestión de cartera de créditos
│       ├── clientes.js       # CRUD de clientes
│       ├── creditos.js       # Créditos y abonos
│       ├── abonos.js         # Detalle de abonos
│       ├── alertas.js        # Sistema de alertas
│       ├── scoring.js        # Scoring crediticio y recomendaciones
│       ├── analitica.js      # Indicadores y predicciones
│       └── reportes.js       # Generación de reportes
├── .env                      # Variables de entorno
└── package.json
```

---

## Base de Datos

### Modelo de Datos

El sistema utiliza las siguientes tablas:

| Tabla | Descripción |
|-------|-------------|
| `roles` | Roles de usuario (tendero, admin) |
| `usuario` | Usuarios del sistema con autenticación |
| `sesiones` | Tokens activos e invalidados |
| `tenderos` | Perfil del tendero |
| `clientes` | Clientes del tendero |
| `tendero_cliente` | Relación many-to-many tenderos-clientes |
| `creditos` | Créditos (fiados) registrados |
| `abonos` | Pagos/abonos a créditos |
| `scoring` | Puntajes crediticios por cliente |
| `metricas_cartera` | Métricas diarias de cartera |
| `alertas` | Sistema de alertas |
| `recordatorios` | Recordatorios automatizados |

### Relaciones Principales

```
usuario 1──N sesiones
usuario 1──1 tenderos
tenderos 1──N tendero_cliente N──1 clientes
tenderos 1──N creditos N──1 clientes
creditos 1──N abonos
clientes 1──1 scoring
tenderos 1──N metricas_cartera
tenderos 1──N alertas N──1 clientes, creditos
```

---

## Endpoints API

### Autenticación

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión. Devuelve JWT y datos del usuario | No |
| POST | `/api/auth/logout` | Invalidar sesión activa | Sí |

**Login Request:**
```json
{
  "email": "correo@ejemplo.com",
  "password": "contraseña123"
}
```

**Login Response:**
```json
{
  "token": "eyJhbG...",
  "usuario": {
    "id_usuario": 1,
    "email": "correo@ejemplo.com",
    "id_rol": 1
  },
  "tendero": {
    "id_tendero": 1,
    "nombre": "Juan Pérez",
    "nombre_tienda": "Tienda El Ahorro"
  }
}
```

---

### Dashboard

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/dashboard` | Resumen: cartera total, mora, clientes, últimos movimientos | Sí |

**Response:**
```json
{
  "cartera_total": 1500000,
  "monto_en_mora": 350000,
  "monto_al_dia": 1150000,
  "total_clientes": 45,
  "clientes_en_mora": 8,
  "clientes_sin_deuda": 12,
  "ultimos_movimientos": [...]
}
```

---

### Cartera

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/cartera` | Estado general: vigentes vs vencidos | Sí |
| GET | `/api/cartera/cliente/:clienteId` | Total y desglose por crédito de un cliente | Sí |
| GET | `/api/cartera/vencidos` | Créditos vencidos clasificados por rango de días | Sí |

**Vencidos Response:**
```json
{
  "1_7_dias": { "cantidad": 5, "total_saldo": 250000, "creditos": [...] },
  "8_15_dias": { "cantidad": 3, "total_saldo": 180000, "creditos": [...] },
  "mas_15_dias": { "cantidad": 2, "total_saldo": 150000, "creditos": [...] }
}
```

---

### Clientes

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/clientes` | Listar clientes. Filtros: `?estado=` y `?q=` | Sí |
| GET | `/api/clientes/:id` | Datos completos con scoring y totales | Sí |
| POST | `/api/clientes` | Registrar nuevo cliente | Sí |
| PUT | `/api/clientes/:id` | Actualizar información | Sí |
| GET | `/api/clientes/:id/historial` | Historial crediticio completo | Sí |
| GET | `/api/clientes/:id/pagos` | Historial de abonos | Sí |

**Filtros de listado:**
- `?estado=mora` - Solo clientes en mora
- `?estado=al_dia` - Solo clientes al día
- `?estado=sin_deuda` - Solo clientes sin deuda
- `?q=nombre` - Búsqueda por nombre o ID

**Crear cliente:**
```json
{
  "nombre": "Carlos García",
  "identificacion": "12345678",
  "telefono": "3001234567",
  "direccion": "Calle 45 #12-30"
}
```

---

### Créditos

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/creditos` | Listar créditos. Filtros: `?clienteId=` y `?estado=` | Sí |
| GET | `/api/creditos/:id` | Detalle con días de atraso | Sí |
| POST | `/api/creditos` | Registrar nuevo crédito | Sí |
| PATCH | `/api/creditos/:id` | Actualizar estado | Sí |
| GET | `/api/creditos/cliente/:clienteId` | Créditos activos de un cliente | Sí |

**Filtros:**
- `?clienteId=1` - Filtrar por cliente
- `?estado=activo` - Filtrar: `vigente`, `pagado`, `vencido`

**Crear crédito:**
```json
{
  "clienteId": 1,
  "montoTotal": 50000,
  "descripcion": "Compra de abarrotes",
  "fechaLimitePago": "2026-05-15"
}
```

---

### Abonos

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/creditos/:creditoId/abonos` | Registrar abono (actualiza saldo automáticamente) | Sí |
| GET | `/api/creditos/:creditoId/abonos` | Listar abonos de un crédito | Sí |
| GET | `/api/abonos/:id` | Detalle de un abono específico | Sí |

**Registrar abono:**
```json
{
  "monto": 25000,
  "fechaAbono": "2026-04-28"
}
```

**Comportamiento automático:**
- Si `saldo_pendiente - monto <= 0`, el crédito cambia a estado `pagado`
- El saldo pendiente se actualiza automáticamente

---

### Scoring Crediticio (IA)

Fuente única: Random Forest (`ml_service/`). La tabla `scoring` es caché. No hay scoring por reglas ni `POST /calcular`: el cálculo es on-demand.

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/scoring/:clienteId` | Predicción vigente o recálculo | Sí |
| GET | `/api/scoring/:clienteId/recomendacion` | Recomendación de otorgamiento | Sí |

**Cuándo hay predicción RF:** cliente vinculado y con al menos un crédito cerrado (`pagado`/`vencido`) con ese tendero.

**Sin historial cerrado:** nivel `medio`, puntaje interno 50, `confianza` null, límite $50.000.

**Niveles de riesgo** (derivados del puntaje interno `0–100`):
- `bajo` (≥80): `aprobar`
- `medio` (50–79): `con_precaucion`
- `alto` (&lt;50): `rechazar`

**Recomendación:**
```json
{
  "estado": "con_historial",
  "recomendacion": "aprobar",
  "mensaje": "El cliente tiene un excelente historial...",
  "puntaje": 85,
  "nivel_riesgo": "bajo",
  "limite_sugerido": 75000,
  "confianza": 0.87
}
```

En la app se muestran `nivel_riesgo` y `confianza` (porcentaje). El puntaje no se presenta al usuario.

---

### Alertas

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/alertas` | Listar alertas. Filtro: `?tipo=` | Sí |
| PATCH | `/api/alertas/:id/leer` | Marcar alerta como leída | Sí |

**Tipos de alerta:**
- `critica` - Cliente con mora severa
- `proxima` - Pago próximo a vencer
- `informativa` - Recordatorios y notificaciones

---

### Analítica

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/analitica/indicadores` | KPIs del período. Filtro: `?periodo=` | Sí |
| GET | `/api/analitica/pagos-diarios` | Pagos por día del mes actual | Sí |
| GET | `/api/analitica/prediccion-flujo` | Predicción de flujo a 7 días | Sí |

**Períodos disponibles:** `semana`, `mes`, `trimestre`

**Indicadores response:**
```json
{
  "periodo": "mes",
  "monto_fiado": 1500000,
  "porcentaje_cartera_vencida": 23.5,
  "dias_promedio_atraso": 8.2,
  "tasa_recuperacion": 67.3
}
```

---

### Reportes

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/reportes` | Reporte de cartera. Filtro: `?periodo=` | Sí |
| GET | `/api/reportes/export/pdf` | Exportar reporte como HTML | Sí |

**Reporte incluye:**
- Resumen de créditos por estado
- Total de pagos en el período
- Monto en mora
- Tasa de recuperación
- Top 3 deudores

---

## Autenticación

Todos los endpoints marcados como **Sí** en Auth requieren el header:

```
Authorization: Bearer <token>
```

El token se obtiene al hacer login. Ejemplo:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"correo@ejemplo.com","password":"contraseña123"}'
```

---

## Manejo de Errores

Todos los endpoints devuelven errores en formato:

```json
{
  "error": "Mensaje descriptivo del error"
}
```

**Códigos de estado HTTP:**

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado correctamente |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o faltante |
| 404 | Not Found - Recurso no existe |
| 500 | Internal Server Error - Error del servidor |

---

## Scripts Disponibles

```bash
npm start    # Iniciar servidor en producción
npm run dev   # Iniciar con nodemon (recomendado para desarrollo)
```

---

## Dependencias

| Paquete | Versión | Uso |
|---------|---------|-----|
| express | ^5.2.1 | Framework web |
| pg | ^8.20.0 | Cliente PostgreSQL |
| bcryptjs | ^3.0.3 | Hash de contraseñas |
| jsonwebtoken | ^9.0.3 | Tokens JWT |
| cors | ^2.8.6 | CORS |
| dotenv | ^17.4.2 | Variables de entorno |
| uuid | ^14.0.0 | Generación de IDs |

---

## Notas de Implementación

1. **Seguridad de sesiones:** Cada token genera un hash SHA256 almacenado en la tabla `sesiones`. Al hacer logout, el token se marca como revocado.

2. **Aislamiento de datos:** Cada tendero solo puede ver sus propios clientes, créditos y métricas mediante la relación `tendero_cliente`.

3. **Actualización automática de estados:** Los abonos automáticamente recalculan el `saldo_pendiente` y cambian el estado a `pagado` cuando el saldo llega a 0.

4. **Cálculo de mora:** El sistema detecta créditos vencidos comparando `fecha_limite_pago` con la fecha actual.

5. **Exportación PDF:** El endpoint de exportación genera HTML formateado listo para imprimir o convertir a PDF.

---

## Próximos Pasos Sugeridos

1. Crear la base de datos en PostgreSQL ejecutando el SQL del modelo proporcionado
2. Insertar datos de prueba (roles, usuarios, tendero)
3. Implementar endpoints adicionales para webhooks de n8n
4. Agregar validación de campos con Joi o express-validator
5. Implementar tests unitarios con Jest
6. Agregar paginación a endpoints de listado
7. Implementar rate limiting para prevenir ataques

---

## Licencia

ISC