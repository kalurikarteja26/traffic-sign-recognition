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
    path = Path(csv_path)
    metadata = {}

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

    # Rich Action & Risk Database fallback for 52 GTSRB classes
    ACTION_LOOKUP = {
        0: {"tier": "WARNING", "limit": 5, "advice": "Strict 5 km/h zone. Maintain crawl speed, watch for pedestrians.", "speech": "Speed limit five kilometers per hour."},
        1: {"tier": "WARNING", "limit": 15, "advice": "15 km/h speed zone. Slow down in residential/parking area.", "speech": "Speed limit fifteen kilometers per hour."},
        2: {"tier": "WARNING", "limit": 30, "advice": "30 km/h speed limit. Watch for residential activity and cyclists.", "speech": "Speed limit thirty kilometers per hour."},
        3: {"tier": "WARNING", "limit": 40, "advice": "40 km/h urban speed limit. Maintain safe following distance.", "speech": "Speed limit forty kilometers per hour."},
        4: {"tier": "WARNING", "limit": 50, "advice": "50 km/h standard urban limit. Monitor intersection traffic.", "speech": "Speed limit fifty kilometers per hour."},
        5: {"tier": "WARNING", "limit": 60, "advice": "60 km/h speed limit. Moderate speed for arterial roadway.", "speech": "Speed limit sixty kilometers per hour."},
        6: {"tier": "WARNING", "limit": 70, "advice": "70 km/h suburban limit. Anticipate lane merges ahead.", "speech": "Speed limit seventy kilometers per hour."},
        7: {"tier": "WARNING", "limit": 80, "advice": "80 km/h highway speed limit. Check rear mirrors before lane change.", "speech": "Speed limit eighty kilometers per hour."},
        8: {"tier": "CRITICAL", "advice": "Straight & Left turns prohibited. You must turn right only.", "speech": "Do not go straight or left. Turn right only."},
        9: {"tier": "INFORMATIONAL", "advice": "General traffic advisory. Observe road conditions.", "speech": "Traffic advisory ahead."},
        10: {"tier": "CRITICAL", "advice": "Straight travel prohibited. Prepare to turn left or right.", "speech": "Do not go straight."},
        11: {"tier": "CRITICAL", "advice": "Left turn prohibited. Continue straight or turn right.", "speech": "No left turn allowed."},
        12: {"tier": "CRITICAL", "advice": "Turns prohibited. Continue straight only.", "speech": "Do not turn left or right. Proceed straight."},
        13: {"tier": "CRITICAL", "advice": "Right turn prohibited. Continue straight or turn left.", "speech": "No right turn allowed."},
        14: {"tier": "CRITICAL", "advice": "Overtaking from left lane prohibited. Maintain current lane.", "speech": "Do not overtake from left."},
        15: {"tier": "CRITICAL", "advice": "U-Turn strictly prohibited. Continue to next legal turnaround.", "speech": "No U-turn allowed."},
        16: {"tier": "CRITICAL", "advice": "Motor vehicles prohibited on this section. Authorized vehicles only.", "speech": "Motor vehicles prohibited."},
        17: {"tier": "WARNING", "advice": "Silence zone. Do not honk horn near hospital or school area.", "speech": "No horn zone."},
        18: {"tier": "CRITICAL", "advice": "NO ENTRY. Do not enter. Prohibited one-way or closed road.", "speech": "Warning! No entry! Do not enter."},
        19: {"tier": "CRITICAL", "advice": "NO STOPPING. Stopping or parking is strictly prohibited.", "speech": "No stopping or parking allowed."},
        20: {"tier": "INFORMATIONAL", "advice": "Mandatory direction: Proceed straight or turn right.", "speech": "Go straight or turn right."},
        21: {"tier": "INFORMATIONAL", "advice": "Mandatory direction: Continue straight ahead only.", "speech": "Go straight ahead."},
        22: {"tier": "INFORMATIONAL", "advice": "Mandatory direction: Turn left ahead.", "speech": "Turn left."},
        23: {"tier": "INFORMATIONAL", "advice": "Mandatory direction: Turn left or right ahead.", "speech": "Turn left or right ahead."},
        24: {"tier": "INFORMATIONAL", "advice": "Mandatory direction: Turn right ahead.", "speech": "Turn right."},
        25: {"tier": "INFORMATIONAL", "advice": "Keep to the left side of roadway or obstruction.", "speech": "Keep left."},
        26: {"tier": "INFORMATIONAL", "advice": "Keep to the right side of roadway or divider.", "speech": "Keep right."},
        27: {"tier": "INFORMATIONAL", "advice": "Mandatory Roundabout. Yield right-of-way to circulating traffic.", "speech": "Roundabout ahead. Yield to circulating traffic."},
        28: {"tier": "WARNING", "advice": "Watch out for cross-traffic and vehicles merging.", "speech": "Watch out for cars."},
        29: {"tier": "INFORMATIONAL", "advice": "Sound horn if necessary for blind curve or intersection.", "speech": "Sound horn if needed."},
        30: {"tier": "WARNING", "advice": "Bicycle crossing ahead. Check blind spots and share the road.", "speech": "Bicycles crossing ahead."},
        31: {"tier": "INFORMATIONAL", "advice": "U-turn permitted here. Check oncoming traffic before turning.", "speech": "U-turn permitted."},
        32: {"tier": "INFORMATIONAL", "advice": "Road divider ahead. Keep to designated lane.", "speech": "Road divider ahead."},
        33: {"tier": "INFORMATIONAL", "advice": "Road advisory. Maintain lane positioning.", "speech": "Road advisory."},
        34: {"tier": "WARNING", "advice": "DANGER AHEAD. Reduce speed and increase alertness immediately.", "speech": "Danger ahead. Exercise caution."},
        35: {"tier": "WARNING", "advice": "Zebra pedestrian crossing. Yield to pedestrians on roadway.", "speech": "Pedestrian crossing ahead. Yield to pedestrians."},
        36: {"tier": "WARNING", "advice": "Bicycle pathway crossing. Check mirrors and slow down.", "speech": "Bicycle crossing ahead."},
        37: {"tier": "CRITICAL", "advice": "Children crossing / school zone. Reduce speed to 25 km/h.", "speech": "Caution: Children crossing ahead. Slow down."},
        38: {"tier": "WARNING", "advice": "Dangerous curve to the left. Brake before entering curve.", "speech": "Dangerous left curve ahead. Slow down."},
        39: {"tier": "WARNING", "advice": "Dangerous curve to the right. Brake before entering curve.", "speech": "Dangerous right curve ahead. Slow down."},
        40: {"tier": "INFORMATIONAL", "advice": "General traffic regulatory sign.", "speech": "Traffic regulation ahead."},
        41: {"tier": "INFORMATIONAL", "advice": "General traffic warning sign.", "speech": "Traffic advisory."},
        42: {"tier": "INFORMATIONAL", "advice": "General informational guide sign.", "speech": "Informational guide sign."},
        43: {"tier": "INFORMATIONAL", "advice": "Mandatory: Proceed straight or turn right.", "speech": "Go straight or turn right."},
        44: {"tier": "INFORMATIONAL", "advice": "Mandatory: Proceed straight or turn left.", "speech": "Go straight or turn left."},
        45: {"tier": "INFORMATIONAL", "advice": "Road navigation guidance sign.", "speech": "Navigation advisory."},
        46: {"tier": "WARNING", "advice": "Zigzag winding road ahead. Steer carefully and reduce speed.", "speech": "Zigzag winding road ahead."},
        47: {"tier": "CRITICAL", "advice": "Railway level crossing ahead. Stop, look both ways, and listen.", "speech": "Train crossing ahead. Be prepared to stop."},
        48: {"tier": "WARNING", "advice": "Road work / Under construction ahead. Watch for workers and machinery.", "speech": "Road work under construction ahead."},
        49: {"tier": "INFORMATIONAL", "advice": "Traffic advisory ahead.", "speech": "Traffic advisory."},
        50: {"tier": "WARNING", "advice": "Guardrail / Fences ahead on roadway shoulder.", "speech": "Roadside fences ahead."},
        51: {"tier": "CRITICAL", "advice": "Accident prone zone / Heavy vehicle hazard. Increase safety margin.", "speech": "High accident zone ahead. Exercise caution."}
    }

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
                lookup = ACTION_LOOKUP.get(cid, {})
                tier = lookup.get("tier", "INFORMATIONAL")
                limit = lookup.get("limit", None)
                advice = lookup.get("advice", f"Observe sign: {sign_name}. Adjust driving accordingly.")
                speech_prompt = lookup.get("speech", f"Attention driver: {sign_name} ahead.")

            metadata[cid] = {
                "name": sign_name,
                "tier": tier,
                "category": str(row.get("Category", "Mandatory")) if "Category" in row else "Mandatory",
                "icon": icon_map.get(tier, "🔴" if "CRITICAL" in tier else "ℹ️"),
                "limit": limit,
                "advice": advice,
                "speech_prompt": speech_prompt
            }

    return metadata


