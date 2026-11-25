/**
 * Pruebas del material de la comparativa OTG-COMP-01: dataset, libreta, cargador
 * (contra un servidor HTTP falso en memoria) y análisis.
 *
 *   node --test scripts/comparativa/
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { construir, FIADOS, OBJETIVOS, hoyBogota, enPesos } = require('./dataset');
const { renderLibreta, renderTarjetas, renderRespuestas } = require('./generar_libreta');
const { cargar } = require('./cargar_tienda');
const { mediana, pSignos, leerCsv, validar, analizar, informe, TAREAS } = require('./analizar');

const HOY = '2026-03-15'; // fijo: el dataset es determinista para un día dado

// ── dataset ───────────────────────────────────────────────────────────────────
test('las variantes A y B tienen la misma estructura', () => {
  const a = construir('A', HOY), b = construir('B', HOY);
  assert.equal(a.clientes.length, 12);
  assert.equal(a.fiados.length, b.fiados.length);
  assert.deepEqual(a.fiados.map((f) => [f.indice, f.desfase, f.abonos.length, f.vencido, f.abierto]),
    b.fiados.map((f) => [f.indice, f.desfase, f.abonos.length, f.vencido, f.abierto]));
  assert.equal(a.tareas.T2.respuesta.clientes.length, b.tareas.T2.respuesta.clientes.length);
});

test('las variantes no comparten nombres ni cédulas', () => {
  const a = construir('A', HOY), b = construir('B', HOY);
  const nombres = new Set([...a.clientes, ...b.clientes].map((c) => c.nombre));
  const cedulas = new Set([...a.clientes, ...b.clientes].map((c) => c.cedula));
  assert.equal(nombres.size, 24);
  assert.equal(cedulas.size, 24);
  assert.notEqual(a.nuevoCliente.cedula, b.nuevoCliente.cedula);
});

test('ningún fiado queda con saldo negativo y solo uno está saldado', () => {
  for (const v of ['A', 'B']) {
    const d = construir(v, HOY);
    d.fiados.forEach((f) => assert.ok(f.saldo >= 0, `fiado ${f.n} de ${v}`));
    assert.equal(d.fiados.filter((f) => f.saldo === 0).length, 1);
  }
});

test('mora = fecha de pago anterior al día y saldo positivo', () => {
  const d = construir('A', HOY);
  d.fiados.forEach((f) => assert.equal(f.vencido, f.saldo > 0 && f.fechaPago < HOY));
  assert.ok(d.tareas.T2.respuesta.clientes.length >= 4, 'debe haber varios morosos para que T2 no sea trivial');
});

test('las respuestas correctas salen de los saldos, no de constantes', () => {
  const d = construir('A', HOY);
  const abiertos = d.fiados.filter((f) => f.abierto);
  assert.equal(d.tareas.T3.respuesta, abiertos.reduce((s, f) => s + f.saldo, 0));
  const deuda = (i) => abiertos.filter((f) => f.indice === i).reduce((s, f) => s + f.saldo, 0);
  assert.equal(d.tareas.T1.respuesta, deuda(OBJETIVOS.consulta));
  assert.equal(d.tareas.T6.respuesta, deuda(OBJETIVOS.abonar) - d.tareas.T6.abono);
  assert.equal(d.totalDespuesDeEscribir, d.tareas.T3.respuesta + d.tareas.T5.monto - d.tareas.T6.abono);
});

test('el cliente de la tarea T1 tiene varios fiados abiertos y el de T5 historial cerrado sin deuda', () => {
  const d = construir('A', HOY);
  assert.ok(d.fiados.filter((f) => f.indice === OBJETIVOS.consulta && f.abierto).length >= 3);
  const del11 = d.fiados.filter((f) => f.indice === OBJETIVOS.fiar);
  assert.ok(del11.length > 0 && del11.every((f) => f.saldo === 0));
});

test('cambiar el día mueve las fechas pero no las respuestas', () => {
  const x = construir('A', '2026-03-15'), y = construir('A', '2026-07-01');
  assert.notEqual(x.fiados[0].fechaPago, y.fiados[0].fechaPago);
  assert.deepEqual(x.tareas.T2.respuesta, y.tareas.T2.respuesta);
});

// ── libreta ───────────────────────────────────────────────────────────────────
test('la libreta lista a todos los clientes y todos los fiados, sin saldos calculados', () => {
  const d = construir('A', HOY);
  const md = renderLibreta(d);
  d.clientes.forEach((c) => assert.ok(md.includes(c.nombre), c.nombre));
  d.fiados.forEach((f) => assert.ok(md.includes(enPesos(f.monto)), `monto del fiado ${f.n}`));
  assert.ok(!/saldo\s*:|total\s*:|debe\s*:/i.test(md), 'la libreta no debe traer ningún saldo ni total anotado');
  assert.ok(md.includes('Día de la sesión: 15/03/2026'));
  assert.ok(md.includes('pagar el 23/03/2026'), 'la primera fecha de pago es 8 días después del día de la sesión');
});

test('las tarjetas no revelan las respuestas y la hoja del facilitador sí las trae', () => {
  const d = construir('A', HOY);
  const tarjetas = renderTarjetas(d), hoja = renderRespuestas(d);
  assert.ok(!tarjetas.includes(enPesos(d.tareas.T3.respuesta)));
  assert.ok(hoja.includes(enPesos(d.tareas.T3.respuesta)));
  assert.ok(hoja.includes(enPesos(d.tareas.T1.respuesta)));
  d.tareas.T2.respuesta.clientes.forEach((n) => assert.ok(hoja.includes(n)));
});

// ── cargador contra un servidor falso ─────────────────────────────────────────
function servidorFalso() {
  const st = { creditos: [], tokens: new Set(), seq: 100, clientes: [], tienda: null };
  const srv = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {};
      const send = (status, json) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)); };
      const ruta = req.url.replace(/^\/api/, '');
      if (req.method === 'POST' && ruta === '/auth/registerTendero') { st.tienda = body; return send(201, {}); }
      if (req.method === 'POST' && ruta === '/auth/login') { st.tokens.add('tk'); return send(200, { token: 'tk' }); }
      if (req.headers.authorization !== 'Bearer tk') return send(401, {});
      if (req.method === 'POST' && ruta === '/clientes') { st.clientes.push(body); return send(201, {}); }
      if (req.method === 'POST' && ruta === '/creditos') {
        const c = { id_credito: st.seq++, clienteId: body.clienteId, monto: body.montoTotal, saldo_pendiente: body.montoTotal,
          fecha: body.fechaLimitePago, estado: 'vigente' };
        st.creditos.push(c); return send(201, { id_credito: c.id_credito });
      }
      const m = ruta.match(/^\/creditos\/(\d+)\/abonos$/);
      if (req.method === 'POST' && m) {
        const c = st.creditos.find((x) => x.id_credito === Number(m[1]));
        c.saldo_pendiente -= body.monto; if (c.saldo_pendiente === 0) c.estado = 'pagado';
        return send(201, {});
      }
      if (req.method === 'GET' && ruta === '/creditos') {
        st.creditos.forEach((c) => { if (c.estado === 'vigente' && c.fecha < hoyBogota()) c.estado = 'vencido'; });
        return send(200, st.creditos.map((c) => ({ id_credito: c.id_credito, saldo_pendiente: c.saldo_pendiente, estado: c.estado })));
      }
      return send(404, { error: req.method + ' ' + ruta });
    });
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ srv, st, base: `http://127.0.0.1:${srv.address().port}/api` })));
}

test('el cargador deja la tienda idéntica al dataset y entrega credenciales y respuestas', async () => {
  const { srv, st, base } = await servidorFalso();
  try {
    const hoy = hoyBogota();
    const r = await cargar({ base, variante: 'A', hoy });
    const d = construir('A', hoy);
    assert.equal(st.clientes.length, 12);
    assert.equal(st.creditos.length, FIADOS.length);
    assert.match(r.tienda.email, /^cmp\.a\.\d+@test\.fiadocheck\.com$/);
    assert.equal(r.tareas.T3.respuesta, st.creditos.filter((c) => c.estado !== 'pagado').reduce((s, c) => s + c.saldo_pendiente, 0));
    assert.equal(st.creditos.filter((c) => c.estado === 'vencido').length, d.fiados.filter((f) => f.vencido).length);
  } finally { srv.close(); }
});

test('el cargador se niega a entregar una tienda que no coincide con el dataset', async () => {
  const { srv, base } = await servidorFalso();
  try {
    // Un "hoy" distinto al de la fecha de pago hace que el servidor falso marque otros vencidos.
    await assert.rejects(() => cargar({ base, variante: 'A', hoy: '2030-01-01' }), /no quedó como el dataset/);
  } finally { srv.close(); }
});

// ── análisis ──────────────────────────────────────────────────────────────────
const fila = (p, orden, variante, cond, tarea, t, ok = 1) => `${p},${orden},${variante},${cond},${tarea},${t},${ok},`;
function csvSintetico(participantes) {
  // participantes: { P1: { manual: [t1..t6], sistema: [t1..t6], okManual: [...], okSistema: [...] } }
  const l = ['participante,orden,variante,condicion,tarea,tiempo_s,correcta,observaciones'];
  Object.entries(participantes).forEach(([p, d], i) => {
    const [vm, vs] = i % 2 ? ['B', 'A'] : ['A', 'B'];
    TAREAS.forEach((t, k) => {
      l.push(fila(p, 1, vm, 'manual', t, d.manual[k], d.okManual ? d.okManual[k] : 1));
      l.push(fila(p, 2, vs, 'sistema', t, d.sistema[k], d.okSistema ? d.okSistema[k] : 1));
    });
  });
  return l.join('\n');
}

test('mediana y prueba de signos', () => {
  assert.equal(mediana([5, 1, 3]), 3);
  assert.equal(mediana([4, 1, 3, 2]), 2.5);
  assert.equal(pSignos(5, 5), 1 / 32);
  assert.equal(pSignos(0, 4), 1);
  assert.equal(pSignos(3, 4), 5 / 16);
});

test('el análisis calcula medianas, razón, reducción y dictamen con datos conocidos', () => {
  const csv = csvSintetico({
    P1: { manual: [60, 120, 100, 90, 80, 70], sistema: [20, 15, 10, 40, 30, 20] },
    P2: { manual: [80, 140, 120, 100, 90, 60], sistema: [30, 25, 20, 50, 35, 25] },
    P3: { manual: [70, 130, 110, 95, 85, 65], sistema: [25, 20, 15, 45, 32, 22] },
  });
  const filas = leerCsv(csv);
  assert.deepEqual(validar(filas), []);
  const r = analizar(filas);
  const t1 = r.porTarea[0];
  assert.equal(t1.medianaManual, 70);
  assert.equal(t1.medianaSistema, 25);
  assert.equal(t1.diferencia, 45);
  assert.ok(Math.abs(t1.razon - 2.8) < 1e-9);
  assert.ok(Math.abs(t1.reduccionPct - (45 / 70) * 100) < 1e-9);
  assert.equal(t1.aFavor, 3);
  assert.equal(r.tareasFavorables, 6);
  // Totales manuales: P1 520, P2 590, P3 555 → mediana 555. Totales con sistema: 135, 185, 159 → 159.
  assert.equal(r.total.medianaManual, 555);
  assert.equal(r.total.medianaSistema, 159);
  assert.equal(r.total.aFavor, 3);
});

test('una tarea no favorece al sistema si este acierta menos que el método manual', () => {
  const base = { manual: [60, 120, 100, 90, 80, 70], sistema: [20, 15, 10, 40, 30, 20] };
  const csv = csvSintetico({
    P1: { ...base, okManual: [1, 1, 1, 1, 1, 1], okSistema: [0, 1, 1, 1, 1, 1] },
    P2: { ...base, okManual: [1, 1, 1, 1, 1, 1], okSistema: [1, 1, 1, 1, 1, 1] },
  });
  const r = analizar(leerCsv(csv));
  assert.equal(r.porTarea[0].favorece, false, 'T1: el sistema es más rápido pero falló una vez');
  assert.equal(r.tareasFavorables, 5);
  assert.equal(r.cumple, true, '5 de 6 y el total favorecen: cumple el criterio de 4 de 6');
});

test('el criterio no se cumple si el sistema no gana en al menos 4 tareas', () => {
  const lento = { manual: [10, 10, 10, 10, 100, 100], sistema: [50, 50, 50, 50, 20, 20] };
  const r = analizar(leerCsv(csvSintetico({ P1: lento, P2: lento })));
  assert.equal(r.tareasFavorables, 2);
  assert.equal(r.cumple, false);
});

test('las mediciones inválidas se rechazan con un mensaje claro', () => {
  const buenas = csvSintetico({ P1: { manual: [1, 2, 3, 4, 5, 6], sistema: [1, 1, 1, 1, 1, 1] } });
  // falta una tarea
  const sinT6 = buenas.split('\n').filter((l) => !l.startsWith('P1,1,A,manual,T6')).join('\n');
  assert.match(validar(leerCsv(sinT6)).join(' '), /no tiene T6 en la condición manual/);
  // tiempo no numérico
  assert.match(validar(leerCsv(buenas.replace('P1,1,A,manual,T1,1', 'P1,1,A,manual,T1,abc'))).join(' '), /tiempo_s/);
  // misma variante en las dos condiciones
  assert.match(validar(leerCsv(buenas.replace(/,B,sistema/g, ',A,sistema'))).join(' '), /misma variante/);
  // fila repetida
  assert.match(validar(leerCsv(buenas + '\n' + fila('P1', 1, 'A', 'manual', 'T1', 9))).join(' '), /ya tiene T1/);
  // condición mal escrita
  assert.match(validar(leerCsv(buenas.replace(',manual,T2', ',Manual,T2'))).join(' '), /condicion/);
});

test('con menos de 6 participantes el informe avisa que es solo descriptivo', () => {
  const csv = csvSintetico({ P1: { manual: [60, 60, 60, 60, 60, 60], sistema: [20, 20, 20, 20, 20, 20] } });
  const md = informe(analizar(leerCsv(csv)));
  assert.match(md, /solo descriptivo/);
  assert.match(md, /Resultado: la variable de optimización de tiempos queda favorecida/);
});
