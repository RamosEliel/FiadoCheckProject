export type EstadoMoraCliente = 'al_dia' | 'mora' | 'sin_deuda';

export function clasificarEstadoCliente(
  totalDeuda: number,
  creditosVencidos: number,
): EstadoMoraCliente {
  if (totalDeuda === 0) return 'sin_deuda';
  if (creditosVencidos > 0) return 'mora';
  return 'al_dia';
}
