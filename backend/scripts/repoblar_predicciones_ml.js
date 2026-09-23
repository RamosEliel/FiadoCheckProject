/**
 * Recalcula la predicción RF de todos los pares (cliente, tendero) con
 * créditos cerrados. Marca mora vencida, llama a /predict y ajusta a riesgo
 * alto si hay crédito vencido abierto.
 *
 *   node scripts/repoblar_predicciones_ml.js --dry-run
 *   node scripts/repoblar_predicciones_ml.js
 *   node scripts/repoblar_predicciones_ml.js --url https://fiadocheck-ml.azurewebsites.net
 */

require('dotenv').config();
const pool = require('../src/config/database');
const { calcularLimiteSugerido, queryTotalesCreditos, ajustarPrediccionPorMora } = require('../src/utils/scoringUtils');
const { marcarCreditosVencidos } = require('../src/utils/creditosMora');

const DRY_RUN = process.argv.includes('--dry-run');
const urlArgIndex = process.argv.indexOf('--url');
const ML_URL = (urlArgIndex !== -1 && process.argv[urlArgIndex + 1]
  || process.env.ML_SERVICE_URL
  || 'https://fiadocheck-ml.azurewebsites.net').replace(/\/+$/, '');

const TIMEOUT_MS = 120000;

const idParaMl = (valor) => {
  const n = parseInt(String(valor), 10);
  if (Number.isNaN(n)) throw new Error(`id no numérico: ${valor}`);
  return n;
};

const predecir = async (idCliente, idTendero) => {
  const res = await fetch(`${ML_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_cliente: idParaMl(idCliente),
      id_tendero: idParaMl(idTendero),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
};

async function upsert(cli, ten, prediccion, limite) {
  await pool.query(`
    INSERT INTO scoring (id_cliente, id_tendero, nivel_riesgo, puntaje, confianza, limite_sugerido)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id_cliente, id_tendero) DO UPDATE SET
      nivel_riesgo = EXCLUDED.nivel_riesgo,
      puntaje = EXCLUDED.puntaje,
      confianza = EXCLUDED.confianza,
      limite_sugerido = EXCLUDED.limite_sugerido,
      fecha_calculo = NOW()
  `, [cli, ten, prediccion.nivel_riesgo, prediccion.puntaje, prediccion.confianza, limite]);
}

async function repoblar() {
  console.log(`  microservicio: ${ML_URL}`);

  try {
    const marcados = await marcarCreditosVencidos(pool, {});
    console.log(`  créditos pasados a vencido: ${marcados}`);

    const filas = await pool.query(`
      SELECT id_cliente, id_tendero,
             COUNT(*) FILTER (WHERE estado IN ('pagado', 'vencido')) AS cerrados
      FROM creditos
      GROUP BY id_cliente, id_tendero
      HAVING COUNT(*) FILTER (WHERE estado IN ('pagado', 'vencido')) > 0
      ORDER BY id_cliente, id_tendero
    `);

    console.log(`  pares con historial cerrado: ${filas.rows.length}`);

    if (DRY_RUN) {
      console.log('  --dry-run: no se llama al RF ni se escribe scoring.');
      return;
    }

    try {
      const health = await fetch(`${ML_URL}/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const h = await health.json();
      console.log(`  health: status=${h.status} features=${h.modelo_num_features} db=${h.db_conectada}`);
      if (h.modelo_num_features && h.modelo_num_features !== 9) {
        console.warn('  AVISO: el modelo no tiene 9 features; la mora abierta puede no entrar al RF.');
      }
    } catch (e) {
      console.warn(`  health no respondió (${e.message}); se intenta /predict igual.`);
    }

    let ok = 0;
    let conMoraAlto = 0;
    const fallos = [];

    for (const fila of filas.rows) {
      const cli = fila.id_cliente;
      const ten = fila.id_tendero;
      try {
        const rf = await predecir(cli, ten);
        const totales = await queryTotalesCreditos(pool, cli, ten);
        const ajustado = ajustarPrediccionPorMora(rf, totales);
        if (totales.creditos_vencidos > 0) conMoraAlto++;
        const limite = await calcularLimiteSugerido(pool, cli, ten, ajustado.nivel_riesgo);
        await upsert(cli, ten, ajustado, limite);
        ok++;
        console.log(
          `  ok ${cli}/${ten} rf=${rf.nivel_riesgo}→${ajustado.nivel_riesgo} ` +
          `puntaje=${ajustado.puntaje} mora=${totales.creditos_vencidos} limite=${limite}`
        );
      } catch (err) {
        fallos.push(`cliente ${cli} / tendero ${ten}: ${err.message}`);
      }
    }

    console.log(`  actualizadas: ${ok} | fallidas: ${fallos.length} | con mora→alto: ${conMoraAlto}`);
    fallos.forEach((f) => console.log(`    fallo -> ${f}`));
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

repoblar();
