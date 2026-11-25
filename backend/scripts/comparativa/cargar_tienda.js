/**
 * Carga en FiadoCheck, por su API, la tienda de la prueba comparativa
 * OTG-COMP-01 con EXACTAMENTE los mismos datos que la libreta de papel.
 *
 * Crea una tienda desechable (correo cmp.<variante>.<n>@test.fiadocheck.com), 12
 * clientes sin cuenta, 16 fiados y sus abonos, deja marcados los vencidos y
 * comprueba que el estado resultante coincide con el dataset antes de dar la
 * tienda por lista. Escribe un JSON local con las credenciales de la tienda y la
 * hoja de respuestas.
 *
 * Uso (siempre explícito el destino, no hay valor por defecto):
 *   node scripts/comparativa/cargar_tienda.js --variante A --url https://fiadocheck-api.azurewebsites.net/api
 *   node scripts/comparativa/cargar_tienda.js --variante B --url http://localhost:3000/api
 *
 * Una tienda por sesión de participante: la condición de sistema modifica la
 * tienda (cliente nuevo, fiado, abono). Entre sesiones:
 *   node scripts/limpiar_pruebas_gestion_credito.js --prefijo cmp.
 */

const fs = require('fs');
const path = require('path');
const { construir, hoyBogota } = require('./dataset');

const PASSWORD = 'CmpPrueba2026';

async function api(base, method, ruta, { token, body } = {}) {
  const res = await fetch(base + ruta, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* respuesta sin cuerpo */ }
  return { status: res.status, json };
}

async function exigir(promesa, esperado, etiqueta) {
  const r = await promesa;
  if (r.status !== esperado) {
    throw new Error(`${etiqueta}: HTTP ${r.status} en vez de ${esperado} — ${JSON.stringify(r.json)}`);
  }
  return r.json;
}

async function cargar({ base, variante, hoy = hoyBogota(), log = () => {} }) {
  const datos = construir(variante, hoy);
  const ts = '9' + Date.now().toString().slice(-8);
  const cedulaTienda = ts;
  const email = `cmp.${variante.toLowerCase()}.${ts}@test.fiadocheck.com`;

  await exigir(api(base, 'POST', '/auth/registerTendero', { body: {
    nombre_completo: `Tienda comparativa ${variante} ${ts}`, email, telefono: '3001234567', cedula: cedulaTienda,
    direccion: 'Calle 10 # 20-30', num_camara_comercio: `CC-${ts}`, password: PASSWORD,
  } }), 201, 'registrar tienda');

  const { token } = await exigir(api(base, 'POST', '/auth/login', { body: { email, password: PASSWORD } }), 200, 'login');
  log(`tienda ${cedulaTienda} lista`);

  for (const c of datos.clientes) {
    await exigir(api(base, 'POST', '/clientes', { token, body: {
      nombre: c.nombre, identificacion: c.cedula, telefono: c.telefono, direccion: 'Barrio Centro',
    } }), 201, `crear cliente ${c.nombre}`);
  }
  log(`${datos.clientes.length} clientes creados`);

  for (const f of datos.fiados) {
    const r = await exigir(api(base, 'POST', '/creditos', { token, body: {
      clienteId: Number(f.cliente.cedula), montoTotal: f.monto, fechaLimitePago: f.fechaPago, descripcion: `Fiado ${f.n}`,
    } }), 201, `crear fiado ${f.n}`);
    f.idCredito = r.id_credito;
    for (const abono of f.abonos) {
      await exigir(api(base, 'POST', `/creditos/${f.idCredito}/abonos`, { token, body: { monto: abono, fechaAbono: hoy } }),
        201, `abono del fiado ${f.n}`);
    }
  }
  log(`${datos.fiados.length} fiados cargados`);

  // Listar los fiados marca como vencidos los que ya pasaron de fecha.
  const lista = await exigir(api(base, 'GET', '/creditos', { token }), 200, 'listar fiados');

  // Verificación: la tienda debe quedar idéntica al dataset, o la comparación no vale.
  const problemas = [];
  for (const f of datos.fiados) {
    const c = lista.find((x) => x.id_credito === f.idCredito);
    if (!c) { problemas.push(`fiado ${f.n}: no aparece en la tienda`); continue; }
    if (Math.abs(c.saldo_pendiente - f.saldo) > 0.005) problemas.push(`fiado ${f.n}: saldo ${c.saldo_pendiente} en vez de ${f.saldo}`);
    const estado = f.saldo === 0 ? 'pagado' : f.vencido ? 'vencido' : 'vigente';
    if (c.estado !== estado) problemas.push(`fiado ${f.n}: estado ${c.estado} en vez de ${estado}`);
  }
  if (problemas.length) throw new Error('La tienda no quedó como el dataset:\n  ' + problemas.join('\n  '));
  log('verificada: saldos y estados coinciden con la libreta');

  return {
    variante, dia: hoy, base,
    tienda: { email, password: PASSWORD, cedula: cedulaTienda },
    tareas: datos.tareas,
    totalDespuesDeEscribir: datos.totalDespuesDeEscribir,
  };
}

module.exports = { cargar };

if (require.main === module) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
  const variante = (arg('--variante') || '').toUpperCase();
  const base = arg('--url');
  if (!['A', 'B'].includes(variante) || !base) {
    console.error('Uso: node scripts/comparativa/cargar_tienda.js --variante A|B --url <https://host/api>');
    process.exit(1);
  }
  const salida = arg('--salida') || path.join(__dirname, 'salida');
  cargar({ base, variante, log: (m) => console.log('  ' + m) })
    .then((r) => {
      fs.mkdirSync(salida, { recursive: true });
      const f = path.join(salida, `tienda_${variante}.local.json`);
      fs.writeFileSync(f, JSON.stringify(r, null, 2));
      console.log(`  credenciales y respuestas en ${f}`);
      console.log(`  entrar con: ${r.tienda.email} / ${r.tienda.password}`);
    })
    .catch((e) => { console.error('  ERROR: ' + e.message); process.exit(1); });
}
