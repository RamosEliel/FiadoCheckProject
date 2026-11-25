/**
 * Limpieza de los datos que dejan las pruebas GC-CONT-03 a 06 (colecciones
 * `FiadoCheck-GC-CONT-0X-*`) y la prueba comparativa manual vs. sistema.
 *
 * A diferencia de `limpiar_datos_de_prueba.js`, aquí SÍ hay créditos y abonos
 * que borrar: estas pruebas fían, abonan y dejan fiados vencidos de verdad. Por
 * eso el alcance se acota por correo, no por nombre, y se comprueba que nada de
 * lo que se borra toque a un tendero o cliente ajeno a la prueba.
 *
 * QUÉ BORRA
 *   Usuarios cuyo correo empieza por el prefijo indicado y termina en
 *   @test.fiadocheck.com, y todo lo que cuelga de ellos: sus tiendas, sus
 *   clientes (clientes con cuenta propia o vinculados a esas tiendas), los
 *   créditos, abonos, avisos leídos, scoring, predicciones, alertas,
 *   recordatorios, métricas, vínculos y sesiones.
 *
 * PREFIJOS PERMITIDOS (se pasa uno con --prefijo)
 *   gcc.   colecciones GC-CONT-03 a 06                      (por defecto)
 *   cmp.   tiendas de la prueba comparativa manual/sistema
 *   Un solo prefijo por corrida: así limpiar las colecciones no destruye la
 *   tienda comparativa a mitad de un experimento.
 *
 * SALVAGUARDAS
 *   - Aborta si algún crédito de un cliente de prueba pertenece a un tendero
 *     que no es de prueba, o al revés.
 *   - Todo ocurre en una transacción: si algo falla, no se borra nada.
 *   - --dry-run cuenta lo que se borraría sin tocar nada.
 *
 * Uso:
 *   node scripts/limpiar_pruebas_gestion_credito.js --dry-run
 *   node scripts/limpiar_pruebas_gestion_credito.js
 *   node scripts/limpiar_pruebas_gestion_credito.js --prefijo cmp. --dry-run
 *
 * Aviso: los créditos vencidos y pagados de estas tiendas entran al conjunto de
 * entrenamiento del Random Forest mientras existan. Limpiar pronto.
 */

require('dotenv').config();
const pool = require('../src/config/database');

const DRY_RUN = process.argv.includes('--dry-run');
const PERMITIDOS = ['gcc.', 'cmp.'];
const iPrefijo = process.argv.indexOf('--prefijo');
const PREFIJO = iPrefijo >= 0 ? process.argv[iPrefijo + 1] : 'gcc.';
const SUFIJO = '@test.fiadocheck.com';

