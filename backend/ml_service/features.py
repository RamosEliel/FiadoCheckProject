import os
import json
import atexit
import threading
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, date, time

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

# Un crédito 'vencido' nunca recibió un abono a tiempo: cuenta como un atraso
# fijo de 31 días, igual que scoringCalculo.js en el backend Node.
DIAS_ATRASO_VENCIDO = 31


# Pool de conexiones.
#
# Antes cada consulta abría su propia conexión con psycopg2.connect() y la
# cerraba al terminar. Como /predict invoca get_features_for_pair() y
# get_limit_data(), eran dos handshakes TCP+SSL completos contra NeonDB por
# cada predicción.
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


def _a_datetime(valor):
    """`fecha_credito`/`fecha_limite_pago` llegan como `date`, `created_at` como
    `datetime` — normaliza ambos antes de restar."""
    if isinstance(valor, datetime):
        return valor
    if isinstance(valor, date):
        return datetime.combine(valor, time.min)
    return valor


def _meses_entre(fecha_inicio, fecha_fin) -> float:
    if fecha_inicio is None or fecha_fin is None:
        return 0.0
    inicio = _a_datetime(fecha_inicio)
    fin = _a_datetime(fecha_fin)
    return (fin - inicio).total_seconds() / (60 * 60 * 24 * 30)


def _clasificar_credito(estado: str, fecha_limite_pago, ultimo_abono):
    """Clasifica el desenlace real de un crédito cerrado.

    - 'malo': el crédito quedó vencido (nunca se pagó dentro del plazo).
    - 'bueno': se pagó y el último abono llegó dentro del plazo.
    - 'regular': se pagó pero el último abono llegó después del plazo.

    Devuelve (etiqueta, dias_atraso). dias_atraso solo se usa para alimentar
    el feature agregado de créditos previos, no como feature directo.
    """
    if estado == 'vencido':
        return 'malo', DIAS_ATRASO_VENCIDO

    if ultimo_abono is None:
        # Dato inconsistente (pagado sin abonos registrados): no penalizar.
        return 'bueno', 0

    dias = (ultimo_abono - fecha_limite_pago).days
    if dias <= 0:
        return 'bueno', 0
    return 'regular', dias


