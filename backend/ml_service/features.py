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


def _normalizar_dsn(dsn):
    """Obliga a TLS si la cadena de conexión no lo pide explícitamente.

    NeonDB rechaza las conexiones sin cifrar. La DATABASE_URL de backend/.env sí
    trae `sslmode=require`, pero la que se configura como App Setting en Azure se
    copia a mano y es fácil que llegue sin ese parámetro; el fallo aparecería
    recién en la primera consulta, no al arrancar.
    """
    if not dsn:
        return dsn
    if "sslmode=" in dsn:
        return dsn
    if dsn.startswith("postgres://") or dsn.startswith("postgresql://"):
        separador = "&" if "?" in dsn else "?"
        return f"{dsn}{separador}sslmode=require"
    # Forma "host=... dbname=..." (palabras clave separadas por espacios).
    return f"{dsn} sslmode=require"


def _get_pool():
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                dsn = _normalizar_dsn(os.getenv("DATABASE_URL"))
                if not dsn:
                    raise RuntimeError(
                        "DATABASE_URL no está definida: el microservicio no puede "
                        "consultar el historial de créditos."
                    )
                _pool = pgpool.ThreadedConnectionPool(minconn=1, maxconn=5, dsn=dsn)
    return _pool


def check_db_connection():
    """Comprueba la conexión de verdad, con una consulta trivial.

    Devuelve (ok, detalle_del_error). Que DATABASE_URL exista no garantiza que
    la base responda: la credencial puede estar mal, el host puede ser otro o
    el firewall puede bloquear la salida. /health lo usa para distinguir
    "configurada" de "conectada".
    """
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return True, None
    except Exception as e:
        return False, f"{type(e).__name__}: {e}".strip()


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


FEATURE_NAMES = [
    "num_creditos_previos_cerrados",
    "ratio_pagados_a_tiempo_previo",
    "dias_atraso_promedio_previo",
    "antiguedad_meses",
    "num_creditos_abiertos",
    "num_abiertos_en_mora",
    "dias_atraso_max_abierto",
    "saldo_abierto",
    "ratio_saldo_en_mora",
]


def _fetch_creditos(id_cliente=None, id_tendero=None, solo_cerrados=False):
    """Créditos del par (o de toda la base) con último abono.

    Ordenados por (id_cliente, id_tendero, fecha_credito) para acumular
    historial previo en una sola pasada.
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
    filtro_estado = "AND cr.estado IN ('pagado', 'vencido')" if solo_cerrados else ""

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
                    cr.monto_total,
                    cr.saldo_pendiente,
                    cl.created_at AS cliente_created_at,
                    (
                        SELECT MAX(a.fecha_abono) FROM abonos a WHERE a.id_credito = cr.id_credito
                    ) AS ultimo_abono
                FROM creditos cr
                JOIN clientes cl ON cl.id_cliente = cr.id_cliente
                WHERE 1=1 {filtro_estado} {where_extra}
                ORDER BY cr.id_cliente, cr.id_tendero, cr.fecha_credito ASC
                """,
                params,
            )
            return cur.fetchall()


def _fetch_creditos_cerrados(id_cliente=None, id_tendero=None):
    return _fetch_creditos(id_cliente, id_tendero, solo_cerrados=True)


def _estaba_abierto_en(credito, instante):
    """True si el crédito ya existía en `instante` y aún no se había pagado."""
    t = _a_datetime(instante)
    inicio = _a_datetime(credito["fecha_credito"])
    if inicio is None or t is None or inicio >= t:
        return False
    if credito["estado"] == "pagado":
        ultimo = credito["ultimo_abono"]
        if ultimo is None:
            return False
        return _a_datetime(ultimo) > t
    return True


def _libro_abierto(creditos_par, instante, exclude_id=None):
    """Estado de cartera abierta del par en `instante`, sin el crédito que se etiqueta.

    Aproxima el saldo: si el crédito sigue sin pagar se usa saldo_pendiente;
    si se pagó después de T se usa monto_total (estaba impago en T).
    """
    t = _a_datetime(instante)
    abiertos = [
        c for c in creditos_par
        if c["id_credito"] != exclude_id and _estaba_abierto_en(c, t)
    ]
    if not abiertos:
        return 0, 0, 0.0, 0.0, 0.0

    num_abiertos = len(abiertos)
    num_mora = 0
    dias_max = 0.0
    saldo = 0.0
    saldo_mora = 0.0

    for c in abiertos:
        if c["estado"] == "pagado":
            monto = float(c["monto_total"] or 0)
        else:
            monto = float(c["saldo_pendiente"] or 0)
        saldo += monto

        limite = _a_datetime(c["fecha_limite_pago"])
        dias = (t - limite).days if limite is not None else 0
        if dias > 0:
            num_mora += 1
            dias_max = max(dias_max, float(min(dias, 365)))
            saldo_mora += monto

    ratio_mora = (saldo_mora / saldo) if saldo > 0 else 0.0
    return num_abiertos, num_mora, dias_max, saldo, ratio_mora