async function limpiar() {
  if (!PERMITIDOS.includes(PREFIJO)) {
    console.error(`  Prefijo "${PREFIJO}" no permitido. Usa uno de: ${PERMITIDOS.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const client = await pool.connect();

  try {
    // El comodín _ de LIKE se escapa para que "gcc." no coincida con "gccX".
    const patron = `${PREFIJO.replace(/[%_\\]/g, '\\$&')}%${SUFIJO}`;

    const usuarios = await client.query(
      'SELECT id_usuario FROM usuario WHERE email LIKE $1', [patron]
    );
    const uids = usuarios.rows.map((r) => r.id_usuario);

    const tenderos = await client.query(
      'SELECT id_tendero FROM tenderos WHERE id_usuario = ANY($1)', [uids]
    );
    const tids = tenderos.rows.map((r) => String(r.id_tendero));

    // Clientes de prueba: los que tienen cuenta de prueba, más los creados por el
    // tendero sin cuenta (POST /clientes), que solo existen vinculados a su tienda.
    const clientes = await client.query(`
      SELECT id_cliente FROM clientes
      WHERE id_usuario = ANY($1)
         OR id_cliente IN (SELECT id_cliente FROM tendero_cliente WHERE id_tendero = ANY($2)
                           AND id_cliente NOT IN (SELECT id_cliente FROM tendero_cliente WHERE id_tendero <> ALL($2)))
    `, [uids, tids]);
    const cids = clientes.rows.map((r) => String(r.id_cliente));

    console.log(`  prefijo            : ${PREFIJO}   (${DRY_RUN ? 'dry-run' : 'borra'})`);
    console.log(`  usuarios de prueba : ${uids.length}`);
    console.log(`  tiendas de prueba  : ${tids.length}`);
    console.log(`  clientes de prueba : ${cids.length}`);

    if (uids.length === 0) {
      console.log('  Nada que limpiar.');
      return;
    }

    // Salvaguarda: el borrado no puede alcanzar a nadie ajeno a la prueba.
    const ajenos = await client.query(`
      SELECT COUNT(*) n FROM creditos
      WHERE (id_cliente = ANY($1) AND id_tendero <> ALL($2))
         OR (id_tendero = ANY($2) AND id_cliente <> ALL($1))
    `, [cids, tids]);
    if (Number(ajenos.rows[0].n) > 0) {
      console.error(`  ABORTA: ${ajenos.rows[0].n} créditos cruzan datos de prueba con datos reales. No se borra nada.`);
      process.exitCode = 1;
      return;
    }

    // Tablas dependientes, en el orden que imponen las claves foráneas. Algunas se
    // crean al primer uso (avisos_*), así que se omiten si todavía no existen.
    const creditosDePrueba = '(SELECT id_credito FROM creditos WHERE id_cliente = ANY($1) OR id_tendero = ANY($2))';
    const pasos = [
      ['abonos',                'abonos',                `id_cliente = ANY($1) OR id_credito IN ${creditosDePrueba}`],
      ['avisos_cliente_leidos', 'avisos_cliente_leidos', `id_cliente = ANY($1) OR id_credito IN ${creditosDePrueba}`],
      ['avisos_tendero_leidos', 'avisos_tendero_leidos', `id_tendero = ANY($2) OR id_credito IN ${creditosDePrueba}`],
      ['predicciones_ml',       'predicciones_ml',       'id_cliente = ANY($1)'],
      ['scoring',               'scoring',               'id_cliente = ANY($1) OR id_tendero = ANY($2)'],
      ['alertas',               'alertas',               'id_cliente = ANY($1) OR id_tendero = ANY($2)'],
      ['recordatorios',         'recordatorios',         'id_cliente = ANY($1) OR id_tendero = ANY($2)'],
      ['metricas_cartera',      'metricas_cartera',      'id_tendero = ANY($2)'],
      ['creditos',              'creditos',              'id_cliente = ANY($1) OR id_tendero = ANY($2)'],
      ['tendero_cliente',       'tendero_cliente',       'id_cliente = ANY($1) OR id_tendero = ANY($2)'],
    ];

    await client.query('BEGIN');
    const resumen = {};

    for (const [etiqueta, tabla, condicion] of pasos) {
      const existe = await client.query('SELECT to_regclass($1) AS t', [`public.${tabla}`]);
      if (!existe.rows[0].t) { resumen[etiqueta] = 'no existe'; continue; }
      // Cada consulta recibe siempre $1 (clientes) y $2 (tiendas): postgres exige que
      // todo parámetro enviado esté referenciado, aunque la condición use solo uno.
      const donde = `(${condicion}) AND $1::text[] IS NOT NULL AND $2::text[] IS NOT NULL`;
      const sql = DRY_RUN
        ? `SELECT COUNT(*)::int AS n FROM ${tabla} WHERE ${donde}`
        : `DELETE FROM ${tabla} WHERE ${donde}`;
      const r = await client.query(sql, [cids, tids]);
      resumen[etiqueta] = DRY_RUN ? r.rows[0].n : r.rowCount;
    }

    const finales = [
      ['clientes', 'DELETE FROM clientes WHERE id_cliente = ANY($1)', [cids]],
      ['sesiones', 'DELETE FROM sesiones WHERE id_usuario = ANY($1)', [uids]],
      ['tenderos', 'DELETE FROM tenderos WHERE id_usuario = ANY($1)', [uids]],
      ['usuario',  'DELETE FROM usuario WHERE id_usuario = ANY($1)', [uids]],
    ];
    for (const [etiqueta, sql, params] of finales) {
      if (DRY_RUN) {
        const tabla = etiqueta;
        const col = etiqueta === 'clientes' ? 'id_cliente' : 'id_usuario';
        const r = await client.query(`SELECT COUNT(*)::int AS n FROM ${tabla} WHERE ${col} = ANY($1)`, params);
        resumen[etiqueta] = r.rows[0].n;
      } else {
        const r = await client.query(sql, params);
        resumen[etiqueta] = r.rowCount;
      }
    }

    if (DRY_RUN) {
      await client.query('ROLLBACK');
      console.log('  filas que se borrarían:');
    } else {
      await client.query('COMMIT');
      console.log('  filas borradas:');
    }
    Object.entries(resumen).forEach(([t, n]) => console.log(`    ${t.padEnd(22)} ${n}`));
    console.log(DRY_RUN ? '  --dry-run: no se borró nada.' : '  COMMIT aplicado');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`  ERROR, se deshizo todo: ${err.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

limpiar();
