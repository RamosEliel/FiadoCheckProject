const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateQuery, rules } = require('../middlewares/validateBody');
const analyticsController = require('../modules/analiticas/analytics.controller');

const PERIODOS = ['semana', 'mes', 'trimestre', 'aldia'];
const validarPeriodoQuery = validateQuery([rules.oneOf('periodo', PERIODOS)]);

const router = express.Router();
router.use(authMiddleware);

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

const pctDistribucion = (monto, total) => (total > 0 ? round1((monto / total) * 100) : 0);

const buildSemanasCompletas = (pagosRows, esperadoRows) => {
  const semanas = [1, 2, 3, 4].map((semana) => ({
    semana,
    pagos: 0,
    esperado: 0,
  }));

  pagosRows.forEach((row) => {
    const idx = Number(row.semana) - 1;
    if (idx >= 0 && idx < 4) semanas[idx].pagos = round2(parseFloat(row.pagos) || 0);
  });

  esperadoRows.forEach((row) => {
    const idx = Number(row.semana) - 1;
    if (idx >= 0 && idx < 4) semanas[idx].esperado = round2(parseFloat(row.esperado) || 0);
  });

  return semanas;
};

const verificarClienteTendero = async (idTendero, idCliente) => {
  const result = await pool.query(`
    SELECT c.id_cliente, c.nombre_completo
    FROM clientes c
    JOIN tendero_cliente tc ON c.id_cliente = tc.id_cliente
    WHERE tc.id_tendero = $1 AND tc.id_cliente = $2 AND tc.estado = 'activo'
  `, [idTendero, idCliente]);

  return result.rows[0] || null;
};

