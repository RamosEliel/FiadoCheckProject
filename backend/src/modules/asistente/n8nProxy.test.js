const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveN8nWebhookUrl, n8nErrorMessage } = require('./n8nProxy');

describe('n8nProxy ASIS-01', () => {
  it('string vacio → resolve === vacio', () => {
    assert.equal(resolveN8nWebhookUrl(''), '');
  });

  it('whitespace → resolve === vacio', () => {
    assert.equal(resolveN8nWebhookUrl('   '), '');
  });
});

describe('n8nProxy ASIS-03', () => {
  it('host sin esquema añade https y el path del webhook', () => {
    assert.equal(
      resolveN8nWebhookUrl('mi-n8n.example.com'),
      'https://mi-n8n.example.com/webhook/fiadocheck-asistente'
    );
  });

  it('https://host y https://host/ resuelven al webhook de producción', () => {
    assert.equal(
      resolveN8nWebhookUrl('https://host'),
      'https://host/webhook/fiadocheck-asistente'
    );
    assert.equal(
      resolveN8nWebhookUrl('https://host/'),
      'https://host/webhook/fiadocheck-asistente'
    );
  });

  it('URL que ya tiene /webhook/foo no duplica el path', () => {
    assert.equal(
      resolveN8nWebhookUrl('https://mi-n8n.example.com/webhook/foo'),
      'https://mi-n8n.example.com/webhook/foo'
    );
  });
});

describe('n8nProxy ASIS-02', () => {
  it('404 webhook not registered se reporta como inactivo', () => {
    const msg = n8nErrorMessage({
      status: 404,
      body: { message: 'The requested webhook is not registered' },
    });
    assert.match(msg, /inactivo/i);
  });

  it("body error 'Workflow is not active' se reporta como inactivo", () => {
    const msg = n8nErrorMessage({
      status: 500,
      body: { error: 'Workflow is not active' },
    });
    assert.match(msg, /inactivo/i);
  });

  it('500 genérico no miente inactivo', () => {
    const msg = n8nErrorMessage({
      status: 500,
      body: { error: 'Internal Server Error' },
    });
    assert.doesNotMatch(msg, /inactivo/i);
    assert.equal(msg, 'Internal Server Error');
  });
});
