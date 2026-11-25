/**
 * Análisis de la prueba comparativa OTG-COMP-01: tiempo del proceso manual
 * (libreta) frente al tiempo del proceso con FiadoCheck, en las mismas tareas.
 *
 * Entrada: un CSV con una fila por participante, condición y tarea
 * (ver plantilla_mediciones.csv):
 *
 *   participante,orden,variante,condicion,tarea,tiempo_s,correcta,observaciones
 *
 * Reglas del diseño que este script comprueba antes de calcular nada:
 *   - cada participante tiene las 6 tareas en las DOS condiciones (diseño pareado);
 *   - tiempo_s es un número positivo y correcta es 0 o 1;
 *   - ningún participante repite una variante de tienda en las dos condiciones.
 *
 * Qué calcula (todo descriptivo, nada se promedia):
 *   - por tarea: mediana manual, mediana con sistema, diferencia de medianas,
 *     razón manual/sistema, reducción porcentual de la mediana, participantes a
 *     favor del sistema, aciertos de cada condición;
 *   - por participante: tiempo total de las 6 tareas en cada condición;
 *   - prueba de signos exacta (unilateral) sobre las diferencias pareadas, como
 *     dato REFERENCIAL: con pocos participantes casi nunca puede ser concluyente.
 *
 * Criterio de cumplimiento (se declara ANTES de ejecutar la prueba):
 *   una tarea favorece al sistema si su mediana es menor que la manual y sus
 *   aciertos no son menos que los manuales. La variable «optimización de tiempos»
 *   se considera favorecida si favorecen al sistema al menos 4 de las 6 tareas
 *   y además la mediana del tiempo total.
 *
 * Uso:
 *   node scripts/comparativa/analizar.js mediciones.csv [--salida resultados.md]
 */

const fs = require('fs');

const TAREAS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const NOMBRES = {
  T1: 'Consultar la deuda de un cliente',
  T2: 'Identificar los clientes en mora',
  T3: 'Saber el total de la cartera',
  T4: 'Registrar un cliente nuevo',
  T5: 'Otorgar un fiado',
  T6: 'Registrar un abono',
};
const MINIMO_TAREAS_FAVORABLES = 4;

function mediana(valores) {
  const v = [...valores].sort((a, b) => a - b);
  if (v.length === 0) return NaN;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** P(X >= k) con X ~ Binomial(n, 1/2): prueba de signos unilateral exacta. */
function pSignos(k, n) {
  if (n === 0) return NaN;
  let c = 1, suma = 0;
  for (let i = 0; i <= n; i++) {
    if (i > 0) c = (c * (n - i + 1)) / i;
    if (i >= k) suma += c;
  }
  return suma / 2 ** n;
}

function leerCsv(texto) {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));
  const [cab, ...filas] = lineas;
  const cols = cab.split(',').map((c) => c.trim());
  return filas.map((l, i) => {
    const partes = l.split(',');
    const f = {};
    cols.forEach((c, j) => { f[c] = (partes[j] ?? '').trim(); });
    f._linea = i + 2;
    return f;
  });
}

