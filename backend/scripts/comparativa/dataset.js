/**
 * Datos de la prueba comparativa OTG-COMP-01: proceso manual (libreta) frente a
 * proceso con FiadoCheck, para las mismas tareas de gestión de deudas.
 *
 * Para que las dos condiciones sean comparables se usa EXACTAMENTE la misma
 * información en la libreta de papel y en la tienda del sistema. Como cada
 * participante hace las seis tareas dos veces (una por condición), y recordaría
 * las respuestas, existen dos variantes equivalentes de la tienda, A y B: misma
 * estructura (12 clientes, mismos fiados, mismas moras, mismos plazos) con otros
 * nombres y otros montos. La variante que va con cada condición se rota entre
 * participantes (ver README).
 *
 * Todo es determinista: el mismo día genera los mismos datos. Las fechas de pago
 * se expresan como desfase en días respecto del día de la sesión; por eso la
 * libreta se imprime y la tienda se carga EL MISMO DÍA en que se hace la sesión.
 */

// Cada fiado: [índice del cliente, monto, días hasta la fecha de pago (negativo = ya
// pasó), abonos ya hechos]. La estructura es común a las dos variantes.
const FIADOS = [
  [0, 45000, 8, []],
  [0, 30000, -3, [10000]],
  [1, 120000, 12, [40000]],
  [2, 60000, -12, []],
  [3, 25000, 3, []],
  [3, 35000, 9, []],
  [3, 18000, -1, []],
  [4, 90000, 15, [30000, 20000]],
  [5, 52000, -20, [12000]],
  [6, 75000, 6, []],
  [7, 38000, 10, []],
  [7, 22000, 2, []],
  [8, 110000, -8, [60000]],
  [9, 15000, 5, []],
  [10, 64000, 14, [14000]],
  [11, 20000, 7, [20000]], // saldado: el cliente 11 tiene historial pero no debe nada
];

// Variante B: mismos plazos y misma estructura; montos al 120 % redondeados al millar.
const escalar = (x) => Math.round((x * 1.2) / 1000) * 1000;

const VARIANTES = {
  A: {
    escala: (x) => x,
    clientes: [
      ['Luz Marina Pérez', '3105550101'], ['Carlos Andrés Gómez', '3105550102'],
      ['Rosa Elena Castro', '3105550103'], ['Jhon Fredy Ramírez', '3105550104'],
      ['Yolanda Torres', '3105550105'], ['Edwin Martínez', '3105550106'],
      ['Beatriz Vargas', '3105550107'], ['Hernán Díaz', '3105550108'],
      ['Gloria Patricia Ruiz', '3105550109'], ['Wilson Cárdenas', '3105550110'],
      ['Sandra Milena Ortiz', '3105550111'], ['Néstor Jiménez', '3105550112'],
    ],
    nuevoCliente: { nombre: 'Marta Lucía Rojas', cedula: '1002003004', telefono: '3001112233' },
    nuevoFiado: { montoBase: 50000 },
    abono: { montoBase: 25000 },
  },
  B: {
    escala: escalar,
    clientes: [
      ['Aura Cecilia Mora', '3115550201'], ['Fabio Alonso Peña', '3115550202'],
      ['Marleny Suárez', '3115550203'], ['Deivis Carrillo', '3115550204'],
      ['Nubia Estela Rincón', '3115550205'], ['Oscar Iván Medina', '3115550206'],
      ['Clemencia Ayala', '3115550207'], ['Reinaldo Soto', '3115550208'],
      ['Esperanza Duarte', '3115550209'], ['Mauricio Barrera', '3115550210'],
      ['Liliana Quintero', '3115550211'], ['Gustavo Páez', '3115550212'],
    ],
    nuevoCliente: { nombre: 'Julián David Herrera', cedula: '1005006007', telefono: '3014445566' },
    nuevoFiado: { montoBase: 50000 },
    abono: { montoBase: 25000 },
  },
};

