import pickle
from collections import Counter

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

from features import fetch_training_rows, count_scoring_records, save_state


def train_model(output_path="modelo.pkl"):
    samples = fetch_training_rows(only_cuaderno_real=True)

    if len(samples) < 5:
        print("No hay suficientes créditos cerrados para entrenar el modelo.")
        return None

    X = np.array([s["features"] for s in samples], dtype=float)
    y_raw = [s["label"] for s in samples]
    print("Etiquetas:", dict(Counter(y_raw)))
    print("Filas de entrenamiento:", len(samples))

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    clf = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight="balanced",
    )
    clf.fit(X, y)

    with open(output_path, "wb") as f:
        pickle.dump({"model": clf, "label_encoder": le, "feature_names": [
            "num_creditos_previos_cerrados",
            "ratio_pagados_a_tiempo_previo",
            "dias_atraso_promedio_previo",
            "antiguedad_meses",
        ]}, f)

    current_count = count_scoring_records()
    save_state({"last_train_count": current_count})
    print(f"Modelo entrenado y guardado en {output_path}. Créditos cerrados: {current_count}")
    return output_path


if __name__ == "__main__":
    train_model()
