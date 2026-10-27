"""
src/driver_alert.py

Driver Alert & Safety Advisory Engine for Universal Traffic Sign Recognition.

Loads metadata for 52 Universal Traffic Signs (Classes 0..51) from dataset/signnames_universal.csv:
- Sign Title / Name
- Safety Risk Level (CRITICAL 🔴, WARNING 🟠, INFORMATIONAL 🔵)
- Required Driving Action / Recommendation
- Text-to-Speech Voice Alert Prompt
"""

import pandas as pd
from pathlib import Path


def load_universal_metadata(csv_path="dataset/signnames_rto.csv"):
    """Loads all official Indian RTO 108 traffic signs and action advisory metadata."""
    import json
    metadata = {}

    json_path = Path("dataset/channelized_signs_108.json")
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as jf:
                channelized = json.load(jf)
            for k, item in channelized.items():
                cid = int(k)
                tier = item.get("urgency", "WARNING")
                metadata[cid] = {
                    "name": item.get("name", f"Class_{cid}"),
                    "name_te": item.get("name_te"),
                    "name_hi": item.get("name_hi"),
                    "tier": tier,
                    "category": item.get("category", "MANDATORY"),
                    "icon": "🔴" if tier == "CRITICAL" else ("🟠" if tier == "WARNING" else "🔵"),
                    "limit": item.get("speed_limit"),
                    "advice": item.get("meaning_en", "Observe traffic sign regulations."),
                    "advice_te": item.get("meaning_te"),
                    "advice_hi": item.get("meaning_hi"),
                    "speech_prompt": item.get("alert_en", "Traffic sign detected."),
                    "speech_en": item.get("alert_en"),
                    "speech_te": item.get("alert_te"),
                    "speech_hi": item.get("alert_hi"),
                    "penalty_info": item.get("penalty_info")
                }
            if len(metadata) >= 100:
                return metadata
        except Exception as e:
            print(f"[WARN] Failed to load channelized_signs_108.json: {e}")

    path = Path(csv_path)
    candidates = [
        path,
        Path("dataset/signnames_rto.csv"),
        Path("training data/labels.csv"),
        Path("dataset/signnames_universal.csv"),
        Path("dataset/signnames.csv"),
        Path("labels.csv")
    ]

    target_csv = None
    for c in candidates:
        if c.exists():
            target_csv = c
            break

    icon_map = {
        "CRITICAL": "🔴",
        "WARNING": "🟠",
        "INFORMATIONAL": "🔵"
    }

    if target_csv:
        df = pd.read_csv(target_csv)
        name_col = 'Name' if 'Name' in df.columns else ('SignName' if 'SignName' in df.columns else None)
        has_rto_cols = ('RiskLevel' in df.columns and 'RequiredAction' in df.columns)

        for _, row in df.iterrows():
            cid = int(row['ClassId'])
            sign_name = str(row[name_col]) if name_col else f"Class_{cid}"

            if has_rto_cols:
                tier = str(row['RiskLevel']).strip() if pd.notna(row.get('RiskLevel')) else "INFORMATIONAL"
                advice = str(row['RequiredAction']).strip() if pd.notna(row.get('RequiredAction')) else f"Observe {sign_name}. Adjust driving accordingly."
                speech_prompt = str(row['TTSPrompt']).strip() if pd.notna(row.get('TTSPrompt')) else f"Attention driver: {sign_name} ahead."
                limit = row['SpeedLimit'] if ('SpeedLimit' in row and pd.notna(row['SpeedLimit'])) else None
            else:
                tier = "INFORMATIONAL"
                limit = None
                advice = f"Observe sign: {sign_name}. Adjust driving accordingly."
                speech_prompt = f"Attention driver: {sign_name} ahead."

            metadata[cid] = {
                "name": sign_name,
                "tier": tier,
                "category": str(row.get("Category", "Mandatory")) if "Category" in row else "Mandatory",
                "icon": icon_map.get(tier, "🔴" if "CRITICAL" in tier else "ℹ️"),
                "limit": limit,
                "advice": advice,
                "speech_prompt": speech_prompt,
                "speech_en": speech_prompt,
                "speech_te": None,
                "speech_hi": None
            }

    return metadata


