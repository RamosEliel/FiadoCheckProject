/**
 * Utilidades de fecha sin ambigüedad de zona horaria.
 * Compara y normaliza a YYYY-MM-DD (calendario).
 */

// El calendario que importa es el del negocio (Colombia), no el del servidor.
// El proceso de desarrollo corre en UTC-5 y Azure App Service en UTC, así que
// "hoy" cambiaba según dónde estuviera desplegado: entre las 19:00 y las 23:59
// de Bogotá un servidor en UTC ya está en el día siguiente. Eso hacía que el
// mismo abono se aceptara en un entorno y se rechazara en el otro.
const ZONA_NEGOCIO = process.env.TZ_NEGOCIO || 'America/Bogota';

// 'en-CA' formatea como YYYY-MM-DD, que es justo la clave que se compara.
const crearFormateador = (zona) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

let formateador;
try {
  formateador = crearFormateador(ZONA_NEGOCIO);
} catch {
  // Una zona mal escrita en TZ_NEGOCIO lanza RangeError y tumbaría el arranque.
  console.warn(`[dateUtils] TZ_NEGOCIO inválida ("${ZONA_NEGOCIO}"), se usa America/Bogota.`);
  formateador = crearFormateador('America/Bogota');
}

const toDateKey = (value) => {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.\d+)?Z?$/.test(value)) {
      return value.slice(0, 10);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return formateador.format(parsed);
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;

  // DATE de PostgreSQL: medianoche local del proceso (cualquier TZ).
  if (
    value.getHours() === 0 &&
    value.getMinutes() === 0 &&
    value.getSeconds() === 0 &&
    value.getMilliseconds() === 0
  ) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return formateador.format(value);
};

// Día de hoy en la zona del negocio, independiente de dónde corra el proceso.
const todayBusinessKey = () => formateador.format(new Date());

const calendarDaysBetween = (fromKey, toKey) => {
  if (!fromKey || !toKey) return 0;
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
};

const diasAtraso = (fechaLimite) => {
  const limite = toDateKey(fechaLimite);
  if (!limite) return 0;
  return Math.max(0, calendarDaysBetween(limite, todayBusinessKey()));
};

module.exports = { toDateKey, todayBusinessKey, calendarDaysBetween, diasAtraso };
