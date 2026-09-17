"""
SENSORA 2.0 - MACHINE LEARNING PIPELINE
Model 1: Flood Type Classifier (Random Forest)
Model 2: Flood Risk Predictor (Random Forest)
"""

import os
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "flood_dataset.csv"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

MODEL1_PATH = MODELS_DIR / "flood_classifier.pkl"
MODEL2_PATH = MODELS_DIR / "risk_model.pkl"
METRICS_PATH = MODELS_DIR / "risk_metrics.json"

RISK_LEVEL_CLASSES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
FLOOD_TYPE_CLASSES = ["Slow Saturation", "Cloudburst", "Rapid-Rise", "Sudden Upstream"]

# Feature sets
M1_NUMERIC_FEATURES = [
    "rainfall_mm",
    "rainfall_intensity_mm_hr",
    "rainfall_duration_hr",
    "water_level_m",
    "water_level_rise_rate_m_hr",
    "water_level_acceleration_m_hr2",
    "soil_moisture_percent",
    "saturation_index",
    "elevation_m",
    "distance_from_river_m"
]
M1_CATEGORICAL_FEATURES = [
    "vulnerability_level"
]

M2_NUMERIC_FEATURES = [
    "rainfall_mm",
    "rainfall_intensity_mm_hr",
    "rainfall_duration_hr",
    "water_level_m",
    "water_level_rise_rate_m_hr",
    "water_level_acceleration_m_hr2",
    "soil_moisture_percent",
    "saturation_index",
    "elevation_m",
    "distance_from_river_m"
]
M2_CATEGORICAL_FEATURES = [
    "vulnerability_level",
    "flood_type"
]


# ==========================================
# MODEL 1: FLOOD TYPE CLASSIFIER
# ==========================================

def get_or_train_model1():
    """Load or initialize Model 1 (Flood Type Classifier) on flood_dataset.csv"""
    if MODEL1_PATH.exists():
        try:
            bundle = joblib.load(MODEL1_PATH)
            return bundle
        except Exception as e:
            print(f"Reloading Model 1 due to: {e}")

    # Train Model 1 once if not already present
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    features = M1_NUMERIC_FEATURES + M1_CATEGORICAL_FEATURES
    X = df[features].copy()
    y = df["flood_type"].astype(str).str.strip()

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", M1_NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), M1_CATEGORICAL_FEATURES)
        ]
    )

    X_trans = preprocessor.fit_transform(X)
    clf = RandomForestClassifier(n_estimators=120, random_state=42, class_weight="balanced")
    clf.fit(X_trans, y)

    bundle = {
        "model": clf,
        "preprocessor": preprocessor,
        "classes": clf.classes_.tolist()
    }
    joblib.dump(bundle, MODEL1_PATH)
    print(f"Model 1 (Flood Type) saved to {MODEL1_PATH}")
    return bundle


def predict_model1_flood_type(sample_dict: dict):
    """
    Run Model 1 inference on environmental data to predict flood_type and confidence.
    """
    bundle = get_or_train_model1()
    model = bundle["model"]
    preprocessor = bundle["preprocessor"]

    row_data = {}
    for feat in M1_NUMERIC_FEATURES:
        row_data[feat] = float(sample_dict.get(feat, 0.0))
    for feat in M1_CATEGORICAL_FEATURES:
        row_data[feat] = str(sample_dict.get(feat, "MEDIUM")).upper()

    df_single = pd.DataFrame([row_data])
    X_trans = preprocessor.transform(df_single)
    pred_label = model.predict(X_trans)[0]
    probs = model.predict_proba(X_trans)[0]
    max_idx = int(np.argmax(probs))
    confidence = float(probs[max_idx]) * 100.0

    return {
        "flood_type": str(pred_label),
        "confidence": round(confidence, 1),
        "probabilities": {str(cls): round(float(p) * 100.0, 1) for cls, p in zip(model.classes_, probs)}
    }


# ==========================================
# MODEL 2: FLOOD RISK PREDICTION
# ==========================================

