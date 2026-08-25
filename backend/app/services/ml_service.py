import logging
from typing import Optional
from pathlib import Path
from app.models.schemas import AnomalyResult, AnomalyStatus, PredictionResponse
from app.config import settings

logger = logging.getLogger(__name__)


class MLService:
    """ML inference service.

    Loads a trained model on startup and provides predictions.
    Returns prototype results until a real model is trained (Milestone 7-8).
    """

    def __init__(self):
        self._model = None
        self._model_loaded = False

    def load_model(self):
        """Attempt to load saved model. Non-fatal if missing."""
        model_path = settings.model_path
        if model_path.exists():
            try:
                import joblib
                saved = joblib.load(model_path)
                self._model = saved["model"]
                self._scaler = saved["scaler"]
                self._feature_names = saved["feature_names"]
                self._baseline_stats = saved.get("baseline_stats", {})
                self._model_loaded = True
                logger.info(f"ML model loaded from {model_path}")
                logger.info(f"  Features: {self._feature_names}")
            except Exception as e:
                logger.warning(f"Failed to load ML model: {e}")
        else:
            logger.info("No trained ML model found. ML predictions unavailable.")

    def predict(self, features: dict) -> PredictionResponse:
        if not self._model_loaded:
            return PredictionResponse(
                anomaly_score=0.0,
                status=AnomalyStatus.NORMAL,
                confidence=0.0,
            )

        try:
            import numpy as np
            # Build feature vector in the correct order
            feature_vector = []
            for name in self._feature_names:
                val = features.get(name, 0.0)
                feature_vector.append(float(val) if val is not None else 0.0)

            X = np.array([feature_vector])
            X_scaled = self._scaler.transform(X)
            score = self._model.decision_function(X_scaled)[0]
            # Isolation Forest: lower score = more anomalous
            # Normalize to [0, 1] where 1 = most anomalous
            normalized_score = max(0.0, min(1.0, 0.5 - score))

            if normalized_score >= settings.anomaly_threshold_high:
                status = AnomalyStatus.HIGH
            elif normalized_score >= settings.anomaly_threshold_warning:
                status = AnomalyStatus.WARNING
            else:
                status = AnomalyStatus.NORMAL

            return PredictionResponse(
                anomaly_score=round(normalized_score, 4),
                status=status,
                confidence=0.75,
            )
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return PredictionResponse(
                anomaly_score=0.0,
                status=AnomalyStatus.NORMAL,
                confidence=0.0,
            )

    def get_anomalies(
        self,
        parameter: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> list[AnomalyResult]:
        # Will return real anomalies after model is trained
        return []


ml_service = MLService()
