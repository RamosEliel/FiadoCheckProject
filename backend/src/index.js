require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Rutas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const carteraRoutes = require('./routes/cartera');
const clientesRoutes = require('./routes/clientes');
const creditosRoutes = require('./routes/creditos');
const abonosRoutes = require('./routes/abonos');
const alertasRoutes = require('./routes/alertas');
const analiticaRoutes = require('./routes/analitica');
const reportesRoutes = require('./routes/reportes');
const scoringRoutes = require('./routes/scoring');
const pagosRoutes = require('./routes/pagos');
const asistenteRoutes = require('./routes/asistente');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Health check
// Incluye version y entorno para poder confirmar desde fuera qué build está
// desplegado, sin depender de los logs del App Service.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fiadocheck-api',
    version: require('../package.json').version,
    entorno: process.env.NODE_ENV || 'development',
    ml_configurado: Boolean(process.env.ML_SERVICE_URL),
    n8n_configurado: Boolean(process.env.N8N_WEBHOOK_URL),
    timestamp: new Date().toISOString(),
  });
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cartera', carteraRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/creditos', creditosRoutes);
app.use('/api/abonos', abonosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/analitica', analiticaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/asistente', asistenteRoutes);

// Webhook ejemplo (n8n)
app.post('/webhooks/test', (req, res) => {
  res.json({ received: true });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La imagen es demasiado grande. Intenta con una foto de menor resolución.' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message });
});

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Servidor FiadoCheck corriendo en puerto ${PORT}`);
  console.log(`=================================`);
  console.log(`Endpoints disponibles:`);
  console.log(`  Health: GET /health`);
  console.log(`  Auth: /api/auth/login, /api/auth/logout`);
  console.log(`  Dashboard: /api/dashboard`);
  console.log(`  Cartera: /api/cartera, /api/cartera/cliente/:id, /api/cartera/vencidos`);
  console.log(`  Clientes: /api/clientes, /api/clientes/:id, /api/clientes/:id/historial, /api/clientes/:id/pagos`);
  console.log(`  Créditos: /api/creditos, /api/creditos/:id, /api/creditos/cliente/:id, /api/creditos/:id/abonos`);
  console.log(`  Abonos: /api/abonos/:id`);
  console.log(`  Scoring: /api/scoring/:id, /api/scoring/:id/recomendacion`);
  console.log(`  Alertas: /api/alertas, /api/alertas/:id/leer`);
  console.log(`  Analítica: /api/analitica/cliente/:id, /api/analitica/indicadores, /api/analitica/pagos-diarios, /api/analitica/prediccion-flujo`);
  console.log(`  Reportes: /api/reportes, /api/reportes/export/pdf`);
  console.log(`  Pagos: /api/pagos`);
  console.log(`  Asistente IA: POST /api/asistente/chat`);
  console.log(`=================================`);
  console.log(`Servidor activo. Deja esta terminal abierta (Ctrl+C para detener).`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nEl puerto ${PORT} ya está en uso por otro proceso.`);
    console.error('Cierra la instancia anterior o usa otro puerto:');
    console.error(`  PORT=3001 node src/index.js\n`);
  } else {
    console.error('\nError al iniciar el servidor:', err.message);
  }
  process.exit(1);
});

