import os
import json
import atexit
import threading
from contextlib import contextmanager

from psycopg2 import pool as pgpool
from dotenv import dotenv_values, load_dotenv
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


def get_features(id_cliente: int, id_tendero=None):
    """Devuelve [pts_puntualidad, pts_historial, pts_cumplimiento, pts_antiguedad, puntaje_calc].
    El puntaje se calcula como suma de las 4 variables (ya no se almacena en BD).

    El scoring es por par (cliente, tendero): un mismo cliente tiene un historial
    distinto en cada tienda. id_tendero es opcional solo para no romper si un
    backend antiguo aún no lo envía; en ese caso se toma la fila más reciente,
    que puede ser la de otro tendero.
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if id_tendero is not None:
                cur.execute(
                    """
                    SELECT pts_puntualidad, pts_historial, pts_cumplimiento, pts_antiguedad
                    FROM scoring
                    WHERE id_cliente = %s AND id_tendero = %s
                    ORDER BY fecha_calculo DESC
                    LIMIT 1
                    """,
                    (str(id_cliente), str(id_tendero)),
                )
            else:
                cur.execute(
                    """
                    SELECT pts_puntualidad, pts_historial, pts_cumplimiento, pts_antiguedad
                    FROM scoring
                    WHERE id_cliente = %s
                    ORDER BY fecha_calculo DESC
                    LIMIT 1
                    """,
                    (str(id_cliente),),
                )
            row = cur.fetchone()

    if not row:
        return None

    puntaje = row["pts_puntualidad"] + row["pts_historial"] + row["pts_cumplimiento"] + row["pts_antiguedad"]
    return [
        row["pts_puntualidad"],
        row["pts_historial"],
        row["pts_cumplimiento"],
        row["pts_antiguedad"],
        puntaje,
    ]


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


def fetch_all_scoring():
    """Devuelve filas con las 4 variables + nivel_riesgo. El puntaje se recalcula en model.py."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT pts_puntualidad, pts_historial, pts_cumplimiento, pts_antiguedad, nivel_riesgo
                FROM scoring
                """
            )
            rows = cur.fetchall()
    return rows


def count_scoring_records() -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM scoring")
            row = cur.fetchone()
    return row[0]


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {"last_train_count": 0}


def save_state(state: dict):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)