def train_model2_pipeline():
    """
    Separate Model 2 training pipeline using RandomForestClassifier from scikit-learn.
    Target: risk_level (LOW, MEDIUM, HIGH, CRITICAL)
    Features: 12 features including flood_type.
    Calculates actual:
    - Accuracy
    - Precision
    - Recall
    - F1-score
    - Confusion Matrix
    - Feature Importance
    Saves separately to models/risk_model.pkl and metrics to models/risk_metrics.json.
    """
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    all_m2_features = M2_NUMERIC_FEATURES + M2_CATEGORICAL_FEATURES

    # Verify required columns exist
    missing = [col for col in all_m2_features + ["risk_level"] if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in dataset: {missing}")

    X = df[all_m2_features].copy()
    y = df["risk_level"].astype(str).str.strip().str.upper()

    # Normalize categorical values
    X["vulnerability_level"] = X["vulnerability_level"].astype(str).str.strip().str.upper()
    X["flood_type"] = X["flood_type"].astype(str).str.strip()

    # Preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", M2_NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), M2_CATEGORICAL_FEATURES)
        ]
    )

    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    X_train_trans = preprocessor.fit_transform(X_train_raw)
    X_test_trans = preprocessor.transform(X_test_raw)

    # Scikit-learn RandomForestClassifier
    rf = RandomForestClassifier(
        n_estimators=150,
        random_state=42,
        class_weight="balanced",
        max_depth=16,
        min_samples_leaf=2
    )
    rf.fit(X_train_trans, y_train)

    # Test evaluation
    y_pred = rf.predict(X_test_trans)

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    # Confusion Matrix ordered by standard risk classes
    cm = confusion_matrix(y_test, y_pred, labels=RISK_LEVEL_CLASSES)

    # Calculate actual feature importances
    cat_feature_names = []
    if hasattr(preprocessor.named_transformers_["cat"], "get_feature_names_out"):
        cat_feature_names = list(preprocessor.named_transformers_["cat"].get_feature_names_out(M2_CATEGORICAL_FEATURES))
    else:
        cat_feature_names = [f"cat_{i}" for i in range(X_train_trans.shape[1] - len(M2_NUMERIC_FEATURES))]

    feature_names = M2_NUMERIC_FEATURES + cat_feature_names
    importances = rf.feature_importances_

    feature_importance_list = [
        {"feature": name, "importance": round(float(imp) * 100.0, 2)}
        for name, imp in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
    ]

    metrics = {
        "accuracy": round(acc * 100.0, 2),
        "precision": round(prec * 100.0, 2),
        "recall": round(rec * 100.0, 2),
        "f1_score": round(f1 * 100.0, 2),
        "confusion_matrix": cm.tolist(),
        "confusion_labels": RISK_LEVEL_CLASSES,
        "feature_importances": feature_importance_list,
        "total_samples": int(len(df)),
        "train_samples": int(len(X_train_raw)),
        "test_samples": int(len(X_test_raw)),
        "model_name": "RandomForestClassifier",
        "classes": RISK_LEVEL_CLASSES
    }

    # Save Model 2 bundle
    bundle = {
        "model": rf,
        "preprocessor": preprocessor,
        "classes": rf.classes_.tolist(),
        "metrics": metrics
    }
    joblib.dump(bundle, MODEL2_PATH)

    # Save metrics JSON separately for rapid UI status querying
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"Model 2 trained successfully: Acc={metrics['accuracy']}%, F1={metrics['f1_score']}%")
    print(f"Saved to {MODEL2_PATH}")
    return metrics


def is_model2_trained() -> bool:
    return MODEL2_PATH.exists() and METRICS_PATH.exists()


def get_model2_metrics():
    if not is_model2_trained():
        return None
    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def predict_model2(sample_dict: dict):
    """
    Direct Model 2 Risk Level Inference:
    Simulation Environmental Data -> Model 2 -> Risk Level
    Uses the existing trained Model 2 without altering Model 1.
    """
    if not is_model2_trained():
        return {
            "success": False,
            "error": "Please train the risk model before prediction."
        }

    # Step 1: Model 1 prediction
    m1_res = predict_model1_flood_type(sample_dict)
    sim_flood_type = sample_dict.get("flood_type", sample_dict.get("floodType"))
    if not sim_flood_type or sim_flood_type == "MONITORING":
        chosen_flood_type = m1_res["flood_type"]
        m1_confidence = m1_res["confidence"]
    else:
        chosen_flood_type = str(sim_flood_type)
        m1_confidence = float(sample_dict.get("confidence", m1_res["confidence"]))

    bundle2 = joblib.load(MODEL2_PATH)
    rf2 = bundle2["model"]
    preprocessor2 = bundle2["preprocessor"]

    row_data = {}
    for feat in M2_NUMERIC_FEATURES:
        if feat in sample_dict:
            row_data[feat] = float(sample_dict[feat])
        elif feat == "rainfall_intensity_mm_hr":
            row_data[feat] = float(sample_dict.get("rainfall_mm", sample_dict.get("rainfall", 0.0)))
        elif feat == "rainfall_duration_hr":
            row_data[feat] = float(sample_dict.get("duration", 1.0))
        elif feat == "saturation_index":
            sm = float(sample_dict.get("soil_moisture_percent", sample_dict.get("soilMoisture", 50.0)))
            row_data[feat] = round(sm / 100.0, 3)
        elif feat == "water_level_rise_rate_m_hr":
            row_data[feat] = float(sample_dict.get("riseRate", 0.0))
        elif feat == "elevation_m":
            row_data[feat] = float(sample_dict.get("elevation", 5.0))
        elif feat == "distance_from_river_m":
            row_data[feat] = float(sample_dict.get("distance", 100.0))
        else:
            row_data[feat] = float(sample_dict.get(feat, 0.0))

    row_data["vulnerability_level"] = str(sample_dict.get("vulnerability_level", sample_dict.get("vulnerability", "MEDIUM"))).upper()
    row_data["flood_type"] = str(chosen_flood_type)

    df_single = pd.DataFrame([row_data])
    X_trans = preprocessor2.transform(df_single)

    risk_pred = str(rf2.predict(X_trans)[0])
    raw_probs = rf2.predict_proba(X_trans)[0]

    prob_dict = {cls: 0.0 for cls in RISK_LEVEL_CLASSES}
    for cls, p in zip(rf2.classes_, raw_probs):
        prob_dict[cls] = round(float(p) * 100.0, 1)

    risk_prob = prob_dict.get(risk_pred, 0.0)
    top_features = bundle2["metrics"].get("feature_importances", [])[:5] if "metrics" in bundle2 else []

    return {
        "success": True,
        "flood_type": chosen_flood_type,
        "confidence": m1_confidence,
        "risk_level": risk_pred,
        "risk_probability": risk_prob,
        "probabilities": prob_dict,
        "top_features": top_features,
        "pipeline": {
            "model1": {
                "flood_type": chosen_flood_type,
                "confidence": m1_confidence
            },
            "model2": {
                "risk_level": risk_pred,
                "risk_probability": risk_prob,
                "probabilities": prob_dict,
                "top_features": top_features
            }
        }
    }


