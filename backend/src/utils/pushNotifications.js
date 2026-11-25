// Envío de notificaciones push mediante la API de Expo.
//
// El recordatorio diario lo dispara n8n, pero el envío puntual (prueba del
// módulo, avisos desde el backend) y la higiene de tokens viven aquí para que
// se puedan probar sin depender de n8n ni de un dispositivo.

const pool = require('../config/database');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_CHUNK_SIZE = 100; // límite documentado por Expo por petición
const TIMEOUT_MS = 10000;

// ExponentPushToken[...] (clásico) o ExpoPushToken[...] (SDK recientes).
const TOKEN_REGEX = /^Expo(nent)?PushToken\[[^\]\s]+\]$/;

function esTokenExpoValido(token) {
  return typeof token === 'string' && TOKEN_REGEX.test(token.trim());
}

function dividirEnLotes(lista, tamano) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamano) {
    lotes.push(lista.slice(i, i + tamano));
  }
  return lotes;
}

async function postExpo(lote) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Opcional: solo si el proyecto de Expo tiene activada la seguridad mejorada.
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(lote),
      signal: controller.signal,
    });
    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detalle = cuerpo?.errors?.[0]?.message || `HTTP ${res.status}`;
      throw new Error(`Expo rechazó la petición: ${detalle}`);
    }
    return Array.isArray(cuerpo.data) ? cuerpo.data : [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Envía una lista de mensajes ({ to, title, body, data }) y devuelve un
 * resultado por mensaje, en el mismo orden:
 *   { to, ok, id?, error?, mensaje? }
 * Los tokens que Expo declara muertos (DeviceNotRegistered) se borran de
 * `usuario` para no volver a intentarlos todos los días.
 */
async function enviarPush(mensajes) {
  const validos = [];
  const resultados = mensajes.map((m) => {
    if (!esTokenExpoValido(m.to)) {
      return { to: m.to, ok: false, error: 'TokenInvalido', mensaje: 'El token no tiene formato de Expo' };
    }
    return null;
  });

  mensajes.forEach((m, i) => {
    if (resultados[i] === null) validos.push({ indice: i, mensaje: { sound: 'default', ...m } });
  });

  for (const lote of dividirEnLotes(validos, EXPO_CHUNK_SIZE)) {
    let tickets;
    try {
      tickets = await postExpo(lote.map((v) => v.mensaje));
    } catch (err) {
      for (const v of lote) {
        resultados[v.indice] = { to: v.mensaje.to, ok: false, error: 'ErrorDeEnvio', mensaje: err.message };
      }
      continue;
    }

    lote.forEach((v, j) => {
      const ticket = tickets[j];
      if (ticket?.status === 'ok') {
        resultados[v.indice] = { to: v.mensaje.to, ok: true, id: ticket.id };
      } else {
        resultados[v.indice] = {
          to: v.mensaje.to,
          ok: false,
          error: ticket?.details?.error || 'ErrorDeEnvio',
          mensaje: ticket?.message || 'Expo no devolvió un resultado para este mensaje',
        };
      }
    });
  }

  const muertos = resultados.filter((r) => r.error === 'DeviceNotRegistered').map((r) => r.to);
  if (muertos.length > 0) {
    try {
      await pool.query('UPDATE usuario SET push_token = NULL WHERE push_token = ANY($1)', [muertos]);
    } catch (err) {
      console.error('[push] No se pudieron limpiar tokens inválidos:', err.message);
    }
  }

  return resultados;
}

/** Envía un push al dispositivo registrado de un usuario. */
async function enviarPushAUsuario(idUsuario, { title, body, data }) {
  const { rows } = await pool.query('SELECT push_token FROM usuario WHERE id_usuario = $1', [idUsuario]);
  const token = rows[0]?.push_token;
  if (!token) {
    return { ok: false, error: 'SinToken', mensaje: 'El usuario no tiene un dispositivo registrado' };
  }
  const [resultado] = await enviarPush([{ to: token, title, body, data }]);
  return resultado;
}

module.exports = { esTokenExpoValido, enviarPush, enviarPushAUsuario };
