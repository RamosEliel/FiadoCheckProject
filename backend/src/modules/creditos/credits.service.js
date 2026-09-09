/**
 * Lógica de negocio del registro de abonos (pagos) sobre un crédito.
 */

const AppError = require('../../utils/AppError');
const { triggerMLRetrain } = require('../../utils/mlTrigger');
const { invalidateScoring } = require('../../utils/mlScoring');
const { toDateKey, todayBusinessKey } = require('../../utils/dateUtils');
const creditsRepository = require('./credits.repository');

const round2 = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

const validarConsistenciaPago = (credito, monto, fechaAbono) => {
  const montoNum = Number(monto);

  if (monto === undefined || monto === null || Number.isNaN(montoNum)) {
    throw new AppError('El monto del abono es inválido', 400);
  }

  if (montoNum <= 0) {
    throw new AppError('El monto debe ser mayor a 0', 400);
  }

  if (round2(montoNum) !== montoNum) {
    throw new AppError('El monto no puede tener más de 2 decimales', 400);
  }

  if (credito.estado === 'pagado') {
    throw new AppError('Este crédito ya está pagado en su totalidad', 409);
  }

  const saldoPendiente = round2(parseFloat(credito.saldo_pendiente));

  if (montoNum > saldoPendiente) {
    throw new AppError(
      `El monto del abono ($${montoNum}) supera el saldo pendiente ($${saldoPendiente})`,
      409
    );
  }

  let abonoKey = toDateKey(fechaAbono);
  if (!abonoKey) {
    throw new AppError('La fecha del abono es inválida', 400);
  }

  const hoyKey = todayBusinessKey();
  if (abonoKey > hoyKey) {
    throw new AppError('La fecha del abono no puede ser futura', 400);
  }

  const creditoKey = toDateKey(credito.fecha_credito);
  if (creditoKey && abonoKey < creditoKey) {
    // Pago con fecha de hoy: tolerar créditos con fecha_credito adelantada (UTC al crear)
    if (abonoKey === hoyKey) {
      abonoKey = creditoKey;
    } else {
      throw new AppError('La fecha del abono no puede ser anterior a la fecha del crédito', 400);
    }
  }

  return { monto: montoNum, fechaAbono: abonoKey };
};

const registrarPago = async ({ creditoId, idTendero, monto, fechaAbono }) => {
  const client = await creditsRepository.getClient();

  try {
    await client.query('BEGIN');

    const credito = await creditsRepository.lockCreditoById(client, creditoId, idTendero);

    if (!credito) {
      throw new AppError('Crédito no encontrado', 404);
    }

    const { monto: montoValidado, fechaAbono: fechaAbonoValidada } = validarConsistenciaPago(
      credito,
      monto,
      fechaAbono
    );

    const saldoAnterior = round2(parseFloat(credito.saldo_pendiente));
    const saldoNuevo = Math.max(0, round2(saldoAnterior - montoValidado));
    const estadoNuevo = saldoNuevo === 0 ? 'pagado' : credito.estado;

    const abono = await creditsRepository.insertAbono(client, {
      idCredito: credito.id_credito,
      idCliente: credito.id_cliente,
      monto: montoValidado,
      fechaAbono: fechaAbonoValidada,
    });

    const updateResult = await creditsRepository.actualizarSaldoCredito(client, {
      idCredito: credito.id_credito,
      idTendero,
      saldoNuevo,
      estado: estadoNuevo,
    });

    if (updateResult.rowCount !== 1) {
      throw new AppError('No se pudo actualizar el saldo del crédito', 500);
    }

    await client.query('COMMIT');

    if (estadoNuevo === 'pagado') {
      triggerMLRetrain('credito_pagado').catch(() => {});
      try {
        await invalidateScoring(client, credito.id_cliente, idTendero);
      } catch (invalidateErr) {
        console.error('Error invalidando caché de scoring:', invalidateErr.message);
      }
    }

    return {
      id_abono: abono.id_abono,
      saldo_anterior: saldoAnterior,
      saldo_nuevo: saldoNuevo,
      estado_credito: estadoNuevo,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  validarConsistenciaPago,
  registrarPago,
};
