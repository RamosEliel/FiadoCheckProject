"""Verificacion del arreglo: llama a /predict por HTTP para varios pares."""
import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"

UMBRALES = [(80, "bajo"), (50, "medio"), (0, "alto")]


def nivel_esperado(p):
    for minimo, nivel in UMBRALES:
        if p >= minimo:
            return nivel
    return "?"


def post(path, payload):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        cuerpo = e.read().decode()
        try:
            return e.code, json.loads(cuerpo)
        except Exception:
            return e.code, {"_cuerpo_crudo": cuerpo}


PARES = [(1, 1), (2, 1), (4, 2), (6, 6), (5, 3), (10, 10)]

print(f"{'cliente':>7} {'tendero':>7} {'HTTP':>5}  {'nivel':<7} {'puntaje':>7} {'confianza':>9} {'limite':>12}  coherente")
print("-" * 80)
for cid, tid in PARES:
    status, body = post("/predict", {"id_cliente": cid, "id_tendero": tid})
    if "error" in body:
        print(f"{cid:>7} {tid:>7} {status:>5}  error: {body}")
        continue
    p = body["puntaje"]
    c = body["confianza"]
    ok_conf = isinstance(c, (int, float)) and 0.0 <= c <= 1.0
    ok_nivel = body["nivel_riesgo"] == nivel_esperado(p)
    print(
        f"{cid:>7} {tid:>7} {status:>5}  {body['nivel_riesgo']:<7} {p:>7} {c:>9} "
        f"{body['limite_sugerido']:>12,.0f}  "
        f"{'SI' if (ok_conf and ok_nivel) else 'NO'} "
        f"(confianza 0-1: {ok_conf}, nivel vs umbral: {ok_nivel})"
    )

print("\n=== casos de error (deben traer mensaje util, no 500 vacio) ===")
for cid, tid in [(3, 1), (99999, 99999)]:
    status, body = post("/predict", {"id_cliente": cid, "id_tendero": tid})
    print(f"  cliente={cid} tendero={tid} -> HTTP {status} {json.dumps(body, ensure_ascii=False)}")
