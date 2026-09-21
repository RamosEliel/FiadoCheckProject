import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from features import fetch_all_scoring, count_scoring_records, save_state


def _rule_label(puntaje: int) -> str:
    """Calcula la etiqueta de entrenamiento (nivel de riesgo por reglas) desde puntaje."""
    if puntaje >= 80:
        return "bajo"
    elif puntaje >= 50:
        return "medio"
    else:
        return "alto"


def train_model(output_path="modelo.pkl"):
    rows = fetch_all_scoring()

    if len(rows) < 5:
        print("No hay suficientes datos para entrenar el modelo.")
        return None

    # rows = [pts_puntualidad, pts_historial, pts_cumplimiento, pts_antiguedad, nivel_riesgo]
    # puntaje se recalcula como suma de las 4 variables y se incluye como feature #5
    X = []
    y_raw = []
    for r in rows:
        p1, p2, p3, p4, _ = r
        puntaje = p1 + p2 + p3 + p4
        X.append([p1, p2, p3, p4, puntaje])
        y_raw.append(_rule_label(puntaje))

    X = np.array(X)
    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)

    with open(output_path, "wb") as f:
        pickle.dump({"model": clf, "label_encoder": le}, f)

    current_count = count_scoring_records()
    save_state({"last_train_count": current_count})
    print(f"Modelo entrenado y guardado en {output_path}. Registros usados: {current_count}")
    return output_path


if __name__ == "__main__":
    train_model()
