import { CONFIG } from '@/config/config';
import { todayBusinessKey, toDateKey } from '@/utils/businessDate';

const API_URL = CONFIG.API_URL;

export type ChatWritePending = {
  tipo?: 'credito' | 'pago' | null;
  monto?: number | null;
  cedula?: string | null;
  nombre?: string | null;
  fecha?: string | null;
  descripcion?: string;
  fechaAbono?: string | null;
};

export type ChatWriteResult = {
  respuesta: string;
  action_executed: 'agregar_credito' | 'agregar_pago' | null;
  refresh: boolean;
  refresh_scope: string[] | null;
  pending: ChatWritePending | null;
};

const STOP_NAME = new Set([
  'credito', 'fiado', 'pago', 'abono', 'cuota', 'pesos', 'cop', 'el', 'la', 'los',
  'las', 'un', 'una', 'unos', 'unas', 'hoy', 'manana', 'vencimiento', 'fecha',
  'cliente', 'cedula', 'monto', 'por', 'para', 'con', 'de', 'del', 'al', 'a',
  'dias', 'dia', 'vence', 'registra', 'registrar', 'anota', 'anotar', 'agrega',
]);

const CONSULTA_RE =
  /^(quien|quienes|cuanto|cuanta|cual|cuales|como|puedo |se puede|mora|resumen|vencid|deuda|scoring|riesgo|lista|mostrar|ver |dime |dame )/i;

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const addDaysKey = (key: string, days: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

const formatCop = (n: number) =>
  `$${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

const parseMonto = (t: string): number | null => {
  const mil = t.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (mil) return Math.round(Number(String(mil[1]).replace(',', '.')) * 1000);

  const dollar = t.match(/\$\s*([\d.]+(?:\,\d{1,2})?)/);
  if (dollar) {
    const n = Number(dollar[1].replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const grouped = t.match(/\b(\d{1,3}(?:\.\d{3})+)(?:\s*(?:pesos|cop))?\b/);
  if (grouped) return Number(grouped[1].replace(/\./g, ''));

  const de = t.match(/\b(?:de|por|monto)\s+(\d{3,9})\b/);
  if (de) return Number(de[1]);

  return null;
};

const parseCedula = (t: string): string | null => {
  const labeled = t.match(/\b(?:cedula|id(?:\s*cliente)?)\s*(\d{6,12})\b/);
  return labeled ? labeled[1] : null;
};

const parseFecha = (t: string, defaultOffsetDays: number | null): string | null => {
  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso && toDateKey(iso[1])) return iso[1];

  const dmy = t.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    let yyyy = dmy[3];
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    const key = `${yyyy}-${mm}-${dd}`;
    if (toDateKey(key)) return key;
  }

  if (/\bhoy\b/.test(t)) return todayBusinessKey();
  if (/\bmanana\b/.test(t)) return addDaysKey(todayBusinessKey(), 1);

  const enDias = t.match(/\ben\s+(\d{1,3})\s+dias\b/);
  if (enDias) return addDaysKey(todayBusinessKey(), Number(enDias[1]));

  if (defaultOffsetDays != null) return addDaysKey(todayBusinessKey(), defaultOffsetDays);
  return null;
};

const parseNombre = (t: string): string | null => {
  const m = t.match(/\b(?:a|de|del cliente|cliente|para)\s+([a-zñ]+(?:\s+[a-zñ]+){0,3})\b/);
  if (!m) return null;
  const tokens = m[1].split(/\s+/).filter((w) => !STOP_NAME.has(w) && !/^\d+$/.test(w));
  if (tokens.length === 0) return null;
  return tokens.join(' ');
};

const parseDescripcion = (t: string): string => {
  const m = t.match(/\b(?:por|descripcion)\s+([^,.]+)$/);
  if (!m) return '';
  const d = m[1].trim();
  if (STOP_NAME.has(fold(d))) return '';
  return d.slice(0, 500);
};

export const detectWriteTipo = (texto: string): 'credito' | 'pago' | null => {
  const t = fold(texto);
  const hasPagoWord = /\b(pago|abono|cuota)\b/.test(t);
  const hasCreditoWord = /\b(credito|fiado)\b/.test(t);
  const hasWriteVerb =
    /\b(registra\w*|agrega\w*|anota\w*|apunta\w*|crea(?:r)?|fiar|fiale|fiame|abona(?:r|le|me)?|abone|paga(?:r|le)?|haz|hacer)\b/.test(t)
    || /\bnuevo\s+(credito|fiado|pago|abono)\b/.test(t);
  const pagoShortcut = /\b(abona(?:le|me)?|abone|pagale)\b/.test(t);
  const creditoShortcut = /\b(fiale|fiame|anotale)\b/.test(t);

  if ((hasPagoWord && hasWriteVerb) || pagoShortcut) return 'pago';
  if ((hasCreditoWord && hasWriteVerb) || creditoShortcut) return 'credito';
  return null;
};

export const isChatConsulta = (texto: string): boolean => {
  const t = fold(texto).replace(/^[¿?\s]+/, '');
  if (CONSULTA_RE.test(t)) return true;
  if (/[?]/.test(texto)) return true;
  return false;
};

const unlabeledNumbers = (t: string): string[] => {
  const withoutLabeled = t
    .replace(/\$\s*[\d.]+(?:\,\d{1,2})?/g, ' ')
    .replace(/\b(?:cedula|id(?:\s*cliente)?)\s*\d{6,12}\b/g, ' ')
    .replace(/\b\d{1,3}(?:\.\d{3})+\b/g, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, ' ');
  return [...withoutLabeled.matchAll(/\b(\d{3,12})\b/g)].map((m) => m[1]);
};

const parseIntent = (texto: string, allowFill: boolean): ChatWritePending | null => {
  const t = fold(texto);
  if (!t) return null;
  if (isChatConsulta(texto)) return null;

  const tipo = detectWriteTipo(texto);
  if (!tipo && !allowFill) return null;

  const parsed: ChatWritePending = {
    tipo,
    monto: parseMonto(t),
    cedula: parseCedula(t),
    nombre: parseNombre(t),
    fecha: parseFecha(t, tipo === 'credito' ? 7 : null),
    descripcion: parseDescripcion(t),
    fechaAbono: tipo === 'pago' ? parseFecha(t, null) || todayBusinessKey() : null,
  };

  const nums = unlabeledNumbers(t).filter((n) => parsed.monto !== Number(n));
  if (!parsed.monto) {
    const comoMonto = nums.find((n) => n.length >= 3 && n.length <= 7);
    if (comoMonto) parsed.monto = Number(comoMonto);
  }
  if (!parsed.cedula) {
    const comoCedula = nums.find(
      (n) => n.length >= 8 && n.length <= 12 && Number(n) !== parsed.monto,
    );
    if (comoCedula) parsed.cedula = comoCedula;
  }

  if (!tipo && allowFill) {
    if (/^\d{6,12}$/.test(t) && !parsed.cedula) parsed.cedula = t;
    if (!parsed.nombre && /^[a-zñ]+(?:\s+[a-zñ]+){0,3}$/.test(t) && !STOP_NAME.has(t)) {
      parsed.nombre = t;
    }
  }

  return parsed;
};

const mergeIntent = (base: ChatWritePending, next: ChatWritePending | null): ChatWritePending => {
  if (!next) return base;
  return {
    tipo: next.tipo || base.tipo,
    monto: next.monto || base.monto,
    cedula: next.cedula || base.cedula,
    nombre: next.nombre || base.nombre,
    fecha: next.fecha || base.fecha,
    descripcion: next.descripcion || base.descripcion,
    fechaAbono: next.fechaAbono || base.fechaAbono,
  };
};

type ClienteResumen = { id_cliente: string; nombre_completo: string };

const resolverCliente = async (
  term: string,
  token: string,
  signal: AbortSignal,
): Promise<{ ok: true; cliente: ClienteResumen } | { ok: false; respuesta: string }> => {
  const res = await fetch(`${API_URL}/clientes?q=${encodeURIComponent(term)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, respuesta: json?.error || 'No se pudo buscar el cliente.' };
  }
  if (!Array.isArray(json) || json.length === 0) {
    return { ok: false, respuesta: `No encontré a "${term}" en tu cartera. Verifica el nombre o la cédula.` };
  }
  if (json.length === 1) {
    return { ok: true, cliente: json[0] };
  }
  const exacto = (json as ClienteResumen[]).find(
    (c) => c.id_cliente === term || fold(c.nombre_completo) === fold(term),
  );
  if (exacto) return { ok: true, cliente: exacto };

  const lista = (json as ClienteResumen[])
    .slice(0, 8)
    .map((c) => `• ${c.nombre_completo} (${c.id_cliente})`)
    .join('\n');
  return { ok: false, respuesta: `Hay varios clientes con "${term}". ¿Cuál?\n${lista}` };
};

