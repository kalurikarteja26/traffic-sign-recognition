"""
traffic_safety_agents/traffic_safety_agents.py

Traffic Safety Multi-Agent Decision System for Real-Time Traffic Sign Recognition.

Architectural Agents:
1. ValidationAgent: Filters out low-confidence or corrupted/missing model predictions.
2. RuleAgent: Translates recognized traffic signs into actionable driver safety rules & priorities.
3. ContextAgent: Requires multi-frame temporal consistency and suppresses repeat alerts.
4. AlertAgent: Dispatches structured events, logs history, and coordinates audio alerts.
5. TrafficSafetyCoordinator: Orchestrates the pipeline and provides a unified interface.
"""

import time
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    pyttsx3 = None
    HAS_PYTTSX3 = False


def normalize_sign_label(label: Any) -> str:
    """
    Normalizes arbitrary sign names (e.g. 'Stop Sign', 'SPEED_LIMIT_50', 
    'Compulsory Keep Left', 'no_entry') into a uniform lowercase lookup key.
    """
    if label is None:
        return ""
    s = str(label).strip().lower()
    # Replace spaces, hyphens, and slashes with underscores
    for ch in [" ", "-", "/", ".", ","]:
        s = s.replace(ch, "_")
    while "__" in s:
        s = s.replace("__", "_")
    return s.strip("_")


