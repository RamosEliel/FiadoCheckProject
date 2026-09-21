import os
import json
import atexit
import threading
from contextlib import contextmanager

from psycopg2 import pool as pgpool
from dotenv import dotenv_values, load_dotenv
from datetime import date, datetime
from psycopg2.extras import RealDictCursor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1) .env propio del microservicio (opcional): este archivo sí es suyo, se carga completo.
_ML_ENV_PATH = os.path.join(BASE_DIR, '.env')
if os.path.exists(_ML_ENV_PATH):
    load_dotenv(dotenv_path=_ML_ENV_PATH)

# 2) backend/.env (el del servidor Node): NO se carga completo a propósito.
#    Ese archivo define PORT=3000 (puerto de Express) y secretos JWT que no le
#    corresponden al ML; inyectarlos hacía que uvicorn arrancara en el 3000.
#    Solo se toma DATABASE_URL, y solo si aún no está definida.
if not os.environ.get("DATABASE_URL"):
    _BACKEND_ENV_PATH = os.path.join(BASE_DIR, '..', '.env')
    if os.path.exists(_BACKEND_ENV_PATH):
        _db_url = dotenv_values(_BACKEND_ENV_PATH).get("DATABASE_URL")
        if _db_url:
            os.environ["DATABASE_URL"] = _db_url


STATE_FILE = os.path.join(BASE_DIR, 'ml_state.json')


# Pool de conexiones.
#
# Antes cada consulta abría su propia conexión con psycopg2.connect() y la
# cerraba al terminar. Como /predict invoca get_features() y get_limit_data(),
# eran dos handshakes TCP+SSL completos contra NeonDB por cada predicción.
#
# Es threaded porque el reentrenamiento corre en un hilo de background
# (_retrain_in_background en predict.py) y también consulta la base.
_pool = None
_pool_lock = threading.Lock()


def _get_pool():
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = pgpool.ThreadedConnectionPool(
                    minconn=1,
                    maxconn=5,
                    dsn=os.getenv("DATABASE_URL"),
                )
    return _pool


@contextmanager
def get_connection():
    """Entrega una conexión del pool y la devuelve al terminar.

    Uso: `with get_connection() as conn:`. La conexión NO debe cerrarse a mano;
    si la operación falla se descarta en lugar de reciclarla, porque puede
    haber quedado en un estado inservible.
    """
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
    except Exception:
        pool.putconn(conn, close=True)
        raise
    else:
        pool.putconn(conn)


@atexit.register
def _close_pool():
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


def _as_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _months_between(start, end):
    start_d = _as_date(start)
    end_d = _as_date(end)
    if not start_d or not end_d:
        return 0
    months = (end_d.year - start_d.year) * 12 + (end_d.month - start_d.month)
    return max(0, months)


def _label_and_atraso(estado, fecha_limite, ultimo_abono):
    """Etiqueta real del desenlace y días de atraso del crédito."""
    limite = _as_date(fecha_limite)
    abono = _as_date(ultimo_abono)
    if estado == "vencido":
        return "malo", 31
    if estado == "pagado":
        if abono is None or limite is None or abono <= limite:
            return "bueno", 0
        return "regular", (abono - limite).days
    return None, 0


