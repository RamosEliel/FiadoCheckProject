-- Migración: el Random Forest pasa a ser la única fuente de la recomendación.
-- Se elimina el scoring por reglas (4 variables + su suma) de la tabla `scoring`
-- y se agrega `puntaje`, la salida propia del RF (0-100, ver ml_service/predict.py).

ALTER TABLE scoring
    ADD COLUMN IF NOT EXISTS puntaje INT;

ALTER TABLE scoring
    DROP COLUMN IF EXISTS pts_puntualidad,
    DROP COLUMN IF EXISTS pts_cumplimiento,
    DROP COLUMN IF EXISTS pts_historial,
    DROP COLUMN IF EXISTS pts_antiguedad;

-- Fuerza a que la próxima consulta recalcule con el modelo nuevo: el backend
-- ya trata confianza IS NULL como "predicción pendiente" (ver
-- getOrComputeScoring en backend/src/utils/mlScoring.js).
UPDATE scoring SET confianza = NULL;
