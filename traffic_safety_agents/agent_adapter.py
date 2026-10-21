"""
traffic_safety_agents/agent_adapter.py

Universal Model Output Normalization Adapter.

Adapts any traffic sign detector / classifier model output into a standardized
(label: str, confidence: float) tuple for the TrafficSafetyCoordinator.

Supports:
- CNN / PyTorch classification dictionaries (e.g. from src.predict.TrafficSignPredictor)
- Raw PyTorch logits / probabilities tensor
- YOLO / Object Detection format (list of boxes with cls & conf)
- Direct (label, confidence) tuples
- Class index integers with lookup tables
"""

from typing import Any, Tuple, Optional, Dict, Union
import numpy as np


class ModelOutputAdapter:
    """Universal adapter for normalising heterogeneous model predictions."""

    def __init__(self, class_mapping: Optional[Dict[int, str]] = None):
        self.class_mapping = class_mapping or {}

    def normalize(self, prediction_output: Any) -> Tuple[Optional[str], float]:
        """
        Extracts (label, confidence) from arbitrary model prediction outputs.

        Returns:
            Tuple[Optional[str], float]: (clean_label_str, confidence_0_to_1)
        """
        if prediction_output is None:
            return None, 0.0

        # Case 1: Already a tuple/list of (label, confidence)
        if isinstance(prediction_output, (tuple, list)) and len(prediction_output) == 2:
            lbl, conf = prediction_output
            try:
                return str(lbl) if lbl else None, float(conf)
            except (ValueError, TypeError):
                return str(lbl) if lbl else None, 0.0

        # Case 2: Dict output (e.g. src.predict format)
        if isinstance(prediction_output, dict):
            # Check common key names
            label = (
                prediction_output.get("class_name")
                or prediction_output.get("label")
                or prediction_output.get("name")
                or prediction_output.get("sign_name")
            )
            
            # Confidence key
            conf = (
                prediction_output.get("confidence_score")
                or prediction_output.get("confidence")
                or prediction_output.get("conf")
                or prediction_output.get("score")
            )

            # If confidence is in 0-100 range, convert to 0-1
            if conf is None and "confidence_percentage" in prediction_output:
                conf = prediction_output["confidence_percentage"] / 100.0

            # Fallback to class_id lookup if class_name missing
            if not label and "class_id" in prediction_output:
                cid = int(prediction_output["class_id"])
                label = self.class_mapping.get(cid, f"Class_{cid}")

            conf_val = float(conf) if conf is not None else 0.0
            return str(label) if label else None, conf_val

        # Case 3: YOLO Detection Results (list of detections)
        if isinstance(prediction_output, list):
            if not prediction_output:
                return None, 0.0
            # If list of detection dicts, pick detection with highest confidence
            top_det = max(
                prediction_output,
                key=lambda d: d.get("confidence_score", d.get("conf", 0.0)) if isinstance(d, dict) else 0.0
            )
            return self.normalize(top_det)

        # Case 4: Raw integer class ID
        if isinstance(prediction_output, (int, np.integer)):
            cid = int(prediction_output)
            label = self.class_mapping.get(cid, f"Class_{cid}")
            return label, 1.0

        # Fallback
        return str(prediction_output), 1.0