GTSRB_SAFETY_METADATA = load_universal_metadata()


class DriverAlertSystem:
    """Driver Alert and Safety System for Universal Real-time Classifier."""

    def __init__(self, confidence_threshold=0.60, csv_path="dataset/signnames_rto.csv", lang="en"):
        self.confidence_threshold = confidence_threshold
        self.metadata = load_universal_metadata(csv_path)
        self.lang = lang

    def get_no_detection_payload(self, reason="No Traffic Sign Detected"):
        """Returns standard payload when no traffic sign is detected in frame."""
        return {
            "detected": False,
            "class_id": -1,
            "class_name": "No Traffic Sign Detected",
            "risk_tier": "CLEAR",
            "color_code": "#27ae60",
            "icon": "🟢",
            "advice": "No traffic sign detected. Roadway clear, proceed normally.",
            "speech_prompt": "",
            "speed_limit": None,
            "reason": reason
        }

    def process_detection(self, class_id, confidence_score, lang=None):
        """
        Processes model detection and outputs structured multi-lingual driver alert payload.

        Args:
            class_id (int): Universal class integer (0..107).
            confidence_score (float): Probability confidence score (0.0..1.0).
            lang (str): Language code ('en', 'te', 'hi'). Defaults to self.lang.

        Returns:
            dict with risk level, color badge, TTS alert prompt, and driver recommendations.
        """
        if class_id is None or class_id < 0:
            return self.get_no_detection_payload(reason="No traffic sign candidate found.")

        target_lang = lang or self.lang
        meta = self.metadata.get(class_id, {
            "name": f"Class {class_id}", "tier": "INFORMATIONAL",
            "icon": "ℹ️", "limit": None, "advice": "Traffic Sign Detected.",
            "speech_prompt": "Traffic sign detected."
        })

        is_confirmed = float(confidence_score) >= self.confidence_threshold
        tier = meta["tier"]
        color_map = {
            "CRITICAL": "#e74c3c",      # Vivid Red
            "WARNING": "#e67e22",       # Amber / Orange
            "INFORMATIONAL": "#2980b9"  # Royal Blue
        }

        # Choose localized speech prompt and localized name
        if target_lang == "te" and meta.get("speech_te"):
            speech = meta["speech_te"]
            display_name = meta.get("name_te") or meta["name"]
            display_advice = meta.get("advice_te") or meta["advice"]
        elif target_lang == "hi" and meta.get("speech_hi"):
            speech = meta["speech_hi"]
            display_name = meta.get("name_hi") or meta["name"]
            display_advice = meta.get("advice_hi") or meta["advice"]
        else:
            speech = meta.get("speech_en") or meta["speech_prompt"]
            display_name = meta["name"]
            display_advice = meta["advice"]

        return {
            "detected": True,
            "confirmed": is_confirmed,
            "class_id": class_id,
            "class_name": display_name,
            "sign_name_en": meta["name"],
            "sign_name_te": meta.get("name_te"),
            "sign_name_hi": meta.get("name_hi"),
            "risk_tier": tier if is_confirmed else f"{tier} (UNCONFIRMED)",
            "base_risk_tier": tier,
            "color_code": color_map.get(tier, "#2c3e50") if is_confirmed else "#7f8c8d",
            "icon": meta["icon"] if is_confirmed else "⚠️",
            "advice": display_advice,
            "speech_prompt": speech if is_confirmed else "",
            "speed_limit": meta.get("limit", None),
            "penalty_info": meta.get("penalty_info", ""),
            "reason": "Detection confirmed." if is_confirmed else f"Confidence ({confidence_score*100:.1f}%) is below confirmation threshold ({self.confidence_threshold*100:.1f}%)."
        }


if __name__ == "__main__":
    alert_sys = DriverAlertSystem()
    sample_stop = alert_sys.process_detection(0, 0.95, lang="en")
    print(f"[TEST] Processed Stop Sign (Class 0) in English: {sample_stop['class_name']} -> {sample_stop['speech_prompt']}")
    sample_giveway = alert_sys.process_detection(1, 0.95, lang="en")
    print(f"[TEST] Processed Give Way (Class 1) in English: {sample_giveway['class_name']} -> {sample_giveway['speech_prompt']}")

