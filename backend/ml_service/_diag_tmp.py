"""Script de diagnostico de un solo uso (temporal). Solo lee."""
import os
import pickle
import traceback

import numpy as np
import sklearn

print("python packages:")
print("  sklearn:", sklearn.__version__)
print("  numpy  :", np.__version__)

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelo.pkl")
print("\n=== modelo.pkl ===")
try:
    with open(MODEL_PATH, "rb") as f:
        data = pickle.load(f)
    clf = data["model"]
    le = data["label_encoder"]
    print("  n_features_in_:", getattr(clf, "n_features_in_", "?"))
    print("  classes (le)  :", list(le.classes_))
    print("  clf classes_  :", list(clf.classes_))
    print("  sklearn ver del pickle:", getattr(clf, "__sklearn_version__", "?"))
except Exception:
    traceback.print_exc()

print("\n=== features.py ===")
try:
    from features import get_features_for_pair, get_limit_data
    print("  DATABASE_URL definida:", bool(os.environ.get("DATABASE_URL")))
    url = os.environ.get("DATABASE_URL", "")
    if url:
        import re
        print("  DATABASE_URL (enmascarada):", re.sub(r":[^:@/]+@", ":***@", url))
except Exception:
    traceback.print_exc()
    raise SystemExit(1)

PARES = [(1, 1), (2, 1), (3, 1), (4, 2), (6, 6), (5, 3)]

for cid, tid in PARES:
    print(f"\n--- par (cliente={cid}, tendero={tid}) ---")
    try:
        feats = get_features_for_pair(cid, tid)
        print("  features:", feats)
    except Exception:
        print("  EXCEPCION en get_features_for_pair:")
        traceback.print_exc()
        continue
    if feats is None:
        print("  sin creditos cerrados -> None")
        continue
    try:
        proba = clf.predict_proba(np.array([feats]))[0]
        print("  proba:", proba)
    except Exception:
        print("  EXCEPCION en predict_proba:")
        traceback.print_exc()
    try:
        print("  limit_data:", get_limit_data(cid, tid))
    except Exception:
        print("  EXCEPCION en get_limit_data:")
        traceback.print_exc()