def predict_pipeline(sample_dict: dict):
    """
    Full End-to-End Prediction Pipeline:
    New Data -> Model 1 -> Predicted Flood Type -> Model 2 -> Predicted Risk Level
    """
    if not is_model2_trained():
        return {
            "success": False,
            "error": "Please train the risk model before prediction."
        }

    # 1. Run Model 1 on Environmental Data
    m1_res = predict_model1_flood_type(sample_dict)
    predicted_flood_type = m1_res["flood_type"]
    m1_confidence = m1_res["confidence"]

    # 2. Prepare Feature Vector for Model 2 (Environmental Data + Model 1's Predicted Flood Type)
    bundle2 = joblib.load(MODEL2_PATH)
    rf2 = bundle2["model"]
    preprocessor2 = bundle2["preprocessor"]

    row_data = {}
    for feat in M2_NUMERIC_FEATURES:
        row_data[feat] = float(sample_dict.get(feat, 0.0))
    
    row_data["vulnerability_level"] = str(sample_dict.get("vulnerability_level", "MEDIUM")).upper()
    row_data["flood_type"] = predicted_flood_type

    df_single = pd.DataFrame([row_data])
    X_trans = preprocessor2.transform(df_single)

    # 3. Model 2 Prediction
    risk_pred = str(rf2.predict(X_trans)[0])
    raw_probs = rf2.predict_proba(X_trans)[0]

    # Map probability to class list
    prob_dict = {cls: 0.0 for cls in RISK_LEVEL_CLASSES}
    for cls, p in zip(rf2.classes_, raw_probs):
        prob_dict[cls] = round(float(p) * 100.0, 1)

    # Top feature importances
    top_features = bundle2["metrics"].get("feature_importances", [])[:5]

    return {
        "success": True,
        "pipeline": {
            "model1": {
                "flood_type": predicted_flood_type,
                "confidence": m1_confidence
            },
            "model2": {
                "risk_level": risk_pred,
                "probabilities": prob_dict,
                "top_features": top_features
            }
        }
    }


if __name__ == "__main__":
    import sys
    print("Ensuring Model 1 is initialized...")
    get_or_train_model1()

    if "--train" in sys.argv:
        print("Training Model 2...")
        train_model2_pipeline()
    else:
        print("Running test prediction...")
        if not is_model2_trained():
            print("Training Model 2 first...")
            train_model2_pipeline()

        test_sample = {
            "rainfall_mm": 95.0,
            "rainfall_intensity_mm_hr": 48.0,
            "rainfall_duration_hr": 2.5,
            "water_level_m": 4.8,
            "water_level_rise_rate_m_hr": 0.85,
            "water_level_acceleration_m_hr2": 0.22,
            "soil_moisture_percent": 88.0,
            "saturation_index": 0.85,
            "elevation_m": 22.0,
            "distance_from_river_m": 85.0,
            "vulnerability_level": "HIGH"
        }
        res = predict_pipeline(test_sample)
        print("Pipeline Result:")
        print(json.dumps(res, indent=2))