def _fetch_creditos_cerrados(id_cliente=None, id_tendero=None):
    """Créditos cerrados (pagado + vencido) con la fecha del último abono.

    Ordenados por (id_cliente, id_tendero, fecha_credito) para poder acumular
    el historial "previo" de cada par en una sola pasada.
    """
    filtros = []
    params = []
    if id_cliente is not None:
        filtros.append("cr.id_cliente = %s")
        params.append(str(id_cliente))
    if id_tendero is not None:
        filtros.append("cr.id_tendero = %s")
        params.append(str(id_tendero))
    where_extra = f"AND {' AND '.join(filtros)}" if filtros else ""

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                    cr.id_credito,
                    cr.id_cliente,
                    cr.id_tendero,
                    cr.fecha_credito,
                    cr.fecha_limite_pago,
                    cr.estado,
                    cl.created_at AS cliente_created_at,
                    (
                        SELECT MAX(a.fecha_abono) FROM abonos a WHERE a.id_credito = cr.id_credito
                    ) AS ultimo_abono
                FROM creditos cr
                JOIN clientes cl ON cl.id_cliente = cr.id_cliente
                WHERE cr.estado IN ('pagado', 'vencido') {where_extra}
                ORDER BY cr.id_cliente, cr.id_tendero, cr.fecha_credito ASC
                """,
                params,
            )
            return cur.fetchall()


def build_training_rows():
    """Arma (X, y) para entrenar el RF a partir de desenlaces reales de créditos.

    Cada fila es un crédito cerrado histórico. Las features se calculan SOLO
    con créditos previos del mismo par (cliente, tendero) — anteriores por
    fecha_credito — para no filtrar información del propio desenlace que se
    está etiquetando. La antigüedad se calcula contra la fecha de ESE crédito,
    no contra hoy, para no meter fuga temporal en filas viejas.

    Limitación conocida: no existe una tabla de historial de estados de
    `creditos`, así que "créditos previos cerrados" se aproxima ordenando por
    fecha_credito en vez de reconstruir el estado exacto en el instante T.
    """
    rows = _fetch_creditos_cerrados()

    historial = defaultdict(list)  # (id_cliente, id_tendero) -> [(etiqueta, dias_atraso), ...]
    X, y = [], []

    for r in rows:
        par = (r["id_cliente"], r["id_tendero"])
        previos = historial[par]
        num_previos = len(previos)

        if num_previos > 0:
            ratio_a_tiempo = sum(1 for etiqueta, _ in previos if etiqueta == "bueno") / num_previos
            atraso_promedio = sum(dias for _, dias in previos) / num_previos
        else:
            ratio_a_tiempo = 0.0
            atraso_promedio = 0.0

        antiguedad_meses = _meses_entre(r["cliente_created_at"], r["fecha_credito"])
        etiqueta, dias_atraso = _clasificar_credito(r["estado"], r["fecha_limite_pago"], r["ultimo_abono"])

        X.append([num_previos, ratio_a_tiempo, atraso_promedio, antiguedad_meses])
        y.append(etiqueta)

        historial[par].append((etiqueta, dias_atraso))

    return X, y


def get_features_for_pair(id_cliente: int, id_tendero: int):
    """Features en vivo para decidir sobre un crédito NUEVO de este par.

    A diferencia del entrenamiento, aquí "previos" son TODOS los créditos
    cerrados que existen hoy para el par (el crédito que se está evaluando
    todavía no existe), y la antigüedad se calcula contra el momento actual.

    Devuelve None si el par no tiene ningún crédito cerrado — en ese caso no
    hay nada real que predecir (el backend ya filtra este caso con la regla de
    cliente nuevo antes de llegar a pedir una predicción).
    """
    rows = _fetch_creditos_cerrados(id_cliente, id_tendero)
    if not rows:
        return None

    etiquetas_dias = [
        _clasificar_credito(r["estado"], r["fecha_limite_pago"], r["ultimo_abono"])
        for r in rows
    ]
    num_previos = len(etiquetas_dias)
    ratio_a_tiempo = sum(1 for etiqueta, _ in etiquetas_dias if etiqueta == "bueno") / num_previos
    atraso_promedio = sum(dias for _, dias in etiquetas_dias) / num_previos
    antiguedad_meses = _meses_entre(rows[0]["cliente_created_at"], datetime.now())

    return [num_previos, ratio_a_tiempo, atraso_promedio, antiguedad_meses]


def get_limit_data(id_cliente: int, id_tendero=None):
    """
    Retorna (base, saldo_pendiente) para calcular el límite sugerido.
    - base = promedio de los últimos 3 créditos cerrados (pagado + vencido)
    - saldo_pendiente = suma de saldo_pendiente de créditos no pagados (vigentes + vencidos)

    Los créditos se filtran por tendero cuando se conoce: el límite que se le
    sugiere a una tienda debe salir de lo que esa tienda fió, no de lo que el
    cliente deba en otro negocio.
    """
    filtro_tendero = "AND id_tendero = %s" if id_tendero is not None else ""
    params = (str(id_cliente), str(id_tendero)) if id_tendero is not None else (str(id_cliente),)

    with get_connection() as conn:
        with conn.cursor() as cur:
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


def invalidate_all_scoring_cache():
    """Marca como vencidas todas las predicciones cacheadas en `scoring`.

    Se llama tras un reentrenamiento exitoso: los pesos del RF cambiaron para
    TODOS los pares, no solo el que disparó el evento, así que una predicción
    calculada con el modelo anterior ya no es válida en ningún caso. El
    backend Node ya trata confianza NULL como "hay que recalcular" (ver
    getOrComputeScoring), así que esto basta para que la próxima consulta de
    cada par la recalcule con el modelo nuevo.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE scoring SET confianza = NULL")
        conn.commit()


def count_closed_creditos() -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM creditos WHERE estado IN ('pagado', 'vencido')")
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
