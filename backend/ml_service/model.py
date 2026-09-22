import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from features import (
    FEATURE_NAMES,
    build_training_rows,
    count_closed_creditos,
    invalidate_all_scoring_cache,
    save_state,
)


def train_model(output_path="modelo.pkl"):
    X_raw, y_raw = build_training_rows()

    if len(X_raw) < 5:
        print("No hay suficientes datos para entrenar el modelo.")
        return None

    X = np.array(X_raw)
    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    clf = RandomForestClassifier(
        n_estimators=100,
        min_samples_leaf=2,
        random_state=42,
    )
    clf.fit(X, y)

    with open(output_path, "wb") as f:
        pickle.dump({
            "model": clf,
            "label_encoder": le,
            "feature_names": FEATURE_NAMES,
        }, f)

    current_count = count_closed_creditos()
    save_state({"last_train_count": current_count})
    invalidate_all_scoring_cache()
    print(
        f"Modelo entrenado y guardado en {output_path}. "
        f"Créditos cerrados usados: {current_count}. Features: {len(FEATURE_NAMES)}."
    )
    return output_path

    current_count = count_closed_creditos()
    save_state({"last_train_count": current_count})
    print(f"Modelo entrenado y guardado en {output_path}. Créditos cerrados usados: {current_count}")
    return output_path


if __name__ == "__main__":
    train_model()
