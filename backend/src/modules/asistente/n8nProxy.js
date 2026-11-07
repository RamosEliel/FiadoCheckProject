function resolveN8nWebhookUrl(raw) {
  let url = (raw || '').trim();
  if (!url) return '';

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, '')}`;
  }

  if (url.includes('/webhook-test/')) {
    console.warn(
      '[Asistente] N8N_WEBHOOK_URL apunta a /webhook-test/, que solo responde ' +
      'con el canvas de n8n abierto. Usa /webhook/ para producción.'
    );
  } else if (!/\/webhook\//.test(url)) {
    url = `${url.replace(/\/+$/, '')}/webhook/fiadocheck-asistente`;
  }

  return url;
}

function n8nErrorMessage({ status, body } = {}) {
  const combined = [body?.error, body?.message, body?.detail]
    .filter(Boolean)
    .join(' ');

  const isInactive = /not active|workflow.*inactive|workflow.*not.*active|inactive workflow/i.test(combined);
  const webhookMissing = status === 404 && /webhook.*not registered|not registered/i.test(combined);

  if (isInactive || webhookMissing) {
    return 'El workflow de n8n está inactivo. Actívalo desde n8n y vuelve a intentarlo.';
  }

  return combined || 'Error al contactar el asistente IA';
}

module.exports = { resolveN8nWebhookUrl, n8nErrorMessage };
