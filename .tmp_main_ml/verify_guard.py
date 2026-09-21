"""Comprueba la guarda de desajuste entre modelo.pkl y features.py."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", "ml_service"))

import predict as p  # noqa: E402

# Simula que features.py devuelve 5 features mientras el modelo espera 4.
p.get_features_for_pair = lambda c, t: [1, 0.5, 3.0, 4.0, 99.0]

resp = p.predict(p.PredictRequest(id_cliente=1, id_tendero=1))
print("status:", resp.status_code)
print("cuerpo:", json.loads(resp.body.decode()))
