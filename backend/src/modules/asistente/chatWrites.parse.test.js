const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseIntent, detectTipo, isConsulta } = require('./chatWrites.parse');

describe('chatWrites.parse', () => {
  it('detecta crédito y extrae monto + nombre', () => {
    const p = parseIntent('Registra un crédito de 50000 a Ana');
    assert.equal(p.tipo, 'credito');
    assert.equal(p.monto, 50000);
    assert.equal(p.nombre, 'ana');
    assert.match(p.fecha, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('detecta pago con miles colombianos', () => {
    const p = parseIntent('Registra un pago de $180.000 de Ana Ruiz');
    assert.equal(p.tipo, 'pago');
    assert.equal(p.monto, 180000);
    assert.equal(p.nombre, 'ana ruiz');
  });

  it('entiende 50 mil y cédula', () => {
    const p = parseIntent('Anota un fiado de 50 mil a cédula 1234567890');
    assert.equal(p.tipo, 'credito');
    assert.equal(p.monto, 50000);
    assert.equal(p.cedula, '1234567890');
  });

  it('no intercepta consultas', () => {
    assert.equal(detectTipo('¿Quién me debe más?'), null);
    assert.equal(detectTipo('¿Quién tiene fiado?'), null);
    assert.equal(parseIntent('Mora'), null);
    assert.equal(parseIntent('Resumen del día'), null);
    assert.equal(parseIntent('¿Quién tiene fiado?'), null);
    assert.equal(isConsulta('¿Quién me debe más?'), true);
    assert.equal(parseIntent('dime si puedo registrar un crédito de 50000 a Ana'), null);
  });

  it('pago gana sobre la palabra crédito', () => {
    const p = parseIntent('Registra un pago al crédito de Ana de 50000');
    assert.equal(p.tipo, 'pago');
    assert.equal(p.monto, 50000);
    assert.equal(p.nombre, 'ana');
  });

  it('100000 es monto, no cédula', () => {
    const p = parseIntent('Fíale 100000 a Maria');
    assert.equal(p.tipo, 'credito');
    assert.equal(p.monto, 100000);
    assert.equal(p.nombre, 'maria');
    assert.equal(p.cedula, null);
  });

  it('completa nombre suelto si allowFill', () => {
    const p = parseIntent('Ana Ruiz', { allowFill: true });
    assert.equal(p.nombre, 'ana ruiz');
    assert.equal(p.tipo, null);
  });
});
