"""
Evalúa el Random Forest de scoring con validación cruzada.

No reentrena ni reemplaza modelo.pkl -- solo mide qué tan bien predice un
modelo con la misma configuración de model.py (RandomForestClassifier,
n_estimators=100, random_state=42). Usa validación cruzada estratificada en
vez de un solo split train/test porque el volumen de créditos cerrados suele
ser pequeño, y un split fijo dejaría muy pocos ejemplos por clase para medir
algo confiable.

Uso:
    python evaluate_model.py
"""

import sys
from collections import Counter

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from features import build_training_rows

N_ESTIMATORS = 100
RANDOM_STATE = 42
ORDEN_CLASES = ("bueno", "regular", "malo")


def evaluate():
    X_raw, y_raw = build_training_rows()
    n = len(X_raw)

    if n < 10:
        print(f"Solo hay {n} créditos cerrados -- muy pocos para una evaluación confiable.")
        print("Se necesitan al menos ~10-15 para que la validación cruzada tenga sentido.")
        return

    X = np.array(X_raw)
    y = np.array(y_raw)

    conteo = Counter(y_raw)
    print("=== Distribución de clases ===")
    for clase in ORDEN_CLASES:
        print(f"  {clase}: {conteo.get(clase, 0)}")
    print(f"  Total: {n}\n")

    min_por_clase = min(conteo.values())
    if min_por_clase < 2:
        print(f"La clase con menos ejemplos tiene solo {min_por_clase} caso(s).")
        print("No hay suficientes datos de esa clase para validación cruzada todavía.")
        print("Vuelve a correr este script cuando haya más créditos cerrados de esa clase.")
        return

    n_folds = min(5, min_por_clase)
    print(f"=== Validación cruzada ({n_folds} folds) ===\n")

    clf = RandomForestClassifier(n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE)
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=RANDOM_STATE)
    y_pred = cross_val_predict(clf, X, y, cv=skf)

    etiquetas = [c for c in ORDEN_CLASES if c in conteo]

    print(f"Accuracy global: {accuracy_score(y, y_pred):.2%}\n")

    print("=== Reporte por clase (precision / recall / f1) ===")
    print(classification_report(y, y_pred, labels=etiquetas, zero_division=0))

    print("=== Matriz de confusión ===")
    print("Filas = clase real, columnas = clase predicha")
    matriz = confusion_matrix(y, y_pred, labels=etiquetas)
    encabezado = "".join(f"{e:>10}" for e in etiquetas)
    print(f"{'':>10}{encabezado}")
    for etiqueta, fila in zip(etiquetas, matriz):
        valores = "".join(f"{v:>10}" for v in fila)
        print(f"{etiqueta:>10}{valores}")
    print()

    reporte = classification_report(y, y_pred, labels=etiquetas, output_dict=True, zero_division=0)
    print("=== Métrica clave para scoring crediticio ===")
    if "malo" in reporte:
        print(f"Recall de la clase 'malo': {reporte['malo']['recall']:.2%}")
        print("(de los créditos que en la realidad quedaron vencidos, este % el modelo")
        print(" sí los marcó como riesgo alto)")
    else:
        print("No hay créditos etiquetados como 'malo' todavía en los datos cerrados.")


if __name__ == "__main__":
    evaluate()
