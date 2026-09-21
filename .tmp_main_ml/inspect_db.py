"""Consultas de SOLO LECTURA para entender el estado de scoring/creditos."""
import os

from dotenv import dotenv_values
import psycopg2
from psycopg2.extras import RealDictCursor

here = os.path.dirname(os.path.abspath(__file__))
_env = dotenv_values(os.path.join(here, "..", "backend", ".env"))
os.environ["DATABASE_URL"] = _env["DATABASE_URL"]

conn = psycopg2.connect(os.environ["DATABASE_URL"])
conn.set_session(readonly=True)

with conn.cursor(cursor_factory=RealDictCursor) as cur:
    print("=== creditos del cliente 3 con el tendero 1 ===")
    cur.execute(
        """
        SELECT id_credito, estado, monto_total, saldo_pendiente, fecha_credito, fecha_limite_pago
        FROM creditos WHERE id_cliente = '3' AND id_tendero = '1' ORDER BY fecha_credito
        """
    )
    for r in cur.fetchall():
        print("  ", dict(r))

    print("\n=== cliente 3 existe en `clientes`? ===")
    cur.execute("SELECT id_cliente, nombre_completo, created_at FROM clientes WHERE id_cliente = '3'")
    print("  ", cur.fetchall())

    print("\n=== resumen tabla scoring ===")
    cur.execute(
        """
        SELECT COUNT(*) AS filas,
               COUNT(confianza) AS con_confianza,
               COUNT(*) - COUNT(confianza) AS sin_confianza
        FROM scoring
        """
    )
    print("  ", dict(cur.fetchone()))

    print("\n=== filas de scoring sin confianza pero CON creditos cerrados (recuperables por el RF) ===")
    cur.execute(
        """
        SELECT s.id_cliente, s.id_tendero, s.nivel_riesgo, s.puntaje, s.confianza, s.fecha_calculo,
               (SELECT COUNT(*) FROM creditos cr
                WHERE cr.id_cliente = s.id_cliente AND cr.id_tendero = s.id_tendero) AS creditos_totales,
               (SELECT COUNT(*) FROM creditos cr
                WHERE cr.id_cliente = s.id_cliente AND cr.id_tendero = s.id_tendero
                  AND cr.estado IN ('pagado','vencido')) AS creditos_cerrados
        FROM scoring s
        WHERE s.confianza IS NULL
        ORDER BY s.id_cliente::int, s.id_tendero::int
        """
    )
    filas = cur.fetchall()
    recuperables = [f for f in filas if f["creditos_cerrados"] > 0]
    no_recuperables = [f for f in filas if f["creditos_cerrados"] == 0]
    print(f"  total sin confianza: {len(filas)}")
    print(f"  recuperables (tienen creditos cerrados): {len(recuperables)}")
    print(f"  NO recuperables (0 creditos cerrados, regla fija): {len(no_recuperables)}")
    print("  --- recuperables ---")
    for f in recuperables:
        print(f"    cliente {f['id_cliente']:>3} tendero {f['id_tendero']:>3} "
              f"nivel={f['nivel_riesgo']:<6} puntaje={f['puntaje']:<4} "
              f"cerrados={f['creditos_cerrados']} fecha={f['fecha_calculo']}")

conn.close()
