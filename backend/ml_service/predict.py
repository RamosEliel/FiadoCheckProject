import os
import pickle
import threading
import traceback
import numpy as np
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from features import (
    check_db_connection,
    get_features_for_pair,
    get_limit_data,
    count_closed_creditos,
    invalidate_all_scoring_cache,
    load_state,
    save_state,
)
from model import train_model

app = FastAPI()

MODEL_PATH = os.path.join(os.path.dirname(__file__), "modelo.pkl")

# Peso de "bondad" de cada clase real observada en los créditos cerrados, usado
# para convertir las 3 probabilidades del RF en un puntaje continuo 0-100 en
# vez de solo mirar la clase ganadora.
GOODNESS_WEIGHTS = {"bueno": 1.0, "regular": 0.5, "malo": 0.0}

_model_data = None
_model_lock = threading.Lock()


def _load_model():
    global _model_data
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            _model_data = pickle.load(f)
    else:
        _model_data = None


_load_model()


def _get_model():
    global _model_data
    if _model_data is None:
        _load_model()
    return _model_data


def _fallo(mensaje: str, exc: Exception):
    """Respuesta de error de /predict, con el detalle visible y registrado.

    El traceback va a stdout para que quede en los logs del App Service, y el
    cuerpo lleva tipo y mensaje de la excepción porque un 500 vacío no dice
    nada al que llama. La clave `error` es la que mira callMLService en
    backend/src/utils/mlScoring.js para tratar la respuesta como fallo.
    """
    print(f"[ML] {mensaje}: {type(exc).__name__}: {exc}", flush=True)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "error": mensaje,
            "tipo": type(exc).__name__,
            "detalle": str(exc).strip(),
        },
    )


@app.get("/health")
def health():
    """Estado del microservicio.

    Permite comprobar desde fuera si el servicio responde, si el modelo está
    cargado y si la base responde de verdad, sin tener que recurrir a /docs ni
    provocar una predicción real.

    `db_configurada` solo dice que DATABASE_URL existe; `db_conectada` ejecuta
    un SELECT 1 real, que es lo que distingue "la variable está puesta" de "la
    base contesta".
    """
    state = load_state()
    model_data = _get_model()
    db_ok, db_error = check_db_connection()

    cuerpo = {
        "status": "ok" if (model_data is not None and db_ok) else "degradado",
        "service": "fiadocheck-ml",
        "modelo_cargado": model_data is not None,
        "modelo_num_features": (
            getattr(model_data["model"], "n_features_in_", None) if model_data else None
        ),
        "db_configurada": bool(os.environ.get("DATABASE_URL")),
        "db_conectada": db_ok,
        "last_train_count": state.get("last_train_count", 0),
    }
    if db_error:
        cuerpo["db_error"] = db_error
    return cuerpo


class PredictRequest(BaseModel):
    id_cliente: int
    # El scoring es por par (cliente, tendero): un mismo cliente tiene un
    # historial distinto en cada tienda.
    id_tendero: int


class RetrainRequest(BaseModel):
    evento: str = "manual"


@app.post("/predict")
def predict(req: PredictRequest):
    model_data = _get_model()
    if model_data is None:
        return {"error": "Modelo no entrenado. Ejecuta model.py primero."}

    try:
        features = get_features_for_pair(req.id_cliente, req.id_tendero)
    except Exception as e:
        return _fallo(
            f"Error consultando el historial del par cliente={req.id_cliente} "
            f"tendero={req.id_tendero}",
            e,
        )

    if features is None:
        return {"error": "No se encontraron créditos cerrados para este par cliente-tendero"}

    esperadas = getattr(model_data["model"], "n_features_in_", None)
    if esperadas is not None and len(features) != esperadas:
        # El modelo serializado y features.py se desincronizaron: casi siempre
        # significa que modelo.pkl viene de un despliegue anterior al último
        # cambio del conjunto de features. Mejor decirlo que dejar que
        # predict_proba lance un error de forma difícil de leer.
        return _fallo(
            "modelo.pkl desactualizado respecto a features.py",
            ValueError(
                f"el modelo espera {esperadas} features y features.py devolvió "
                f"{len(features)}; reentrena con model.py y vuelve a desplegar"
            ),
        )

    try:
        X = np.array([features])
        proba = model_data["model"].predict_proba(X)[0]
        classes = model_data["label_encoder"].classes_
    except Exception as e:
        return _fallo("Error ejecutando la predicción del Random Forest", e)

    confidence = float(np.max(proba))

    puntaje = round(100 * sum(GOODNESS_WEIGHTS.get(cls, 0.5) * p for cls, p in zip(classes, proba)))
    puntaje = max(0, min(100, puntaje))

    if puntaje >= 80:
        nivel_riesgo = "bajo"
    elif puntaje >= 50:
        nivel_riesgo = "medio"
    else:
        nivel_riesgo = "alto"

    try:
        base, saldo_pendiente = get_limit_data(req.id_cliente, req.id_tendero)
    except Exception as e:
        return _fallo("Error calculando el límite sugerido", e)

    if nivel_riesgo == "bajo":
        factor = 1.5
    elif nivel_riesgo == "medio":
        factor = 1.0
    else:
        factor = 0.5

    limite = base * factor - saldo_pendiente
    limite = max(0.0, min(limite, 300000.0))

    return {
        "nivel_riesgo": nivel_riesgo,
        "puntaje": puntaje,
        "limite_sugerido": float(limite),
        "confianza": round(confidence, 4),
    }


def _should_retrain() -> bool:
    current_count = count_closed_creditos()
    state = load_state()
    last_count = state.get("last_train_count", 0)

    if last_count == 0:
        return current_count >= 5

    growth = (current_count - last_count) / last_count
    return growth >= 0.20


def _retrain_in_background():
    try:
        new_path = train_model()
        if new_path:
            with _model_lock:
                global _model_data
                with open(MODEL_PATH, "rb") as f:
                    _model_data = pickle.load(f)
            invalidate_all_scoring_cache()
            print("[ML] Modelo reentrenado, swapped y caché de predicciones invalidada.")
    except Exception as e:
        print(f"[ML] Error durante reentrenamiento: {e}")


@app.post("/ml/retrain")
def retrain(req: RetrainRequest):
    try:
        debe_reentrenar = _should_retrain()
        current_count = count_closed_creditos()
    except Exception as e:
        return _fallo("Error consultando el volumen de créditos cerrados", e)

    if not debe_reentrenar:
        return {
            "status": "skipped",
            "message": "No se alcanzó el umbral del 20% de registros nuevos.",
            "current_count": current_count,
            "last_train_count": load_state().get("last_train_count", 0),
        }

    threading.Thread(target=_retrain_in_background, daemon=True).start()
    return {
        "status": "training",
        "message": "Reentrenamiento iniciado en background. El modelo actual sigue activo.",
    }


if __name__ == "__main__":
    import uvicorn
    # ML_PORT manda en local; PORT es el que inyecta Azure App Service.
    port = int(os.environ.get("ML_PORT") or os.environ.get("PORT") or 8000)
    uvicorn.run(app, host="0.0.0.0", port=port)
