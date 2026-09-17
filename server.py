"""
SENSORA 2.0 - BACKEND API SERVER
Serves Model 1 & Model 2 Training, Status, and Prediction APIs
"""

import json
from flask import Flask, request, jsonify
from ml_pipeline import (
    is_model2_trained,
    get_model2_metrics,
    train_model2_pipeline,
    predict_pipeline,
    predict_model2,
    get_or_train_model1
)

app = Flask(__name__)

# Enable CORS manually for all incoming requests from Vite (e.g. localhost:5173)
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Sensora 2.0 ML Service"})


@app.route("/api/model2/status", methods=["GET"])
def model2_status():
    trained = is_model2_trained()
    metrics = get_model2_metrics() if trained else None
    return jsonify({
        "trained": trained,
        "metrics": metrics
    })


@app.route("/api/model2/train", methods=["POST", "OPTIONS"])
def model2_train():
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200

    try:
        # Train Model 2 and return real evaluation metrics
        metrics = train_model2_pipeline()
        return jsonify({
            "success": True,
            "message": "Model 2 trained successfully",
            "metrics": metrics
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/model2/predict", methods=["POST", "OPTIONS"])
def model2_predict():
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200

    try:
        payload = request.get_json(force=True) or {}
        result = predict_model2(payload)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    # Ensure Model 1 is ready
    get_or_train_model1()
    print("Starting Sensora 2.0 ML Backend on http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=False)
