const ZONA_NEGOCIO = 'America/Bogota';

const formateador = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_NEGOCIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayBusinessKey(): string {
  return formateador.format(new Date());
}

export function toDateKey(value: string | Date | null | undefined): string | null {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    // Columna DATE o clave de negocio: el día ya está en calendario.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // DATE serializada como medianoche (con o sin Z / millis).
    if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.\d+)?Z?$/.test(value)) {
      return value.slice(0, 10);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return formateador.format(parsed);
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return formateador.format(value);
}

export function dateFromKey(key: string): Date | null {
  const parsed = toDateKey(key);
  if (!parsed) return null;
  const [y, m, d] = parsed.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function keyFromLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfWeekKey(hoy = todayBusinessKey()): string {
  const d = dateFromKey(hoy);
  if (!d) return hoy;
  const dow = d.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - offset);
  return keyFromLocalDate(d);
}

export function startOfMonthKey(hoy = todayBusinessKey()): string {
  return `${hoy.slice(0, 8)}01`;
}

export function calendarDaysBetween(fromKey: string, toKey: string): number {
  const from = dateFromKey(fromKey);
  const to = dateFromKey(toKey);
  if (!from || !to) return 0;
  return Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
    Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000);
}

export function formatFechaUI(value: string | Date | null | undefined): string {
  const key = toDateKey(value);
  const date = key ? dateFromKey(key) : null;
  if (!date) return '—';
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function diasAtraso(fechaLimite: string | Date | null | undefined): number {
  const limite = toDateKey(fechaLimite);
  if (!limite) return 0;
  return Math.max(0, calendarDaysBetween(limite, todayBusinessKey()));
}
