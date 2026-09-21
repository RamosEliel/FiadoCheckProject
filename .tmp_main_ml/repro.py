"""Reproduce el fallo de /predict tal como esta desplegado en Azure (rama main).

Solo lecturas. Copia features_main.py como features.py en este directorio y lo
ejecuta contra la base real.
"""
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# DATABASE_URL se toma de backend/.env igual que en el microservicio.
from dotenv import dotenv_values

_env = dotenv_values(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", ".env"))
if _env.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = _env["DATABASE_URL"]

import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(os.environ["DATABASE_URL"])
with conn.cursor(cursor_factory=RealDictCursor) as cur:
    cur.execute(
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'scoring'
        ORDER BY ordinal_position
        """
    )
    print("=== columnas reales de la tabla `scoring` en la base de produccion ===")
    for r in cur.fetchall():
        print(f"  {r['column_name']:<20} {r['data_type']}")
conn.close()

print()
print("=== ejecutando get_features() de la rama main (lo que corre Azure) ===")
import shutil

here = os.path.dirname(os.path.abspath(__file__))
shutil.copyfile(os.path.join(here, "features_main.py"), os.path.join(here, "features.py"))

import features  # noqa: E402

for cid, tid in [(1, 1), (2, 1), (3, 1), (4, 2), (6, 6), (5, 3)]:
    print(f"\n--- get_features(id_cliente={cid}, id_tendero={tid}) ---")
    try:
        print("  OK:", features.get_features(cid, tid))
    except Exception:
        traceback.print_exc()
