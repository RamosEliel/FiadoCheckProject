import os
import json
import urllib.request
import urllib.error

BASE_URL = os.getenv("ML_BASE_URL", "http://localhost:8000")


def _request(path, payload=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    headers = {"Content-Type": "application/json"} if payload else {}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST" if payload else "GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return json.loads(body)
        except Exception:
            return {"error": f"HTTP {e.code}", "detail": body}
    except Exception as e:
        return {"error": str(e)}


def test_predict(id_cliente, id_tendero):
    print(f"\n>>> POST /predict (id_cliente={id_cliente}, id_tendero={id_tendero})")
    result = _request("/predict", {"id_cliente": id_cliente, "id_tendero": id_tendero})
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def test_retrain(evento="manual"):
    print(f"\n>>> POST /ml/retrain (evento={evento})")
    result = _request("/ml/retrain", {"evento": evento})
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


def run_all_tests():
    print("=" * 50)
    print("PRUEBAS DEL MICROSERVICIO ML (Random Forest)")
    print("=" * 50)

    # 1. Probar predicción con pares (cliente, tendero) existentes
    print("\n--- 1. Predicción con pares cliente-tendero existentes ---")
    for cid, tid in [(1, 1), (1, 2), (10, 10)]:
        test_predict(cid, tid)

    # 2. Probar predicción con par inexistente
    print("\n--- 2. Predicción con par inexistente ---")
    test_predict(99999, 99999)

    # 3. Probar retrain (puede saltar por umbral)
    print("\n--- 3. Solicitud de reentrenamiento ---")
    test_retrain("test_manual")

    print("\n" + "=" * 50)
    print("PRUEBAS COMPLETADAS")
    print("=" * 50)


if __name__ == "__main__":
    run_all_tests()
