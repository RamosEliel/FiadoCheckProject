import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from features import build_training_rows, count_closed_creditos, save_state


def train_model(output_path="modelo.pkl"):
    X_raw, y_raw = build_training_rows()

    if len(X_raw) < 5:
        print("No hay suficientes datos para entrenar el modelo.")
        return None

    X = np.array(X_raw)
    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)

    with open(output_path, "wb") as f:
        pickle.dump({"model": clf, "label_encoder": le}, f)

    current_count = count_closed_creditos()
    save_state({"last_train_count": current_count})
    print(f"Modelo entrenado y guardado en {output_path}. Créditos cerrados usados: {current_count}")
    return output_path


if __name__ == "__main__":
    train_model()