GTSRB_SAFETY_METADATA = load_universal_metadata()


class DriverAlertSystem:
    """Driver Alert and Safety System for Universal Real-time Classifier."""

    def __init__(self, confidence_threshold=0.60, csv_path="dataset/signnames_rto.csv"):
        self.confidence_threshold = confidence_threshold
        self.metadata = load_universal_metadata(csv_path)

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

    def process_detection(self, class_id, confidence_score):
        """
        Processes model detection and outputs structured driver alert payload.

        Args:
            class_id (int): Universal class integer (0..51).
            confidence_score (float): Probability confidence score (0.0..1.0).

        Returns:
            dict with risk level, color badge, TTS alert prompt, and driver recommendations.
        """
        if class_id is None or class_id < 0:
            return self.get_no_detection_payload(reason="No traffic sign candidate found.")

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

        return {
            "detected": True,
            "confirmed": is_confirmed,
            "class_id": class_id,
            "class_name": meta["name"],
            "risk_tier": tier if is_confirmed else f"{tier} (UNCONFIRMED)",
            "base_risk_tier": tier,
            "color_code": color_map.get(tier, "#2c3e50") if is_confirmed else "#7f8c8d",
            "icon": meta["icon"] if is_confirmed else "⚠️",
            "advice": meta["advice"],
            "speech_prompt": meta["speech_prompt"] if is_confirmed else "",
            "speed_limit": meta.get("limit", None),
            "reason": "Detection confirmed." if is_confirmed else f"Confidence ({confidence_score*100:.1f}%) is below confirmation threshold ({self.confidence_threshold*100:.1f}%)."
        }


if __name__ == "__main__":
    alert_sys = DriverAlertSystem()
    sample_no_uturn = alert_sys.process_detection(43, 0.95)
    print("[TEST] Processed No U-Turn Sign (Class 43):")
    for k, v in sample_no_uturn.items():
        print(f"  - {k}: {v}")