function validar(filas) {
  const errores = [];
  const requeridas = ['participante', 'orden', 'variante', 'condicion', 'tarea', 'tiempo_s', 'correcta'];
  if (filas.length === 0) return ['El CSV no tiene mediciones.'];
  requeridas.forEach((c) => { if (!(c in filas[0])) errores.push(`Falta la columna «${c}».`); });
  if (errores.length) return errores;

  const celdas = new Map();
  for (const f of filas) {
    const donde = `línea ${f._linea}`;
    if (!['manual', 'sistema'].includes(f.condicion)) errores.push(`${donde}: condicion «${f.condicion}» debe ser manual o sistema.`);
    if (!TAREAS.includes(f.tarea)) errores.push(`${donde}: tarea «${f.tarea}» debe ser T1 a T6.`);
    if (!['A', 'B'].includes(f.variante)) errores.push(`${donde}: variante «${f.variante}» debe ser A o B.`);
    const t = Number(f.tiempo_s);
    if (!(t > 0) || Number.isNaN(t)) errores.push(`${donde}: tiempo_s «${f.tiempo_s}» debe ser un número mayor que 0.`);
    if (!['0', '1'].includes(f.correcta)) errores.push(`${donde}: correcta «${f.correcta}» debe ser 0 o 1.`);
    const clave = [f.participante, f.condicion, f.tarea].join('|');
    if (celdas.has(clave)) errores.push(`${donde}: ${f.participante} ya tiene ${f.tarea} en ${f.condicion} (línea ${celdas.get(clave)}).`);
    celdas.set(clave, f._linea);
  }

  const participantes = [...new Set(filas.map((f) => f.participante))];
  for (const p of participantes) {
    for (const cond of ['manual', 'sistema']) {
      const faltan = TAREAS.filter((t) => !celdas.has([p, cond, t].join('|')));
      if (faltan.length) errores.push(`${p} no tiene ${faltan.join(', ')} en la condición ${cond}: el diseño pareado exige las 6 en ambas.`);
    }
    const vm = new Set(filas.filter((f) => f.participante === p && f.condicion === 'manual').map((f) => f.variante));
    const vs = new Set(filas.filter((f) => f.participante === p && f.condicion === 'sistema').map((f) => f.variante));
    if (vm.size > 1 || vs.size > 1) errores.push(`${p} usó más de una variante de tienda dentro de una misma condición.`);
    if (vm.size === 1 && vs.size === 1 && [...vm][0] === [...vs][0]) errores.push(`${p} usó la misma variante en las dos condiciones: recordaría las respuestas.`);
  }
  return errores;
}

function analizar(filas) {
  const participantes = [...new Set(filas.map((f) => f.participante))].sort();
  const get = (p, cond, t) => filas.find((f) => f.participante === p && f.condicion === cond && f.tarea === t);

  const porTarea = TAREAS.map((t) => {
    const man = participantes.map((p) => Number(get(p, 'manual', t).tiempo_s));
    const sis = participantes.map((p) => Number(get(p, 'sistema', t).tiempo_s));
    const dif = man.map((x, i) => x - sis[i]);
    const aFavor = dif.filter((d) => d > 0).length;
    const empates = dif.filter((d) => d === 0).length;
    const aciertosManual = participantes.filter((p) => get(p, 'manual', t).correcta === '1').length;
    const aciertosSistema = participantes.filter((p) => get(p, 'sistema', t).correcta === '1').length;
    const mMan = mediana(man), mSis = mediana(sis);
    return {
      tarea: t, nombre: NOMBRES[t], n: participantes.length,
      medianaManual: mMan, medianaSistema: mSis, diferencia: mMan - mSis,
      razon: mMan / mSis, reduccionPct: ((mMan - mSis) / mMan) * 100,
      aFavor, empates, p: pSignos(aFavor, participantes.length - empates),
      aciertosManual, aciertosSistema,
      favorece: mSis < mMan && aciertosSistema >= aciertosManual,
    };
  });

  const totales = participantes.map((p) => ({
    participante: p,
    manual: TAREAS.reduce((s, t) => s + Number(get(p, 'manual', t).tiempo_s), 0),
    sistema: TAREAS.reduce((s, t) => s + Number(get(p, 'sistema', t).tiempo_s), 0),
  }));
  const mMan = mediana(totales.map((x) => x.manual));
  const mSis = mediana(totales.map((x) => x.sistema));
  const aFavor = totales.filter((x) => x.manual > x.sistema).length;
  const empates = totales.filter((x) => x.manual === x.sistema).length;
  const total = {
    medianaManual: mMan, medianaSistema: mSis, diferencia: mMan - mSis, razon: mMan / mSis,
    reduccionPct: ((mMan - mSis) / mMan) * 100, aFavor, empates, n: participantes.length,
    p: pSignos(aFavor, participantes.length - empates), favorece: mSis < mMan,
  };

  const tareasFavorables = porTarea.filter((x) => x.favorece).length;
  return {
    participantes, porTarea, totales, total, tareasFavorables,
    cumple: tareasFavorables >= MINIMO_TAREAS_FAVORABLES && total.favorece,
  };
}

