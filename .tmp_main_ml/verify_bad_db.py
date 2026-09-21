"""Comprueba que /predict devuelve un cuerpo util cuando la base no responde."""
import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8010"

req = urllib.request.Request(
    f"{BASE}/predict",
    data=json.dumps({"id_cliente": 1, "id_tendero": 1}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=60) as res:
        print("HTTP", res.status, "->", res.read().decode())
except urllib.error.HTTPError as e:
    cuerpo = e.read().decode()
    print("HTTP", e.code, "-> cuerpo crudo:", repr(cuerpo))