// GET /api/analitica/cliente/:clienteId?anio=2026&mes=8
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;
    const anioNum = parseInt(req.query.anio, 10) || new Date().getFullYear();
    const mesQuery = parseInt(req.query.mes, 10);

    if (!idTendero) {
      return res.status(403).json({ error: 'Acceso restringido a tenderos' });
    }

    const cliente = await verificarClienteTendero(idTendero, clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const anioActual = new Date().getFullYear();
    const mesActual = new Date().getMonth() + 1;
    const mesDefault = anioNum === anioActual ? mesActual : 3;
    const mesChart = Number.isFinite(mesQuery) && mesQuery >= 1 && mesQuery <= 12
      ? mesQuery
      : mesDefault;

    const [recuperadoRes, pagosSemRes, esperadoSemRes, distRes] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(a.monto), 0) AS total
        FROM abonos a
        JOIN creditos c ON a.id_credito = c.id_credito
        WHERE a.id_cliente = $1 AND c.id_tendero = $2
          AND EXTRACT(YEAR FROM a.fecha_abono) = $3
      `, [clienteId, idTendero, anioNum]),

      pool.query(`
        SELECT
          CASE
            WHEN EXTRACT(DAY FROM a.fecha_abono) <= 7 THEN 1
            WHEN EXTRACT(DAY FROM a.fecha_abono) <= 14 THEN 2
            WHEN EXTRACT(DAY FROM a.fecha_abono) <= 21 THEN 3
            ELSE 4
          END AS semana,
          COALESCE(SUM(a.monto), 0) AS pagos
        FROM abonos a
        JOIN creditos c ON a.id_credito = c.id_credito
        WHERE a.id_cliente = $1 AND c.id_tendero = $2
          AND EXTRACT(YEAR FROM a.fecha_abono) = $3
          AND EXTRACT(MONTH FROM a.fecha_abono) = $4
        GROUP BY semana
        ORDER BY semana
      `, [clienteId, idTendero, anioNum, mesChart]),

      // Esperado = monto original de créditos que vencen esa semana, incluidos los ya
      // pagados. Si se usa saldo_pendiente y se excluye estado=pagado, un abono
      // puntual deja Esperado en $0 y la app muestra "Sin vencimientos este mes".
      pool.query(`
        SELECT
          CASE
            WHEN EXTRACT(DAY FROM fecha_limite_pago) <= 7 THEN 1
            WHEN EXTRACT(DAY FROM fecha_limite_pago) <= 14 THEN 2
            WHEN EXTRACT(DAY FROM fecha_limite_pago) <= 21 THEN 3
            ELSE 4
          END AS semana,
          COALESCE(SUM(monto_total), 0) AS esperado
        FROM creditos
        WHERE id_cliente = $1 AND id_tendero = $2
          AND EXTRACT(YEAR FROM fecha_limite_pago) = $3
          AND EXTRACT(MONTH FROM fecha_limite_pago) = $4
        GROUP BY semana
        ORDER BY semana
      `, [clienteId, idTendero, anioNum, mesChart]),

      pool.query(`
        SELECT
          COALESCE(SUM(CASE
            WHEN fecha_limite_pago >= CURRENT_DATE THEN saldo_pendiente
            ELSE 0
          END), 0) AS al_dia,
          COALESCE(SUM(CASE
            WHEN CURRENT_DATE - fecha_limite_pago BETWEEN 1 AND 7 THEN saldo_pendiente
            ELSE 0
          END), 0) AS mora_1_7,
          COALESCE(SUM(CASE
            WHEN CURRENT_DATE - fecha_limite_pago > 7 THEN saldo_pendiente
            ELSE 0
          END), 0) AS mora_mas_7
        FROM creditos
        WHERE id_cliente = $1 AND id_tendero = $2
          AND estado != 'pagado' AND saldo_pendiente > 0
      `, [clienteId, idTendero]),
    ]);

    const recuperado = round2(parseFloat(recuperadoRes.rows[0].total) || 0);

    const alDia = round2(parseFloat(distRes.rows[0].al_dia) || 0);
    const mora17 = round2(parseFloat(distRes.rows[0].mora_1_7) || 0);
    const moraMas7 = round2(parseFloat(distRes.rows[0].mora_mas_7) || 0);
    const totalDist = alDia + mora17 + moraMas7;
    const moraPorcentaje = totalDist > 0 ? round1(((mora17 + moraMas7) / totalDist) * 100) : 0;

    res.json({
      cliente: {
        id: String(cliente.id_cliente),
        nombre: cliente.nombre_completo,
      },
      anio: anioNum,
      mes_chart: mesChart,
      recuperado,
      mora_porcentaje: moraPorcentaje,
      pagos_semanales: buildSemanasCompletas(pagosSemRes.rows, esperadoSemRes.rows),
      distribucion: {
        al_dia: { pct: pctDistribucion(alDia, totalDist), monto: alDia },
        mora_1_7: { pct: pctDistribucion(mora17, totalDist), monto: mora17 },
        mora_mas_7: { pct: pctDistribucion(moraMas7, totalDist), monto: moraMas7 },
      },
    });
  } catch (err) {
    console.error('Error en analitica cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/analitica/indicadores
router.get('/indicadores', async (req, res) => {
  try {
    const { periodo } = req.query;
    const idTendero = req.user.id_tendero;

    let fechaInicio;
    const hoy = new Date();

    if (periodo === 'semana') {
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - 7);
    } else if (periodo === 'mes') {
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (periodo === 'trimestre') {
      const mesActual = hoy.getMonth();
      const trimestreInicio = Math.floor(mesActual / 3) * 3;
      fechaInicio = new Date(hoy.getFullYear(), trimestreInicio, 1);
    } else {
      // Por defecto: mes
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }

    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

    // Monto fiado en el período
    const fiadoResult = await pool.query(`
      SELECT COALESCE(SUM(monto_total), 0) as monto_fiado
      FROM creditos WHERE id_tendero = $1 AND fecha_credito >= $2
    `, [idTendero, fechaInicioStr]);

    // % cartera vencida
    const vencidaResult = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN estado = 'vencido' THEN saldo_pendiente ELSE 0 END), 0) as total_vencido,
             COALESCE(SUM(saldo_pendiente), 0) as total_saldo
      FROM creditos WHERE id_tendero = $1 AND estado != 'pagado'
    `, [idTendero]);

    const totalVencido = parseFloat(vencidaResult.rows[0].total_vencido) || 0;
    const totalSaldo = parseFloat(vencidaResult.rows[0].total_saldo) || 0;
    const porcentajeCarteraVencida = totalSaldo > 0 ? (totalVencido / totalSaldo) * 100 : 0;

    // Días promedio de atraso
    const diasAtrasoResult = await pool.query(`
      SELECT COALESCE(AVG(CASE WHEN estado = 'vencido' THEN CURRENT_DATE - fecha_limite_pago ELSE 0 END), 0) as dias_promedio
      FROM creditos WHERE id_tendero = $1 AND estado = 'vencido'
    `, [idTendero]);

    // Tasa de recuperación
    const pagosPeriodo = await pool.query(`
      SELECT COALESCE(SUM(a.monto), 0) as total_pagos
      FROM abonos a
      JOIN creditos c ON a.id_credito = c.id_credito
      WHERE c.id_tendero = $1 AND a.fecha_abono >= $2
    `, [idTendero, fechaInicioStr]);

    const fiadoTotal = parseFloat(fiadoResult.rows[0].monto_fiado) || 0;
    const pagosTotal = parseFloat(pagosPeriodo.rows[0].total_pagos) || 0;
    const tasaRecuperacion = fiadoTotal > 0 ? (pagosTotal / fiadoTotal) * 100 : 0;

    res.json({
      periodo: periodo || 'mes',
      fecha_inicio: fechaInicioStr,
      fecha_fin: hoy.toISOString().split('T')[0],
      monto_fiado: fiadoTotal,
      porcentaje_cartera_vencida: Math.round(porcentajeCarteraVencida * 100) / 100,
      dias_promedio_atraso: Math.round(parseFloat(diasAtrasoResult.rows[0].dias_promedio) * 100) / 100,
      tasa_recuperacion: Math.round(tasaRecuperacion * 100) / 100,
      total_pagos_periodo: pagosTotal
    });
  } catch (err) {
    console.error('Error en indicadores:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/analitica/pagos-diarios
router.get('/pagos-diarios', analyticsController.getPagosDiarios);

// GET /api/analitica/prediccion-flujo
router.get('/prediccion-flujo', analyticsController.getPrediccionFlujo);

module.exports = router;
