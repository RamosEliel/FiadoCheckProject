import os
import pickle
import threading
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from features import (
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


@app.get("/health")
def health():
    """Estado del microservicio.

    Permite comprobar desde fuera si el servicio responde y si el modelo está
    cargado, sin tener que recurrir a /docs ni provocar una predicción real.
    """
    state = load_state()
    return {
        "status": "ok",
        "service": "fiadocheck-ml",
        "modelo_cargado": _get_model() is not None,
        "db_configurada": bool(os.environ.get("DATABASE_URL")),
        "last_train_count": state.get("last_train_count", 0),
    }


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

    features = get_features_for_pair(req.id_cliente, req.id_tendero)
    if features is None:
        return {"error": "No se encontraron créditos cerrados para este par cliente-tendero"}

    X = np.array([features])
    proba = model_data["model"].predict_proba(X)[0]
    classes = model_data["label_encoder"].classes_
    confidence = float(np.max(proba))

    puntaje = round(100 * sum(GOODNESS_WEIGHTS.get(cls, 0.5) * p for cls, p in zip(classes, proba)))
    puntaje = max(0, min(100, puntaje))

    if puntaje >= 80:
        nivel_riesgo = "bajo"
    elif puntaje >= 50:
        nivel_riesgo = "medio"
    else:
        nivel_riesgo = "alto"

    base, saldo_pendiente = get_limit_data(req.id_cliente, req.id_tendero)

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
    if not _should_retrain():
        return {
            "status": "skipped",
            "message": "No se alcanzó el umbral del 20% de registros nuevos.",
            "current_count": count_closed_creditos(),
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
