type SemanaLike = { pagos: number; esperado: number };
type DistLike = { monto: number };

export function totalPagosMes(semanas: SemanaLike[]): number {
  return semanas.reduce((acc, s) => acc + (Number(s.pagos) || 0), 0);
}

export function totalEsperadoMes(semanas: SemanaLike[]): number {
  return semanas.reduce((acc, s) => acc + (Number(s.esperado) || 0), 0);
}

/** Porcentaje de cobrado vs esperado. `null` si no hay vencimientos este mes. */
export function cumplimientoMesPct(semanas: SemanaLike[]): number | null {
  const esperado = totalEsperadoMes(semanas);
  if (esperado <= 0) return null;
  return Math.round((totalPagosMes(semanas) / esperado) * 100);
}

export function carteraTotal(distribucion: DistLike[]): number {
  return distribucion.reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
}
