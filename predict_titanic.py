import joblib
import numpy as np

# Загружаем модель и список признаков
model = joblib.load("titanic_logreg.joblib")
features = joblib.load("titanic_features.joblib")

print("Модель загружена. Ожидаемые признаки:")
print(features)
print()

# Пример: новый пассажир
# pclass, sex, age, alone, has_sibling, has_parent, family_size, fare_log, emb_Q, emb_S
new_passenger = {
    "pclass": 1,
    "sex": 1,           # 1 = female
    "age": 30,
    "alone": 0,
    "has_sibling": 1,
    "has_parent": 0,
    "family_size": 2,
    "fare_log": np.log1p(100),  # 100 фунтов
    "emb_Q": 0,
    "emb_S": 1,
}

# Превращаем в массив в правильном порядке
X_new = np.array([[new_passenger[f] for f in features]])

# Предсказание
pred = model.predict(X_new)[0]
proba = model.predict_proba(X_new)[0]

print(f"Предсказание: {'ВЫЖИЛ' if pred == 1 else 'ПОГИБ'}")
print(f"Вероятность выжить: {proba[1]:.1%}")
print(f"Вероятность погибнуть: {proba[0]:.1%}")