const seg = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—');
const pct = (x) => (Number.isFinite(x) ? x.toFixed(1) + ' %' : '—');
const razon = (x) => (Number.isFinite(x) ? x.toFixed(2) + '×' : '—');
const pval = (x) => (Number.isFinite(x) ? x.toFixed(3) : '—');

function informe(r) {
  const n = r.participantes.length;
  const o = [];
  o.push('# Prueba comparativa OTG-COMP-01 — proceso manual frente a FiadoCheck');
  o.push('');
  o.push(`Participantes: ${n} (${r.participantes.join(', ')}). Diseño pareado: cada uno hizo las seis tareas en las dos condiciones.`);
  if (n < 6) {
    o.push('');
    o.push(`> **Con ${n} participantes el análisis es solo descriptivo.** La prueba de signos más favorable posible con ${n} pares da p = ${pval(pSignos(n, n))}; ` +
      'no se debe presentar como evidencia estadística, sino como la descripción de lo que ocurrió con esas personas.');
  }
  o.push('');
  o.push('## Tiempo por tarea (segundos, mediana)');
  o.push('');
  o.push('| Tarea | Manual | Sistema | Diferencia | Manual/Sistema | Reducción | A favor del sistema | Aciertos manual | Aciertos sistema | Favorece |');
  o.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|');
  r.porTarea.forEach((x) => o.push(
    `| ${x.tarea} · ${x.nombre} | ${seg(x.medianaManual)} | ${seg(x.medianaSistema)} | ${seg(x.diferencia)} | ${razon(x.razon)} | ${pct(x.reduccionPct)} | ${x.aFavor}/${x.n} | ${x.aciertosManual}/${x.n} | ${x.aciertosSistema}/${x.n} | ${x.favorece ? 'sí' : 'no'} |`));
  o.push('');
  o.push('## Tiempo total del proceso (las seis tareas)');
  o.push('');
  o.push('| Participante | Manual (s) | Sistema (s) | Diferencia (s) |');
  o.push('|---|---:|---:|---:|');
  r.totales.forEach((x) => o.push(`| ${x.participante} | ${seg(x.manual)} | ${seg(x.sistema)} | ${seg(x.manual - x.sistema)} |`));
  o.push(`| **Mediana** | ${seg(r.total.medianaManual)} | ${seg(r.total.medianaSistema)} | ${seg(r.total.diferencia)} |`);
  o.push('');
  o.push(`Reducción de la mediana del total: **${pct(r.total.reduccionPct)}** (manual/sistema = ${razon(r.total.razon)}). ` +
    `A favor del sistema: ${r.total.aFavor} de ${r.total.n} participantes; prueba de signos unilateral (referencial) p = ${pval(r.total.p)}.`);
  o.push('');
  o.push('## Dictamen');
  o.push('');
  o.push(`Tareas que favorecen al sistema: **${r.tareasFavorables} de 6** (mínimo exigido: ${MINIMO_TAREAS_FAVORABLES}). ` +
    `Mediana del total a favor del sistema: **${r.total.favorece ? 'sí' : 'no'}**.`);
  o.push('');
  o.push(`**Resultado: ${r.cumple ? 'la variable de optimización de tiempos queda favorecida' : 'no se cumple el criterio de optimización de tiempos'}.**`);
  o.push('');
  o.push('Una tarea favorece al sistema si su mediana es menor que la manual y sus aciertos no son menos que los manuales.');
  o.push('');
  return o.join('\n');
}

module.exports = { mediana, pSignos, leerCsv, validar, analizar, informe, TAREAS };

if (require.main === module) {
  const archivo = process.argv[2];
  if (!archivo) { console.error('Uso: node scripts/comparativa/analizar.js mediciones.csv [--salida resultados.md]'); process.exit(1); }
  const filas = leerCsv(fs.readFileSync(archivo, 'utf8'));
  const errores = validar(filas);
  if (errores.length) {
    console.error('Las mediciones no son válidas:\n  - ' + errores.join('\n  - '));
    process.exit(1);
  }
  const texto = informe(analizar(filas));
  const i = process.argv.indexOf('--salida');
  if (i >= 0) { fs.writeFileSync(process.argv[i + 1], texto, 'utf8'); console.log('  escrito ' + process.argv[i + 1]); }
  else console.log(texto);
}
