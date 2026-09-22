export type NivelRiesgo = 'bajo' | 'medio' | 'alto';

// Devuelve el porcentaje 0–100, o null cuando no hay una predicción real del RF.
// Un cliente sin historial cerrado con el tendero recibe la regla fija de negocio
// (puntaje=50, nivel=medio, confianza=null): no hay confianza que reportar, así que
// null NO debe colapsarse a 0% (eso sugeriría que el modelo está totalmente inseguro).
export const formatConfianza = (valor: number | null | undefined): number | null => {
  if (valor == null) return null;
  return valor <= 1 ? Math.round(valor * 100) : Math.round(valor);
};

export const getRiesgoColor = (nivel: string | null | undefined): string => {
  switch (nivel?.toLowerCase()) {
    case 'bajo': return '#3EBF7A';
    case 'medio': return '#FFA000';
    case 'alto': return '#FF5252';
    default: return '#7A9A85';
  }
};

export const formatNivelRiesgo = (nivel: string | null | undefined): string => {
  const value = (nivel ?? 'medio').toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const getRiesgoLabelCliente = (
  nivel: string | null | undefined,
  enMora = false,
): string => {
  if (enMora) return 'Mejora Tus Pagos';
  switch (nivel?.toLowerCase()) {
    case 'bajo': return '¡Excelente Cliente!';
    case 'medio': return 'Buen Cliente';
    default: return 'Mejora Tus Pagos';
  }
};

export type ScoringML = {
  confianza: number | null;
  nivel_riesgo: string | null;
  puntaje: number | null;
};

export const mapScoringML = (json: {
  confianza?: number | null;
  nivel_riesgo?: string | null;
  puntaje?: number | null;
}): ScoringML => ({
  confianza: formatConfianza(json.confianza),
  nivel_riesgo: json.nivel_riesgo ?? null,
  puntaje: json.puntaje ?? null,
});