def _vector_features(num_previos, ratio_a_tiempo, atraso_promedio, antiguedad_meses, libro):
    num_abiertos, num_mora, dias_max, saldo, ratio_mora = libro
    return [
        num_previos,
        ratio_a_tiempo,
        atraso_promedio,
        antiguedad_meses,
        num_abiertos,
        num_mora,
        dias_max,
        saldo,
        ratio_mora,
    ]


def build_training_rows():
    """Arma (X, y) para entrenar el RF a partir de desenlaces reales de créditos.

    Cada fila es un crédito cerrado histórico. Las features se calculan SOLO
    con datos del mismo par anteriores a ese crédito (fecha_credito): historial
    cerrado previo + libro abierto en T. No se usan monto ni plazo del crédito
    que se etiqueta. La antigüedad es contra la fecha de ESE crédito, no hoy.

    Limitación conocida: no existe historial de estados, así que "abierto en T"
    se aproxima con fecha_credito, fecha de último abono y estado final.
    """
    todos = _fetch_creditos()
    por_par = defaultdict(list)
    for r in todos:
        por_par[(r["id_cliente"], r["id_tendero"])].append(r)

    historial_cerrado = defaultdict(list)
    X, y = [], []

    cerrados = [r for r in todos if r["estado"] in ("pagado", "vencido")]
    cerrados.sort(key=lambda r: (r["id_cliente"], r["id_tendero"], r["fecha_credito"]))

    for r in cerrados:
        par = (r["id_cliente"], r["id_tendero"])
        previos = historial_cerrado[par]
        num_previos = len(previos)

        if num_previos > 0:
            ratio_a_tiempo = sum(1 for etiqueta, _ in previos if etiqueta == "bueno") / num_previos
            atraso_promedio = sum(dias for _, dias in previos) / num_previos
        else:
            ratio_a_tiempo = 0.0
            atraso_promedio = 0.0

        antiguedad_meses = _meses_entre(r["cliente_created_at"], r["fecha_credito"])
        libro = _libro_abierto(por_par[par], r["fecha_credito"], exclude_id=r["id_credito"])
        etiqueta, dias_atraso = _clasificar_credito(r["estado"], r["fecha_limite_pago"], r["ultimo_abono"])

        X.append(_vector_features(
            num_previos, ratio_a_tiempo, atraso_promedio, antiguedad_meses, libro,
        ))
        y.append(etiqueta)
        historial_cerrado[par].append((etiqueta, dias_atraso))

    return X, y


def get_features_for_pair(id_cliente: int, id_tendero: int):
    """Features en vivo para decidir sobre un crédito NUEVO de este par.

    Historial cerrado = todos los pagados/vencidos de hoy.
    Libro abierto = vigentes y vencidos impagos ahora (y su mora).
    Antigüedad contra el momento actual.

    Devuelve None si no hay créditos cerrados: el backend aplica la regla de
    cliente nuevo y no llama al RF.
    """
    todos = _fetch_creditos(id_cliente, id_tendero)
    cerrados = [r for r in todos if r["estado"] in ("pagado", "vencido")]
    if not cerrados:
        return None

    etiquetas_dias = [
        _clasificar_credito(r["estado"], r["fecha_limite_pago"], r["ultimo_abono"])
        for r in cerrados
    ]
    num_previos = len(etiquetas_dias)
    ratio_a_tiempo = sum(1 for etiqueta, _ in etiquetas_dias if etiqueta == "bueno") / num_previos
    atraso_promedio = sum(dias for _, dias in etiquetas_dias) / num_previos
    antiguedad_meses = _meses_entre(cerrados[0]["cliente_created_at"], datetime.now())
    libro = _libro_abierto(todos, datetime.now())

    return _vector_features(
        num_previos, ratio_a_tiempo, atraso_promedio, antiguedad_meses, libro,
    )


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
