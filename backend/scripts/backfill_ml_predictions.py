"""
OBSOLETO — no usar. Usa backend/scripts/repoblar_predicciones_ml.js.

Este script pertenecía al scoring por reglas: leía pts_puntualidad, pts_historial,
pts_cumplimiento y pts_antiguedad de la tabla `scoring` y armaba un vector de 5
features. Esas columnas ya no existen (`scoring` quedó como caché de la predicción
del Random Forest) y el modelo actual espera 4 features calculadas desde
creditos/abonos, así que ejecutarlo solo producía
`UndefinedColumn: column "pts_puntualidad" does not exist`.

El reemplazo pide la predicción al microservicio, que es la única fuente de
nivel_riesgo/puntaje/confianza:

    node backend/scripts/repoblar_predicciones_ml.js --dry-run
    node backend/scripts/repoblar_predicciones_ml.js
"""

import sys

MENSAJE = (
    "backfill_ml_predictions.py quedó obsoleto con la migración a scoring por "
    "Random Forest: las columnas pts_* ya no existen en la tabla `scoring`.\n"
    "Usa en su lugar:  node backend/scripts/repoblar_predicciones_ml.js"
)


if __name__ == "__main__":
    print(MENSAJE)
    sys.exit(1)