// Índices fijos de los clientes que intervienen en las tareas de escritura y consulta.
const OBJETIVOS = {
  consulta: 3, // cliente con tres fiados: ¿cuánto debe?
  fiar: 11, // cliente con historial cerrado y sin deuda: pide fiado
  abonar: 8, // cliente en mora con abono previo: paga una parte
};

function sumarDias(clave, n) {
  const [y, m, d] = clave.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const hoyBogota = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

const enPesos = (n) => '$' + Math.round(n).toLocaleString('es-CO');

/**
 * Construye una variante para un día dado.
 * @param {'A'|'B'} variante
 * @param {string} hoy  AAAA-MM-DD, día de la sesión en Colombia
 */
function construir(variante, hoy = hoyBogota()) {
  const v = VARIANTES[variante];
  if (!v) throw new Error(`Variante desconocida: ${variante}`);

  // La cédula de cada cliente cambia por variante para que A y B puedan convivir
  // en la base sin chocar.
  const base = variante === 'A' ? 810000000 : 820000000;
  const clientes = v.clientes.map(([nombre, telefono], i) => ({
    indice: i, nombre, telefono, cedula: String(base + i + 1),
  }));

  const fiados = FIADOS.map(([ic, monto, desfase, abonos], n) => {
    const m = v.escala(monto);
    const ab = abonos.map(v.escala);
    const saldo = m - ab.reduce((s, x) => s + x, 0);
    return {
      n: n + 1, indice: ic, cliente: clientes[ic], monto: m, abonos: ab, saldo,
      desfase, fechaPago: sumarDias(hoy, desfase),
      vencido: saldo > 0 && desfase < 0,
      abierto: saldo > 0,
    };
  });

  const abiertos = fiados.filter((f) => f.abierto);
  const deudaDe = (i) => abiertos.filter((f) => f.indice === i).reduce((s, f) => s + f.saldo, 0);

  const morosos = clientes
    .map((c) => ({
      cliente: c,
      saldoVencido: fiados.filter((f) => f.indice === c.indice && f.vencido).reduce((s, f) => s + f.saldo, 0),
    }))
    .filter((x) => x.saldoVencido > 0);

  const nuevoFiado = v.escala(v.nuevoFiado.montoBase);
  const abono = v.escala(v.abono.montoBase);
  const clienteAbono = clientes[OBJETIVOS.abonar];
  const saldoAntesAbono = deudaDe(OBJETIVOS.abonar);

  return {
    variante, hoy, clientes, fiados,
    nuevoCliente: v.nuevoCliente,
    tareas: {
      T1: { descripcion: 'Consultar cuánto debe un cliente', cliente: clientes[OBJETIVOS.consulta],
        respuesta: deudaDe(OBJETIVOS.consulta) },
      T2: { descripcion: 'Identificar qué clientes están en mora hoy y cuánto suman',
        respuesta: { clientes: morosos.map((x) => x.cliente.nombre).sort(), total: morosos.reduce((s, x) => s + x.saldoVencido, 0) } },
      T3: { descripcion: 'Saber cuánto le deben en total en la tienda',
        respuesta: abiertos.reduce((s, f) => s + f.saldo, 0) },
      T4: { descripcion: 'Registrar un cliente nuevo', cliente: v.nuevoCliente },
      T5: { descripcion: 'Otorgar un fiado a un cliente con historial', cliente: clientes[OBJETIVOS.fiar], monto: nuevoFiado,
        respuesta: nuevoFiado },
      T6: { descripcion: 'Registrar un abono y decir cuánto queda debiendo el cliente', cliente: clienteAbono, abono,
        respuesta: saldoAntesAbono - abono },
    },
    // Estado esperado de toda la cartera después de las tres tareas de escritura.
    totalDespuesDeEscribir: abiertos.reduce((s, f) => s + f.saldo, 0) + nuevoFiado - abono,
  };
}

module.exports = { FIADOS, VARIANTES, OBJETIVOS, construir, sumarDias, hoyBogota, enPesos };
