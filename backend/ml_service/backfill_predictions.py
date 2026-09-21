"""Genera y persiste la predicción RF para todos los pares cliente-tendero activos."""
from collections import Counter

from features import get_connection
from predict import compute_prediction


UPSERT = """
INSERT INTO scoring (id_cliente, id_tendero, nivel_riesgo, limite_sugerido, confianza, puntaje, fecha_calculo)
VALUES (%s, %s, %s, %s, %s, %s, NOW())
ON CONFLICT (id_cliente, id_tendero) DO UPDATE SET
  nivel_riesgo = EXCLUDED.nivel_riesgo,
  limite_sugerido = EXCLUDED.limite_sugerido,
  confianza = EXCLUDED.confianza,
  puntaje = EXCLUDED.puntaje,
  fecha_calculo = NOW()
"""


def main():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT tc.id_cliente, tc.id_tendero,
                       EXISTS (
                         SELECT 1 FROM creditos c
                         WHERE c.id_cliente = tc.id_cliente AND c.id_tendero = tc.id_tendero
                       ) AS tiene_creditos
                FROM tendero_cliente tc
                WHERE tc.estado = 'activo'
                ORDER BY tc.id_tendero, tc.id_cliente
                """
            )
            pares = cur.fetchall()

    print(f"Pares activos: {len(pares)}")
    niveles = Counter()
    rf_ok = 0
    fijos = 0
    fallos = []

    with get_connection() as conn:
        with conn.cursor() as cur:
            for id_cliente, id_tendero, tiene_creditos in pares:
                if not tiene_creditos:
                    cur.execute(
                        UPSERT,
                        (str(id_cliente), str(id_tendero), "medio", 50000, None, 50),
                    )
                    fijos += 1
                    niveles["medio_nuevo"] += 1
                    continue

                pred = compute_prediction(id_cliente, id_tendero)
                if pred is None:
                    fallos.append((id_cliente, id_tendero, "sin prediccion"))
                    continue

                cur.execute(
                    UPSERT,
                    (
                        str(id_cliente),
                        str(id_tendero),
                        pred["nivel_riesgo"],
                        pred["limite_sugerido"],
                        pred["confianza"],
                        pred["puntaje_rf"],
                    ),
                )
                rf_ok += 1
                niveles[pred["nivel_riesgo"]] += 1
        conn.commit()

    print(f"Predicciones RF: {rf_ok}")
    print(f"Clientes sin historial (regla fija): {fijos}")
    print(f"Fallos: {len(fallos)}")
    for f in fallos[:20]:
        print(" ", f)
    print("Niveles:", dict(niveles))


if __name__ == "__main__":
    main()