def _fetch_closed_credits(id_cliente=None, id_tendero=None, only_cuaderno_real=False):
    filtros = ["c.estado IN ('pagado', 'vencido')"]
    params = []
    if id_cliente is not None:
        filtros.append("c.id_cliente = %s")
        params.append(str(id_cliente))
    if id_tendero is not None:
        filtros.append("c.id_tendero = %s")
        params.append(str(id_tendero))
    if only_cuaderno_real:
        filtros.append("c.descripcion LIKE '[cuaderno-real]%%'")

    sql = f"""
        SELECT
            c.id_credito,
            c.id_cliente,
            c.id_tendero,
            c.estado,
            c.fecha_credito,
            c.fecha_limite_pago,
            cl.created_at AS cliente_created_at,
            (
                SELECT MAX(a.fecha_abono)
                FROM abonos a
                WHERE a.id_credito = c.id_credito
            ) AS ultimo_abono
        FROM creditos c
        JOIN clientes cl ON cl.id_cliente = c.id_cliente
        WHERE {' AND '.join(filtros)}
        ORDER BY c.id_cliente, c.id_tendero, c.fecha_credito, c.id_credito
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def _features_from_previos(previos, cliente_created_at, as_of):
    n = len(previos)
    if n == 0:
        ratio = 0.0
        atraso_prom = 0.0
    else:
        buenos = sum(1 for p in previos if p["label"] == "bueno")
        ratio = buenos / n
        atraso_prom = sum(p["dias_atraso"] for p in previos) / n
    return [
        float(n),
        float(ratio),
        float(atraso_prom),
        float(_months_between(cliente_created_at, as_of)),
    ]


def get_features(id_cliente, id_tendero=None):
    """Features calculables ANTES de un crédito nuevo, por par (cliente, tendero).

    [num_creditos_previos_cerrados, ratio_pagados_a_tiempo_previo,
     dias_atraso_promedio_previo, antiguedad_meses]
    """
    rows = _fetch_closed_credits(id_cliente=id_cliente, id_tendero=id_tendero)
    created = rows[0]["cliente_created_at"] if rows else None
    if created is None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT created_at FROM clientes WHERE id_cliente = %s",
                    (str(id_cliente),),
                )
                found = cur.fetchone()
                if not found:
                    return None
                created = found[0]

    previos = []
    for row in rows:
        label, atraso = _label_and_atraso(row["estado"], row["fecha_limite_pago"], row["ultimo_abono"])
        if label:
            previos.append({"label": label, "dias_atraso": atraso})
    return _features_from_previos(previos, created, date.today())


def get_limit_data(id_cliente: int, id_tendero=None):
    """
    Retorna (base, saldo_pendiente) para calcular el límite sugerido.
    - base = promedio de los últimos 3 créditos cerrados (pagado + vencido)
    - saldo_pendiente = suma de saldo_pendiente de créditos no pagados (vigentes + vencidos)

    Los créditos se filtran por tendero cuando se conoce: el límite que se le
    sugiere a una tienda debe salir de lo que esa tienda fió, no de lo que el
    cliente deba en otro negocio. El backend Node ya lo calcula así.
    """
    filtro_tendero = "AND id_tendero = %s" if id_tendero is not None else ""
    params = (str(id_cliente), str(id_tendero)) if id_tendero is not None else (str(id_cliente),)

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Promedio de los últimos 3 créditos cerrados
            cur.execute(
                f"""
                SELECT COALESCE(AVG(monto_total), 0)
                FROM (
                    SELECT monto_total
                    FROM creditos
                    WHERE id_cliente = %s AND estado IN ('pagado', 'vencido') {filtro_tendero}
                    ORDER BY fecha_credito DESC
                    LIMIT 3
                ) sub
                """,
                params,
            )
            base = float(cur.fetchone()[0])

            # Saldo pendiente actual (créditos que no están pagados)
            cur.execute(
                f"""
                SELECT COALESCE(SUM(saldo_pendiente), 0)
                FROM creditos
                WHERE id_cliente = %s AND estado != 'pagado' {filtro_tendero}
                """,
                params,
            )
            saldo_pendiente = float(cur.fetchone()[0])

    return base, saldo_pendiente


def fetch_training_rows(only_cuaderno_real=True):
    """Una fila por crédito cerrado: features (sin fuga del propio crédito) + etiqueta real."""
    rows = _fetch_closed_credits(only_cuaderno_real=only_cuaderno_real)
    if not rows and only_cuaderno_real:
        rows = _fetch_closed_credits(only_cuaderno_real=False)

    grouped = {}
    for row in rows:
        key = (str(row["id_cliente"]), str(row["id_tendero"]))
        grouped.setdefault(key, []).append(row)

    samples = []
    for pair_rows in grouped.values():
        previos = []
        for row in pair_rows:
            label, atraso = _label_and_atraso(
                row["estado"], row["fecha_limite_pago"], row["ultimo_abono"]
            )
            if not label:
                continue
            features = _features_from_previos(
                previos, row["cliente_created_at"], row["fecha_credito"]
            )
            samples.append({"features": features, "label": label, "id_credito": row["id_credito"]})
            previos.append({"label": label, "dias_atraso": atraso})
    return samples


def fetch_all_scoring():
    """Compatibilidad: mismo contrato que usaba model.py (features + etiqueta)."""
    return [(s["features"][0], s["features"][1], s["features"][2], s["features"][3], s["label"])
            for s in fetch_training_rows()]


def count_scoring_records() -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM creditos
                WHERE estado IN ('pagado', 'vencido')
                  AND descripcion LIKE '[cuaderno-real]%%'
                """
            )
            n = cur.fetchone()[0]
            if n:
                return n
            cur.execute("SELECT COUNT(*) FROM creditos WHERE estado IN ('pagado', 'vencido')")
            return cur.fetchone()[0]


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {"last_train_count": 0}


def save_state(state: dict):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)