const ask = (respuesta: string, pending: ChatWritePending): ChatWriteResult => ({
  respuesta,
  action_executed: null,
  refresh: false,
  refresh_scope: null,
  pending,
});

const done = (
  respuesta: string,
  action: 'agregar_credito' | 'agregar_pago',
  scope: string[],
): ChatWriteResult => ({
  respuesta,
  action_executed: action,
  refresh: true,
  refresh_scope: scope,
  pending: null,
});

/**
 * Intercepta crédito/pago en el chat y llama las APIs del formulario.
 * Devuelve null si el mensaje es una consulta (sigue a n8n).
 */
export async function tryExecuteChatWrite(
  texto: string,
  token: string,
  pending: ChatWritePending | null,
  signal: AbortSignal,
): Promise<ChatWriteResult | null> {
  if (isChatConsulta(texto)) {
    return null;
  }

  const parsed = parseIntent(texto, Boolean(pending));
  if (!parsed && !pending) return null;
  if (!parsed?.tipo && !pending) return null;

  const intent = mergeIntent(pending || { tipo: parsed!.tipo }, parsed);
  if (!intent.tipo) return null;

  if (!intent.monto || intent.monto <= 0) {
    return ask('¿De cuánto es el monto? Escríbelo en pesos, por ejemplo 50000.', intent);
  }
  if (!intent.cedula && !intent.nombre) {
    return ask('¿A qué cliente? Dime el nombre o la cédula.', intent);
  }

  const term = String(intent.cedula || intent.nombre);
  const resolved = await resolverCliente(term, token, signal);
  if (!resolved.ok) {
    const esperaNombre = /varios clientes/i.test(resolved.respuesta);
    return esperaNombre
      ? ask(resolved.respuesta, intent)
      : {
          respuesta: resolved.respuesta,
          action_executed: null,
          refresh: false,
          refresh_scope: null,
          pending: null,
        };
  }

  const cliente = resolved.cliente;

  if (intent.tipo === 'credito') {
    const fechaLimite = intent.fecha || addDaysKey(todayBusinessKey(), 7);
    const res = await fetch(`${API_URL}/creditos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        clienteId: cliente.id_cliente,
        montoTotal: intent.monto,
        fechaLimitePago: fechaLimite,
        descripcion: intent.descripcion || '',
      }),
      signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        respuesta: json.error || 'No se pudo registrar el crédito.',
        action_executed: null,
        refresh: false,
        refresh_scope: null,
        pending: null,
      };
    }
    return done(
      `Listo. Crédito de ${formatCop(intent.monto)} a ${cliente.nombre_completo} (vence ${fechaLimite}). Folio ${json.id_credito}.`,
      'agregar_credito',
      ['clientes', 'dashboard'],
    );
  }

  const resCreditos = await fetch(`${API_URL}/creditos/cliente/${cliente.id_cliente}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const jsonCreditos = await resCreditos.json().catch(() => ({}));
  if (!resCreditos.ok) {
    return {
      respuesta: jsonCreditos.error || 'No se pudieron cargar los créditos del cliente.',
      action_executed: null,
      refresh: false,
      refresh_scope: null,
      pending: null,
    };
  }

  const creditos = (jsonCreditos.creditos ?? []) as Array<{
    id_credito: string;
    saldo_pendiente: number;
    fecha_limite_pago?: string;
  }>;
  if (creditos.length === 0) {
    return {
      respuesta: `${cliente.nombre_completo} no tiene créditos activos para abonar.`,
      action_executed: null,
      refresh: false,
      refresh_scope: null,
      pending: null,
    };
  }

  const porSaldo = creditos.find((c) => Number(c.saldo_pendiente) === Number(intent.monto));
  const porVence = [...creditos].sort((a, b) =>
    String(a.fecha_limite_pago || '').localeCompare(String(b.fecha_limite_pago || '')),
  )[0];
  const credito = porSaldo || porVence || creditos[0];
  const fechaAbono = intent.fechaAbono || todayBusinessKey();

  const resPago = await fetch(`${API_URL}/creditos/${credito.id_credito}/abonos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ monto: intent.monto, fechaAbono }),
    signal,
  });
  const jsonPago = await resPago.json().catch(() => ({}));
  if (!resPago.ok) {
    return {
      respuesta: jsonPago.error || 'No se pudo registrar el pago.',
      action_executed: null,
      refresh: false,
      refresh_scope: null,
      pending: null,
    };
  }

  const saldoNuevo = jsonPago.saldo_nuevo;
  const saldoTxt =
    saldoNuevo != null ? ` Saldo: ${formatCop(Number(saldoNuevo))}.` : '';
  return done(
    `Listo. Pago de ${formatCop(intent.monto)} de ${cliente.nombre_completo}.${saldoTxt}`,
    'agregar_pago',
    ['clientes', 'dashboard', 'pagos'],
  );
}
