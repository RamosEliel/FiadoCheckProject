/**
 * Genera los materiales en papel de la prueba comparativa OTG-COMP-01 a partir
 * del mismo dataset que carga `cargar_tienda.js`:
 *
 *   libreta_<V>.md    la libreta de referencia que usa el participante en la
 *                     condición manual: una página por cliente, con los fiados y
 *                     abonos anotados como los escribiría un tendero, SIN saldos
 *                     calculados (recalcular es parte del trabajo manual).
 *   tarjetas_<V>.md   el guion que lee el facilitador, tarea por tarea.
 *   respuestas_<V>.md hoja del facilitador con la respuesta correcta de cada tarea.
 *                     No se le muestra al participante.
 *
 * Uso:
 *   node scripts/comparativa/generar_libreta.js --variante A
 *   node scripts/comparativa/generar_libreta.js --variante B --salida ./otra_carpeta
 *
 * Imprimir y cargar la tienda EL MISMO DÍA de la sesión: las fechas de pago son
 * relativas a ese día.
 */

const fs = require('fs');
const path = require('path');
const { construir, enPesos, hoyBogota } = require('./dataset');

const fechaLarga = (clave) => {
  const [y, m, d] = clave.split('-');
  return `${d}/${m}/${y}`;
};

function renderLibreta(datos) {
  const out = [];
  out.push(`# Libreta de fiados — tienda ${datos.variante}`);
  out.push('');
  out.push(`Día de la sesión: ${fechaLarga(datos.hoy)}`);
  out.push('');
  out.push('Una página por cliente, en el orden en que se fueron anotando. Cada fiado dice la fecha en que se');
  out.push('quedó de pagar; cada abono, lo que ya entregó el cliente. Los saldos no están calculados.');
  out.push('');

  const porCliente = [...datos.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  for (const c of porCliente) {
    out.push('---');
    out.push('');
    out.push(`## ${c.nombre}`);
    out.push(`Cédula ${c.cedula} · Cel. ${c.telefono}`);
    out.push('');
    const suyos = datos.fiados.filter((f) => f.indice === c.indice);
    if (suyos.length === 0) {
      out.push('_(sin anotaciones)_');
    }
    suyos.forEach((f, i) => {
      out.push(`- **Fiado ${i + 1}:** ${enPesos(f.monto)} — pagar el ${fechaLarga(f.fechaPago)}`);
      f.abonos.forEach((a) => out.push(`  - Abono: ${enPesos(a)}`));
    });
    out.push('');
  }
  return out.join('\n') + '\n';
}

function renderTarjetas(datos) {
  const t = datos.tareas;
  const out = [];
  out.push(`# Tarjetas de tareas — variante ${datos.variante}`);
  out.push('');
  out.push('Leer cada escenario tal como está escrito, sin parafrasear ni sugerir el camino. Cronómetro: arranca');
  out.push('cuando el participante empieza a actuar y se detiene cuando entrega la respuesta o termina de anotar.');
  out.push('Las tareas se hacen siempre en este orden: las tres de consulta primero, las tres de escritura después.');
  out.push('');
  out.push(`**T1 · Consulta de deuda.** «${t.T1.cliente.nombre} le pregunta cuánto debe en total. Averígüelo y dígamelo.»`);
  out.push('');
  out.push('**T2 · Identificar morosos.** «Dígame qué clientes están hoy en mora —con fecha de pago ya vencida y que todavía deben algo— y cuánto suman esas deudas vencidas.»');
  out.push('');
  out.push('**T3 · Total de la cartera.** «¿Cuánto le deben en total en la tienda, sumando todos los clientes?»');
  out.push('');
  out.push(`**T4 · Registrar cliente nuevo.** «Llega ${t.T4.cliente.nombre}, cédula ${t.T4.cliente.cedula}, teléfono ${t.T4.cliente.telefono}. Regístrelo.»`);
  out.push('');
  out.push(`**T5 · Otorgar un fiado.** «${t.T5.cliente.nombre} le pide fiado por ${enPesos(t.T5.monto)} para pagar en 15 días. Decida si se lo da y regístrelo.»`);
  out.push('');
  out.push(`**T6 · Registrar un abono.** «${t.T6.cliente.nombre} le abona ${enPesos(t.T6.abono)}. Regístrelo y dígame cuánto queda debiendo.»`);
  out.push('');
  return out.join('\n') + '\n';
}

function renderRespuestas(datos) {
  const t = datos.tareas;
  const out = [];
  out.push(`# Hoja del facilitador — variante ${datos.variante}  (NO mostrar al participante)`);
  out.push('');
  out.push(`Día de la sesión: ${fechaLarga(datos.hoy)}`);
  out.push('');
  out.push('| Tarea | Respuesta correcta |');
  out.push('|---|---|');
  out.push(`| T1 · deuda de ${t.T1.cliente.nombre} | ${enPesos(t.T1.respuesta)} |`);
  out.push(`| T2 · morosos | ${t.T2.respuesta.clientes.join('; ')} — total vencido ${enPesos(t.T2.respuesta.total)} |`);
  out.push(`| T3 · total de la cartera | ${enPesos(t.T3.respuesta)} |`);
  out.push(`| T4 · cliente nuevo | Registrado: ${t.T4.cliente.nombre}, cédula ${t.T4.cliente.cedula}, tel. ${t.T4.cliente.telefono} (sin errores en los tres datos) |`);
  out.push(`| T5 · fiado a ${t.T5.cliente.nombre} | Registrado por ${enPesos(t.T5.respuesta)}, con plazo de 15 días |`);
  out.push(`| T6 · abono de ${enPesos(t.T6.abono)} a ${t.T6.cliente.nombre} | Registrado; saldo que queda: ${enPesos(t.T6.respuesta)} |`);
  out.push('');
  out.push('Criterio de «correcta»: T1, T3 y T6 por cifra exacta; T2 si la lista de clientes coincide y el total es exacto;');
  out.push('T4, T5 y T6 (registro) si lo anotado coincide con lo dictado.');
  out.push('');
  out.push('## Detalle de los fiados (para resolver dudas)');
  out.push('');
  out.push('| # | Cliente | Monto | Abonos | Saldo | Fecha de pago | ¿En mora? |');
  out.push('|---|---|---:|---:|---:|---|---|');
  datos.fiados.forEach((f) => {
    out.push(`| ${f.n} | ${f.cliente.nombre} | ${enPesos(f.monto)} | ${f.abonos.map(enPesos).join(' + ') || '—'} | ${enPesos(f.saldo)} | ${fechaLarga(f.fechaPago)} | ${f.vencido ? 'sí' : 'no'} |`);
  });
  out.push('');
  return out.join('\n') + '\n';
}

function escribir(variante, salida, hoy = hoyBogota()) {
  const datos = construir(variante, hoy);
  fs.mkdirSync(salida, { recursive: true });
  const archivos = {
    [`libreta_${variante}.md`]: renderLibreta(datos),
    [`tarjetas_${variante}.md`]: renderTarjetas(datos),
    [`respuestas_${variante}.md`]: renderRespuestas(datos),
  };
  for (const [nombre, contenido] of Object.entries(archivos)) {
    fs.writeFileSync(path.join(salida, nombre), contenido, 'utf8');
  }
  return Object.keys(archivos).map((n) => path.join(salida, n));
}

module.exports = { renderLibreta, renderTarjetas, renderRespuestas, escribir };

if (require.main === module) {
  const arg = (k, def) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : def; };
  const variante = (arg('--variante') || '').toUpperCase();
  if (!['A', 'B'].includes(variante)) {
    console.error('Uso: node scripts/comparativa/generar_libreta.js --variante A|B [--salida carpeta]');
    process.exit(1);
  }
  const salida = arg('--salida', path.join(__dirname, 'salida'));
  escribir(variante, salida).forEach((f) => console.log('  escrito', f));
}