# ---------------------------------------------------------------------------
# COMPLETE 108-CLASS SIGN RULES DATABASE
# Supports all 108 official Indian RTO traffic signs (Mandatory, Cautionary,
# Informational) with statutory risk tiers, priority, and required actions.
# ---------------------------------------------------------------------------
def load_all_sign_rules(csv_path: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Loads complete safety rules and driver advisories for all 108 official
    Indian RTO traffic signs from dataset/signnames_rto.csv.
    """
    rules: Dict[str, Dict[str, Any]] = {}

    candidates = [
        Path(csv_path) if csv_path else None,
        Path("dataset/signnames_rto.csv"),
        Path("training data/labels.csv"),
        Path("dataset/signnames_universal.csv"),
        Path("dataset/signnames.csv"),
    ]

    target_csv = None
    for c in candidates:
        if c and c.exists():
            target_csv = c
            break

    if target_csv:
        try:
            import pandas as pd
            df = pd.read_csv(target_csv)
            name_col = 'Name' if 'Name' in df.columns else ('SignName' if 'SignName' in df.columns else None)

            for _, row in df.iterrows():
                cid = int(row['ClassId'])
                name = str(row[name_col]).strip() if name_col else f"Class_{cid}"
                risk = str(row['RiskLevel']).strip() if ('RiskLevel' in row and pd.notna(row['RiskLevel'])) else "INFORMATIONAL"
                action = str(row['RequiredAction']).strip() if ('RequiredAction' in row and pd.notna(row['RequiredAction'])) else f"Observe sign: {name}. Follow statutory road regulations."
                speech = str(row['TTSPrompt']).strip() if ('TTSPrompt' in row and pd.notna(row['TTSPrompt'])) else f"Attention driver: {name} ahead."
                category = str(row['Category']).strip() if ('Category' in row and pd.notna(row['Category'])) else "Mandatory"
                limit = row['SpeedLimit'] if ('SpeedLimit' in row and pd.notna(row['SpeedLimit'])) else None

                # Priority mapping
                if "CRITICAL" in risk.upper():
                    priority = "HIGH"
                elif "WARNING" in risk.upper():
                    priority = "MEDIUM"
                else:
                    priority = "LOW"

                entry = {
                    "class_id": cid,
                    "name": name,
                    "message": speech,
                    "priority": priority,
                    "action": action,
                    "risk_tier": risk,
                    "category": category,
                    "speed_limit": limit
                }

                # Register multiple lookup aliases for instant matching:
                norm = normalize_sign_label(name)
                rules[name] = entry
                rules[norm] = entry
                rules[str(cid)] = entry
                rules[f"class_{cid}"] = entry
                rules[f"#{cid:03d}"] = entry
                rules[f"#{cid}"] = entry
        except Exception as e:
            print(f"[WARNING] Failed to load rules from {target_csv}: {e}")

    # Standard / Canonical Aliases
    aliases = {
        "stop": "Stop Sign",
        "stop_sign": "Stop Sign",
        "yield": "Give Way",
        "give_way": "Give Way",
        "no_entry": "No Entry",
        "no_u_turn": "No U-Turn",
        "u_turn": "No U-Turn",
        "no_parking": "No Parking",
        "no_stopping": "No Stopping or Standing",
        "horn_prohibited": "Horn Prohibited",
        "pedestrian_crossing": "Pedestrian Crossing",
        "zebra_crossing": "Pedestrian Crossing",
        "roundabout": "Roundabout",
        "school_zone": "School Ahead",
        "school_ahead": "School Ahead",
        "road_work": "Men at Work",
        "men_at_work": "Men at Work",
        "speed_breaker": "Speed Breaker",
        "hospital": "Hospital",
        "petrol_pump": "Petrol Pump",
        "compulsory_keep_left": "Compulsory Keep Left",
        "compulsory_keep_right": "Compulsory Keep Right",
        "no_overtaking": "No Overtaking",
    }
    for alias, target_name in aliases.items():
        if target_name in rules and alias not in rules:
            rules[alias] = rules[target_name]

    return rules


SIGN_RULES: Dict[str, Dict[str, Any]] = load_all_sign_rules()


# ---------------------------------------------------------------------------
# AGENT 1: VALIDATION AGENT
# ---------------------------------------------------------------------------
class ValidationAgent:
    """
    Validates model predictions before passing them to the safety pipeline.
    Rejects low-confidence detections, empty labels, and corrupted inputs.
    """

    def __init__(self, threshold: float = 0.70):
        self.threshold = float(threshold)
        self.rejected_count = 0

    def validate(self, label: Any, confidence: Optional[float]) -> bool:
        """
        Returns True if the prediction meets all validation criteria,
        False otherwise.
        """
        if not label:
            self.rejected_count += 1
            return False
        if confidence is None:
            self.rejected_count += 1
            return False
        try:
            conf_val = float(confidence)
        except (ValueError, TypeError):
            self.rejected_count += 1
            return False

        if conf_val < self.threshold:
            self.rejected_count += 1
            return False

        return True

    def get_rejection_reason(self, label: Any, confidence: Optional[float]) -> str:
        """Returns human-readable explanation of why a prediction was rejected."""
        if not label:
            return "Missing or empty sign label."
        if confidence is None:
            return "Confidence score is None."
        try:
            conf_val = float(confidence)
            if conf_val < self.threshold:
                return f"Confidence {conf_val:.2f} is below threshold {self.threshold:.2f}."
        except (ValueError, TypeError):
            return "Invalid non-numeric confidence value."
        return "Unknown validation issue."


# ---------------------------------------------------------------------------
# AGENT 2: RULE AGENT
# ---------------------------------------------------------------------------
class RuleAgent:
    """
    Maps recognized sign classes to domain-specific driver safety messages,
    risk tiers, and recommended vehicle handling actions.
    """

    def __init__(self, custom_rules: Optional[Dict[str, Dict[str, str]]] = None, csv_path: Optional[str] = None):
        if csv_path:
            self.rules = load_all_sign_rules(csv_path)
        else:
            self.rules = dict(SIGN_RULES)
        if custom_rules:
            self.rules.update(custom_rules)

    def get_rule(self, label: Any) -> Dict[str, str]:
        """
        Looks up rule definition for a label using exact match, normalized match,
        or keyword heuristics. Falls back gracefully for any unmapped sign.
        """
        raw_str = str(label).strip()
        norm_key = normalize_sign_label(label)

        # 1. Exact raw key match
        if raw_str in self.rules:
            return self.rules[raw_str]

        # 2. Normalized key match
        if norm_key in self.rules:
            return self.rules[norm_key]

        # 3. Fuzzy / substring matching for common classes
        if "stop" in norm_key:
            return self.rules.get("stop", {
                "message": f"Stop sign detected. Follow road rules.",
                "priority": "HIGH",
                "action": "Complete stop required before intersection."
            })
        if "no_entry" in norm_key or ("entry" in norm_key and "prohibited" in norm_key):
            return self.rules.get("no_entry", {
                "message": "No entry sign detected.",
                "priority": "HIGH",
                "action": "Roadway closed to incoming traffic."
            })
        if "give_way" in norm_key or "yield" in norm_key:
            return self.rules.get("give_way", {
                "message": "Give Way sign detected.",
                "priority": "HIGH",
                "action": "Yield right-of-way."
            })
        if "speed_limit" in norm_key or "speed" in norm_key:
            # Extract number if present
            digits = "".join([c for c in norm_key if c.isdigit()])
            limit_str = f" {digits} km/h" if digits else ""
            return {
                "message": f"Speed limit{limit_str} sign detected.",
                "priority": "MEDIUM",
                "action": f"Adjust vehicle speed according to the posted limit{limit_str}."
            }
        if "pedestrian" in norm_key or "crossing" in norm_key or "zebra" in norm_key:
            return {
                "message": "Pedestrian crossing detected ahead.",
                "priority": "HIGH",
                "action": "Slow down and watch for pedestrians."
            }
        if "prohibited" in norm_key or "no_" in norm_key:
            return {
                "message": f"{raw_str} detected. Obey road restriction.",
                "priority": "HIGH",
                "action": f"Prohibited maneuver: {raw_str}."
            }

        # 4. Universal Fallback
        return {
            "message": f"{raw_str.title()} detected. Proceed with caution.",
            "priority": "MEDIUM",
            "action": f"Follow road signs and regulations for {raw_str}."
        }


# ---------------------------------------------------------------------------
# AGENT 3: CONTEXT AGENT
# ---------------------------------------------------------------------------
class ContextAgent:
    """
    Maintains temporal state across consecutive video frames:
    - Eliminates single-frame detection flickers (requires `required_frames`).
    - Suppresses repeat alerts for an already confirmed, continuously visible sign.
    - Resets confirmation state when sign disappears or changes.
    """

    def __init__(self, required_frames: int = 3, max_idle_frames: int = 5):
        self.required_frames = max(1, int(required_frames))
        self.max_idle_frames = max_idle_frames
        
        self.current_label: Optional[str] = None
        self.consecutive_count: int = 0
        self.active_alert_label: Optional[str] = None
        self.idle_frame_count: int = 0

    def update(self, label: str) -> Dict[str, Any]:
        """
        Updates the context with the currently detected validated label.
        
        Returns:
            dict with:
                - state: 'monitoring', 'alert', or 'suppressed'
                - count: current consecutive frame count
                - required: required frame threshold
                - is_new_alert: boolean indicating if this frame triggers a new alert
        """
        norm_label = normalize_sign_label(label)

        # Case 1: Same sign continues across frames
        if norm_label == self.current_label:
            self.consecutive_count += 1
            self.idle_frame_count = 0

            # Reached required frames for the first time for this sign
            if self.consecutive_count == self.required_frames:
                if self.active_alert_label != norm_label:
                    self.active_alert_label = norm_label
                    return {
                        "state": "alert",
                        "count": self.consecutive_count,
                        "required": self.required_frames,
                        "is_new_alert": True
                    }
                else:
                    return {
                        "state": "suppressed",
                        "count": self.consecutive_count,
                        "required": self.required_frames,
                        "is_new_alert": False
                    }

            # Above required frames -> already alerted, suppress repeats
            elif self.consecutive_count > self.required_frames:
                return {
                    "state": "suppressed",
                    "count": self.consecutive_count,
                    "required": self.required_frames,
                    "is_new_alert": False
                }

            # Below required frames -> monitoring
            else:
                return {
                    "state": "monitoring",
                    "count": self.consecutive_count,
                    "required": self.required_frames,
                    "is_new_alert": False
                }

        # Case 2: Sign changed to a different sign
        else:
            self.current_label = norm_label
            self.consecutive_count = 1
            self.idle_frame_count = 0

            if self.required_frames == 1:
                self.active_alert_label = norm_label
                return {
                    "state": "alert",
                    "count": 1,
                    "required": 1,
                    "is_new_alert": True
                }
            else:
                return {
                    "state": "monitoring",
                    "count": 1,
                    "required": self.required_frames,
                    "is_new_alert": False
                }

    def record_empty_or_rejected(self):
        """Called when no sign is detected or detection was rejected."""
        self.idle_frame_count += 1
        if self.idle_frame_count >= self.max_idle_frames:
            # Reset active sign state after several consecutive empty frames
            self.current_label = None
            self.consecutive_count = 0
            self.active_alert_label = None

    def reset(self):
        """Full reset of context tracker."""
        self.current_label = None
        self.consecutive_count = 0
        self.active_alert_label = None
        self.idle_frame_count = 0


# ---------------------------------------------------------------------------
# AGENT 4: ALERT AGENT
# ---------------------------------------------------------------------------
class AlertAgent:
    """
    Creates structured event records, maintains incident history,
    and coordinates non-blocking Text-to-Speech audio alerts.
    """

    def __init__(self, enable_speech: bool = False, speech_cooldown: float = 3.5):
        self.enable_speech = enable_speech
        self.speech_cooldown = speech_cooldown
        self.last_speech_time = 0.0
        self.last_speech_label: Optional[str] = None
        self.tts_lock = threading.Lock()
        self.event_counter = 0

    def create_event(
        self,
        label: str,
        confidence: float,
        rule: Dict[str, str],
        context_info: Optional[Dict[str, Any]] = None,
        extra_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Creates a standardized JSON-serializable event record."""
        self.event_counter += 1
        now = time.time()
        iso_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        event = {
            "event_id": self.event_counter,
            "timestamp": now,
            "datetime": iso_str,
            "label": label,
            "confidence": round(float(confidence), 4),
            "priority": rule.get("priority", "MEDIUM"),
            "message": rule.get("message", ""),
            "action": rule.get("action", ""),
            "explanation": (
                f"Confirmed detection of '{label}' across {context_info.get('count', 3)} frames "
                f"with {float(confidence)*100:.1f}% confidence. Priority: {rule.get('priority', 'MEDIUM')}."
            ) if context_info else f"Detected '{label}' with {float(confidence)*100:.1f}% confidence."
        }

        if extra_metadata:
            event["metadata"] = extra_metadata

        # Dispatch speech alert if enabled
        if self.enable_speech:
            self.speak_alert(rule.get("message", f"{label} detected."))

        return event

    def speak_alert(self, text: str, force: bool = False):
        """Asynchronously speaks alert prompt using pyttsx3 without blocking video."""
        if not HAS_PYTTSX3:
            return

        now = time.time()
        if not force and (now - self.last_speech_time < self.speech_cooldown):
            return

        self.last_speech_time = now

        def _worker(prompt_text: str):
            with self.tts_lock:
                try:
                    engine = pyttsx3.init()
                    engine.setProperty("rate", 165)
                    engine.say(prompt_text)
                    engine.runAndWait()
                    engine.stop()
                except Exception as ex:
                    print(f"[TTS AUDIO ERROR] {ex}")

        t = threading.Thread(target=_worker, args=(text,), daemon=True)
        t.start()


# ---------------------------------------------------------------------------
# AGENT 5: COORDINATOR (TrafficSafetyCoordinator)
# ---------------------------------------------------------------------------
class TrafficSafetyCoordinator:
    """
    Master Coordinator for the Traffic Safety Multi-Agent System.
    Sequences:
      1. ValidationAgent (threshold filter)
      2. ContextAgent (temporal voting & deduplication)
      3. RuleAgent (advisory message & priority lookup)
      4. AlertAgent (structured logging & voice dispatch)
    """

    def __init__(
        self,
        threshold: float = 0.70,
        required_frames: int = 3,
        enable_speech: bool = False,
        speech_cooldown: float = 3.5,
        custom_rules: Optional[Dict[str, Dict[str, str]]] = None
    ):
        self.threshold = threshold
        self.required_frames = required_frames
        
        # Instantiate sub-agents
        self.validation_agent = ValidationAgent(threshold=threshold)
        self.rule_agent = RuleAgent(custom_rules=custom_rules)
        self.context_agent = ContextAgent(required_frames=required_frames)
        self.alert_agent = AlertAgent(enable_speech=enable_speech, speech_cooldown=speech_cooldown)

        # History of confirmed events
        self.history: List[Dict[str, Any]] = []
        self.frame_index: int = 0
        self.rejected_history: List[Dict[str, Any]] = []

    def process(
        self,
        label: Optional[str],
        confidence: Optional[float],
        extra_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Processes a single detection result through the multi-agent pipeline.

        Returns dict with:
            - status: 'alert', 'monitoring', 'suppressed', or 'rejected'
            - message: human-readable text for HUD/UI display
            - label: sign label
            - confidence: confidence score
            - priority: rule priority ('HIGH', 'MEDIUM', 'LOW')
            - event: structured event object (only when status == 'alert')
        """
        self.frame_index += 1

        # ── Step 0: Empty Frame Handling ─────────────────────────────────────
        if label is None:
            self.context_agent.record_empty_or_rejected()
            return {
                "status": "idle",
                "message": "Scanning road for traffic signs...",
                "label": None,
                "confidence": 0.0,
                "priority": "LOW",
                "event": None
            }

        # ── Step 1: Validation ────────────────────────────────────────────────
        is_valid = self.validation_agent.validate(label, confidence)
        if not is_valid:
            reason = self.validation_agent.get_rejection_reason(label, confidence)
            self.context_agent.record_empty_or_rejected()
            
            rejected_record = {
                "frame": self.frame_index,
                "label": label,
                "confidence": confidence,
                "reason": reason,
                "timestamp": time.time()
            }
            self.rejected_history.append(rejected_record)

            return {
                "status": "rejected",
                "message": f"Rejected: {label} ({reason})",
                "label": label,
                "confidence": confidence,
                "priority": "LOW",
                "event": None
            }

        # ── Step 2: Context Analysis & Confirmation ──────────────────────────
        context_result = self.context_agent.update(label)
        state = context_result["state"]
        count = context_result["count"]
        required = context_result["required"]

        # ── Step 3: Rule Lookup ──────────────────────────────────────────────
        rule = self.rule_agent.get_rule(label)

        # ── Step 4: Dispatch Decision ─────────────────────────────────────────
        if state == "monitoring":
            return {
                "status": "monitoring",
                "message": f"Monitoring {label} ({count}/{required} frames)",
                "label": label,
                "confidence": confidence,
                "priority": "LOW",
                "event": None
            }

        elif state == "alert":
            # Confirmed new alert!
            event = self.alert_agent.create_event(
                label=label,
                confidence=confidence,
                rule=rule,
                context_info=context_result,
                extra_metadata=extra_metadata
            )
            self.history.append(event)

            return {
                "status": "alert",
                "message": rule["message"],
                "label": label,
                "confidence": confidence,
                "priority": rule["priority"],
                "event": event
            }

        elif state == "suppressed":
            # Consistent sign holding across subsequent frames without repeat alert
            return {
                "status": "suppressed",
                "message": f"Suppressed repeat alert for {label}",
                "label": label,
                "confidence": confidence,
                "priority": rule["priority"],
                "event": None
            }

        # Fallback
        return {
            "status": "idle",
            "message": "Scanning for traffic signs...",
            "label": None,
            "confidence": 0.0,
            "priority": "LOW",
            "event": None
        }

    def clear_history(self):
        """Clears event history and resets context."""
        self.history.clear()
        self.rejected_history.clear()
        self.context_agent.reset()

    def get_summary_stats(self) -> Dict[str, Any]:
        """Returns diagnostic telemetry summary of agent system."""
        return {
            "total_frames_processed": self.frame_index,
            "alerts_issued": len(self.history),
            "rejections": len(self.rejected_history),
            "current_tracked_sign": self.context_agent.current_label,
            "consecutive_frames": self.context_agent.consecutive_count,
            "active_alert": self.context_agent.active_alert_label,
            "confidence_threshold": self.threshold,
            "required_frames": self.required_frames
        }
