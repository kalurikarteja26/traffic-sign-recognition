"""
src/webcam_recognition.py

Real-Time Webcam Traffic Sign Recognition & Intelligent Driver Safety Advisory System.

Features:
- Real-time OpenCV webcam video stream ingestion.
- HSV Color-Space Traffic Sign Region of Interest (ROI) Candidate Locator (Red, Blue, Yellow contours).
- Deep Learning Traffic Sign Classification (Universal 52-class / GTSRB model).
- Real-time Visual HUD Overlays: Bounding boxes, Risk Tier indicators (CRITICAL 🔴, WARNING 🟠, INFORMATIONAL 🔵),
  Required Driver Action Advisories, Speed Limit badges, and Telemetry (FPS & Latency).
- Non-blocking Audio Speech Synthesis Alerts with anti-spam cooldown.
- Interactive Keyboard Controls (Model toggle, Audio toggle, Confidence adjustment, Screenshot capture).
"""

import sys
import time
import cv2
import torch
import threading
import argparse
import numpy as np
from pathlib import Path

# Ensure project root is in sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    pyttsx3 = None
    HAS_PYTTSX3 = False

try:
    from src.predict import TrafficSignPredictor
    from src.driver_alert import DriverAlertSystem
except ImportError:
    from predict import TrafficSignPredictor
    from driver_alert import DriverAlertSystem

try:
    from traffic_safety_agents import TrafficSafetyCoordinator, ModelOutputAdapter
except ImportError:
    from traffic_safety_agents.traffic_safety_agents import TrafficSafetyCoordinator
    from traffic_safety_agents.agent_adapter import ModelOutputAdapter


def square_pad_crop(crop, fill_val=255):
    """Pads any rectangular crop to a 1:1 square aspect ratio to prevent sign geometry distortion."""
    if crop is None or crop.size == 0:
        return crop
    ch, cw = crop.shape[:2]
    if ch == cw:
        return crop
    max_d = max(ch, cw)
    if len(crop.shape) == 3:
        padded = np.full((max_d, max_d, crop.shape[2]), fill_val, dtype=crop.dtype)
    else:
        padded = np.full((max_d, max_d), fill_val, dtype=crop.dtype)
    y_off = (max_d - ch) // 2
    x_off = (max_d - cw) // 2
    padded[y_off:y_off+ch, x_off:x_off+cw] = crop
    return padded


class TrafficSignWebcamEngine:
    """Real-time webcam processing engine for traffic sign recognition and driver safety alerting."""

    def __init__(
        self,
        checkpoint_path="models/rto_best.pth",
        camera_id=0,
        confidence_threshold=0.35,
        enable_audio=True,
        dataset_dir="dataset",
        demo_mode=False
    ):
        # Auto-prefer models/rto_best.pth (108 classes) if available
        rto_pth = Path("models/rto_best.pth")
        if (checkpoint_path == "models/universal_best.pth" or not Path(checkpoint_path).exists()) and rto_pth.exists():
            checkpoint_path = str(rto_pth)

        self.camera_id = camera_id
        self.confidence_threshold = confidence_threshold
        self.enable_audio = enable_audio
        self.dataset_dir = Path(dataset_dir)
        self.demo_mode = demo_mode
        self.demo_step = 0

        print(f"[INFO] Initializing Traffic Sign Predictor using checkpoint: {checkpoint_path}")
        self.predictor = TrafficSignPredictor(checkpoint_path=checkpoint_path, dataset_dir=dataset_dir)
        self.alert_system = DriverAlertSystem(confidence_threshold=confidence_threshold)

        # Multi-Agent Safety Coordinator for temporal consensus & anti-spam
        self.coordinator = TrafficSafetyCoordinator(
            threshold=confidence_threshold,
            required_frames=2,
            enable_speech=False
        )
        self.adapter = ModelOutputAdapter(class_mapping=self.predictor.class_names)

        # Audio TTS setup
        self.last_audio_time = 0.0
        self.audio_cooldown = 3.5  # seconds between audio prompts
        self.last_spoken_class = None
        self.tts_lock = threading.Lock()

        # Temporal Multi-Frame Voting Buffer (eliminates 1-frame glitches)
        from collections import deque
        self.history_buffer = deque(maxlen=6)
        self.min_consistent_frames = 2

        # Available Checkpoints for On-the-Fly Model Switching
        self.available_models = self._scan_available_models()
        self.current_model_idx = 0

        # Custom Interactive Mouse Targeting & Diagnostic State
        self.custom_roi = None
        self.mouse_start = None
        self.is_mouse_down = False
        self.is_frozen = False
        self.frozen_frame = None
        self.injected_sign_cid = None

    def _mouse_callback(self, event, x, y, flags, param):
        """Allows clicking or dragging on the OpenCV window to manually lock the target ROI."""
        if event == cv2.EVENT_LBUTTONDOWN:
            self.mouse_start = (x, y)
            self.is_mouse_down = True
        elif event == cv2.EVENT_MOUSEMOVE and self.is_mouse_down:
            x0, y0 = self.mouse_start
            self.custom_roi = (min(x0, x), min(y0, y), abs(x - x0), abs(y - y0))
        elif event == cv2.EVENT_LBUTTONUP:
            self.is_mouse_down = False
            if self.mouse_start:
                x0, y0 = self.mouse_start
                w, h = abs(x - x0), abs(y - y0)
                if w < 12 and h < 12:
                    # Single click: place 160x160 target box centered at click point
                    box_sz = 160
                    self.custom_roi = (max(0, x - box_sz // 2), max(0, y - box_sz // 2), box_sz, box_sz)
                else:
                    self.custom_roi = (min(x0, x), min(y0, y), w, h)
        elif event == cv2.EVENT_RBUTTONDOWN:
            # Right click resets to auto center reticle
            self.custom_roi = None
            self.injected_sign_cid = None
            print("[INFO] Reset targeting reticle to auto center.")

    def _scan_available_models(self):
        models_dir = Path("models")
        available = []
        for name in ["rto_best.pth", "universal_best.pth", "mobilenet_best.pth", "baseline_best.pth"]:
            p = models_dir / name
            if p.exists():
                available.append(str(p))
        return available if available else ["models/rto_best.pth"]

    def _speak_alert(self, text):
        """Worker thread function for non-blocking Text-To-Speech audio alert."""
        if not HAS_PYTTSX3:
            print(f"[AUDIO ALERT PROMPT] {text} (pyttsx3 not installed)")
            return

        def tts_worker(prompt):
            with self.tts_lock:
                try:
                    engine = pyttsx3.init()
                    engine.setProperty('rate', 160)
                    engine.say(prompt)
                    engine.runAndWait()
                    engine.stop()
                except Exception as e:
                    print(f"[AUDIO ALERT ERROR] {e}")

        t = threading.Thread(target=tts_worker, args=(text,), daemon=True)
        t.start()


    def detect_traffic_sign_rois(self, frame):
        """
        High-precision multi-scale candidate locator.
        Combines:
        0. User Custom Target Box (via mouse click or drag)
        1. Central Targeting Reticle at 4 nested scales (instant lock-on for signs/phones held to webcam)
        2. Shape-aware Hough Circles (invaluable for circular signs on backlit mobile phones)
        3. Adaptive thresholding contours (captures high-contrast sign borders under camera glare)
        4. Broad HSV color segmentation (Red, Blue, Yellow/Amber) with dual tight/expanded padding
        5. High-contrast Canny edge contours
        6. Roadside driver focal crop (for highway driving simulations)
        7. Full-frame view
        """
        h, w, _ = frame.shape
        candidates = []
        cx, cy = w // 2, h // 2

        # 0. User Custom Target Box (Highest Priority if user clicked or dragged on window)
        if self.custom_roi:
            rx, ry, rw, rh = self.custom_roi
            rx1, ry1 = max(0, rx), max(0, ry)
            rx2, ry2 = min(w, rx + rw), min(h, ry + rh)
            if rx2 > rx1 and ry2 > ry1:
                c_crop = frame[ry1:ry2, rx1:rx2]
                if c_crop.size > 0:
                    candidates.append((rx1, ry1, rx2 - rx1, ry2 - ry1, c_crop, "Custom Target Box"))

        # 1. Central Targeting Reticle at 4 nested scales (primary webcam presentation zone)
        for scale in [0.28, 0.42, 0.58, 0.75]:
            hw, hh = int(w * scale * 0.5), int(h * scale * 0.5)
            x1, y1 = max(0, cx - hw), max(0, cy - hh)
            x2, y2 = min(w, cx + hw), min(h, cy + hh)
            c_crop = frame[y1:y2, x1:x2]
            if c_crop.size > 0:
                candidates.append((x1, y1, x2 - x1, y2 - y1, c_crop, f"Reticle ({int(scale*100)}%)"))

        # 2. Shape-Aware Hough Circles (detects circular signs on phone screens / backlit displays)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 2)
        circles = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT, dp=1.2, minDist=int(min(w, h) * 0.12),
            param1=80, param2=38, minRadius=int(min(w, h) * 0.08), maxRadius=int(min(w, h) * 0.45)
        )
        if circles is not None:
            for c in circles[0, :3]:
                cx_c, cy_c, r = int(c[0]), int(c[1]), int(c[2])
                pad = int(r * 0.15)
                x1, y1 = max(0, cx_c - r - pad), max(0, cy_c - r - pad)
                x2, y2 = min(w, cx_c + r + pad), min(h, cy_c + r + pad)
                c_crop = frame[y1:y2, x1:x2]
                if c_crop.size > 0:
                    candidates.append((x1, y1, x2 - x1, y2 - y1, c_crop, "Hough Circle"))

        # 3. Adaptive Thresholding Contours (captures high-contrast sign borders under camera glare)
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5)
        cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in cnts:
            area = cv2.contourArea(cnt)
            if (w * h * 0.015) < area < (w * h * 0.65):
                bx, by, bw, bh = cv2.boundingRect(cnt)
                aspect = float(bw) / max(1, bh)
                if 0.5 <= aspect <= 2.0:
                    pad = int(min(bw, bh) * 0.12)
                    x1, y1 = max(0, bx - pad), max(0, by - pad)
                    x2, y2 = min(w, bx + bw + pad), min(h, by + bh + pad)
                    c_crop = frame[y1:y2, x1:x2]
                    if c_crop.size > 0:
                        candidates.append((x1, y1, x2 - x1, y2 - y1, c_crop, "Adaptive Contour"))
                        break

        # 4. Broad HSV Color Contours (Red, Blue, Yellow/Amber)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        lower_red1 = np.array([0, 20, 20])
        upper_red1 = np.array([22, 255, 255])
        lower_red2 = np.array([140, 20, 20])
        upper_red2 = np.array([180, 255, 255])
        lower_blue = np.array([75, 20, 20])
        upper_blue = np.array([155, 255, 255])
        lower_yellow = np.array([8, 20, 20])
        upper_yellow = np.array([50, 255, 255])

        mask_red = cv2.inRange(hsv, lower_red1, upper_red1) | cv2.inRange(hsv, lower_red2, upper_red2)
        mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)
        mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)
        combined_mask = mask_red | mask_blue | mask_yellow

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        min_area = (w * h) * 0.0003
        max_area = (w * h) * 0.85
        contour_candidates = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if min_area < area < max_area:
                x, y, bw, bh = cv2.boundingRect(cnt)
                aspect = float(bw) / max(1, bh)
                if 0.45 <= aspect <= 2.2:
                    asp_err = abs(1.0 - aspect)
                    p1 = int(min(bw, bh) * 0.12)
                    x1a, y1a = max(0, x - p1), max(0, y - p1)
                    x2a, y2a = min(w, x + bw + p1), min(h, y + bh + p1)
                    c_a = frame[y1a:y2a, x1a:x2a]
                    if c_a.size > 0:
                        contour_candidates.append((asp_err, (x1a, y1a, x2a - x1a, y2a - y1a, c_a, "Color Contour")))

                    p2 = int(min(bw, bh) * 0.35)
                    x1b, y1b = max(0, x - p2), max(0, y - p2)
                    x2b, y2b = min(w, x + bw + p2), min(h, y + bh + p2)
                    c_b = frame[y1b:y2b, x1b:x2b]
                    if c_b.size > 0:
                        contour_candidates.append((asp_err + 0.02, (x1b, y1b, x2b - x1b, y2b - y1b, c_b, "Expanded Contour")))

        contour_candidates.sort(key=lambda c: c[0])
        for c in contour_candidates[:6]:
            candidates.append(c[1])

        # 5. High-Contrast Edge Contours (for phone screens & white cards)
        edges = cv2.Canny(blurred, 40, 140)
        edge_cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        edge_cands = []
        for cnt in edge_cnts:
            area = cv2.contourArea(cnt)
            if (w * h * 0.01) < area < (w * h * 0.70):
                x, y, bw, bh = cv2.boundingRect(cnt)
                aspect = float(bw) / max(1, bh)
                if 0.5 <= aspect <= 2.0:
                    edge_cands.append((area, (x, y, bw, bh, frame[y:y+bh, x:x+bw], "Edge Contour")))
        edge_cands.sort(key=lambda c: c[0], reverse=True)
        for c in edge_cands[:3]:
            candidates.append(c[1])

        # 6. Roadside Driver Focal Crop (highway driving sign placement)
        rw, rh = int(w * 0.35), int(h * 0.50)
        rx, ry = int(w * 0.60), int(h * 0.22)
        candidates.append((rx, ry, rw, rh, frame[ry:ry+rh, rx:rx+rw], "Roadside Crop"))

        # 7. Full frame fallback
        candidates.append((0, 0, w, h, frame, "Full Frame"))
        return candidates


    def draw_hud_overlay(self, frame, detection_results, fps, latency_ms, raw_rois=None, all_preds=None, best_candidate=None, agent_step=None):
        """
        Draws rich HUD overlays with Interactive Targeting Reticle and Multi-Agent telemetry.
        - raw_rois: list of candidate ROI tuples.
        - all_preds: predictions for candidate ROIs.
        - detection_results: confirmed (above-threshold) detections.
        - best_candidate: dict with 'bbox' and 'prediction' for highest-scoring region.
        - agent_step: decision dict from TrafficSafetyCoordinator.
        """
        h, w, _ = frame.shape
        raw_rois = raw_rois or []
        all_preds = all_preds or []

        # ── Top Aerospace Telemetry Banner ────────────────────────────────────
        banner_height = 68
        banner_bg = frame.copy()
        cv2.rectangle(banner_bg, (0, 0), (w, banner_height), (20, 14, 10), -1)
        cv2.addWeighted(banner_bg, 0.88, frame, 0.12, 0, frame)
        cv2.line(frame, (0, banner_height), (w, banner_height), (240, 140, 30), 1)

        fps_text = (f"FPS: {fps:.1f}  |  Latency: {latency_ms:.1f}ms  |  "
                    f"Threshold: {int(self.confidence_threshold * 100)}% (+/-)  |  "
                    f"Audio: {'Active 🔊' if self.enable_audio else 'Muted 🔇'}")
        cv2.putText(frame, "AEROVISION ADAS // REAL-TIME RTO SAFETY INTELLIGENCE", (16, 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(frame, f"Model: {self.predictor.model_name.upper()} (108 RTO Classes)  |  {fps_text}", (16, 52),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 220, 245), 1, cv2.LINE_AA)

        # ── Bottom Controls Hint ──────────────────────────────────────────────
        controls_str = "[Q] Quit  [S] Save Snapshot  [M] Switch Model  [A] Toggle Audio  [+/-] Sensitivity"
        cv2.putText(frame, controls_str, (16, h - 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.44, (180, 205, 235), 1, cv2.LINE_AA)

        # ── Interactive Central Targeting Reticle ────────────────────────────
        rx1, ry1 = int(w * 0.24), int(h * 0.18)
        rx2, ry2 = int(w * 0.76), int(h * 0.80)
        rw, rh = rx2 - rx1, ry2 - ry1
        corner_len = int(min(rw, rh) * 0.18)
        c_thick = 2

        is_confirmed = bool(detection_results) or (agent_step and agent_step.get("status") == "alert")
        top_pred = best_candidate['prediction'] if best_candidate else None
        top_conf = top_pred['confidence_percentage'] if top_pred else 0.0

        if is_confirmed:
            reticle_col = (80, 220, 50)     # Emerald Green
            reticle_tag = f" [ LOCKED: {top_pred['class_name'] if top_pred else ''} ({top_conf:.1f}%) ] "
        elif top_pred and top_pred['confidence_score'] >= 0.22:
            reticle_col = (20, 160, 245)    # Amber Gold
            reticle_tag = f" [ ACQUIRING: {top_pred['class_name']} ({top_conf:.1f}%) ] "
        else:
            reticle_col = (240, 140, 30)    # Electric Sapphire
            reticle_tag = " [ 🎯 TARGET RETICLE: POSITION SIGN HERE ] "

        # Draw 4 corner brackets
        cv2.line(frame, (rx1, ry1), (rx1 + corner_len, ry1), reticle_col, c_thick)
        cv2.line(frame, (rx1, ry1), (rx1 + corner_len, ry1), reticle_col, c_thick)
        cv2.line(frame, (rx2, ry1), (rx2 - corner_len, ry1), reticle_col, c_thick)
        cv2.line(frame, (rx2, ry1), (rx2, ry1 + corner_len), reticle_col, c_thick)
        cv2.line(frame, (rx1, ry2), (rx1 + corner_len, ry2), reticle_col, c_thick)
        cv2.line(frame, (rx1, ry2), (rx1, ry2 - corner_len), reticle_col, c_thick)
        cv2.line(frame, (rx2, ry2), (rx2 - corner_len, ry2), reticle_col, c_thick)
        cv2.line(frame, (rx2, ry2), (rx2, ry2 - corner_len), reticle_col, c_thick)

        # Center subtle crosshair
        cx, cy = w // 2, h // 2
        cv2.circle(frame, (cx, cy), 3, reticle_col, -1)
        cv2.line(frame, (cx - 14, cy), (cx - 5, cy), reticle_col, 1)
        cv2.line(frame, (cx + 5, cy), (cx + 14, cy), reticle_col, 1)
        cv2.line(frame, (cx, cy - 14), (cx, cy - 5), reticle_col, 1)
        cv2.line(frame, (cx, cy + 5), (cx, cy + 14), reticle_col, 1)

        # Label above reticle
        (rtw, rth), _ = cv2.getTextSize(reticle_tag, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 2)
        cv2.rectangle(frame, (cx - rtw//2 - 6, ry1 - rth - 8), (cx + rtw//2 + 6, ry1 - 2), (16, 12, 10), -1)
        cv2.rectangle(frame, (cx - rtw//2 - 6, ry1 - rth - 8), (cx + rtw//2 + 6, ry1 - 2), reticle_col, 1)
        cv2.putText(frame, reticle_tag, (cx - rtw//2, ry1 - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, reticle_col, 2, cv2.LINE_AA)

        color_bgr_map = {
            "CRITICAL":      (50,  50, 240),  # Ruby Red
            "WARNING":       (20, 160, 245),  # Amber Gold
            "INFORMATIONAL": (240, 140,  30),  # Electric Sapphire
        }

        # ── Draw Bounding Boxes ───────────────────────────────────────────────
        if is_confirmed and detection_results:
            for det in detection_results:
                x, y, bw, bh = det['bbox']
                res = det['prediction']
                alert = det.get('alert') or self.alert_system.process_detection(res['class_id'], res['confidence_score'])
                bgr = color_bgr_map.get(alert['risk_tier'], (0, 230, 80))
                conf_pct = res['confidence_percentage']

                # Bounding box
                cv2.rectangle(frame, (x, y), (x + bw, y + bh), bgr, 3)

                # Confidence bar
                bar_x1, bar_y1 = x + 4, y + 4
                bar_x2 = x + bw - 4
                bar_h = 12
                bar_filled = int((bar_x2 - bar_x1) * (conf_pct / 100.0))
                cv2.rectangle(frame, (bar_x1, bar_y1), (bar_x2, bar_y1 + bar_h), (30, 30, 30), -1)
                cv2.rectangle(frame, (bar_x1, bar_y1), (bar_x1 + bar_filled, bar_y1 + bar_h), bgr, -1)

                # Label tag
                tag = f"{alert['risk_tier']}  {res['class_name']}  {conf_pct:.1f}%"
                (lw, lh), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.52, 2)
                ly = max(y - 8, lh + banner_height + 6)
                cv2.rectangle(frame, (x, ly - lh - 5), (x + lw + 10, ly + 4), bgr, -1)
                cv2.putText(frame, tag, (x + 5, ly),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 2, cv2.LINE_AA)

            # Center-Screen Action Advisory Banner
            top_det = detection_results[0]
            top_res = top_det['prediction']
            top_alert = top_det.get('alert') or self.alert_system.process_detection(top_res['class_id'], top_res['confidence_score'])
            top_bgr = color_bgr_map.get(top_alert['risk_tier'], (0, 230, 80))
            banner_txt = f"  ALERT: {top_res['class_name'].upper()} ({top_res['confidence_percentage']:.1f}%)  "
            action_txt = f"  REQUIRED ACTION: {top_alert['advice'][:75]}  "

            (btw, bth), _ = cv2.getTextSize(banner_txt, cv2.FONT_HERSHEY_SIMPLEX, 0.72, 2)
            cx_b = max(0, (w - btw) // 2)
            by_b = banner_height + 14 + bth

            det_bg = frame.copy()
            cv2.rectangle(det_bg, (cx_b - 8, banner_height + 6), (cx_b + btw + 8, banner_height + 6 + bth + 8), (10, 10, 10), -1)
            cv2.addWeighted(det_bg, 0.75, frame, 0.25, 0, frame)
            cv2.putText(frame, banner_txt, (cx_b, by_b),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.72, top_bgr, 2, cv2.LINE_AA)

            (actw, acth), _ = cv2.getTextSize(action_txt, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
            act_cx = max(0, (w - actw) // 2)
            act_cy = by_b + acth + 8
            act_bg = frame.copy()
            cv2.rectangle(act_bg, (act_cx - 6, act_cy - acth - 4), (act_cx + actw + 6, act_cy + 4), (20, 20, 20), -1)
            cv2.addWeighted(act_bg, 0.75, frame, 0.25, 0, frame)
            cv2.putText(frame, action_txt, (act_cx, act_cy),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 255, 200), 1, cv2.LINE_AA)

        elif best_candidate and best_candidate['prediction']['confidence_score'] >= 0.22:
            # Active tracking lock-on candidate
            bx, by, bw, bh = best_candidate['bbox']
            if bw < w and bh < h:
                cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), (255, 220, 0), 2)
                cand_tag = f"TRACKING: {top_pred['class_name']} ({top_conf:.1f}%)"
                (cw_t, ch_t), _ = cv2.getTextSize(cand_tag, cv2.FONT_HERSHEY_SIMPLEX, 0.46, 1)
                cv2.rectangle(frame, (bx, max(0, by - ch_t - 6)), (bx + cw_t + 8, by), (20, 20, 20), -1)
                cv2.putText(frame, cand_tag, (bx + 4, max(14, by - 4)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.46, (255, 220, 0), 1, cv2.LINE_AA)

        # ── Bottom-Right Driver Advisory Panel ────────────────────────────────
        ph = 130
        pw = min(440, w - 40)
        px1, py1 = w - pw - 20, h - ph - 45
        px2, py2 = w - 20, h - 45
        if px1 > 0 and py1 > banner_height:
            pb = frame.copy()
            cv2.rectangle(pb, (px1, py1), (px2, py2), (12, 12, 14), -1)
            cv2.addWeighted(pb, 0.85, frame, 0.15, 0, frame)

            if is_confirmed and detection_results:
                top_det = detection_results[0]
                top_res = top_det['prediction']
                top_alert = top_det.get('alert') or self.alert_system.process_detection(top_res['class_id'], top_res['confidence_score'])
                top_bgr = color_bgr_map.get(top_alert['risk_tier'], (0, 230, 80))
                cv2.rectangle(frame, (px1, py1), (px2, py2), top_bgr, 2)
                cv2.putText(frame, f"STATUS: {top_alert['risk_tier']} ALERT CONFIRMED", (px1 + 10, py1 + 26),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, top_bgr, 2, cv2.LINE_AA)
                cv2.putText(frame, f"Sign: #{top_res['class_id']} {top_res['class_name']}", (px1 + 10, py1 + 52),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)

                words = top_alert['advice'].split()
                line1, line2 = "", ""
                for wd in words:
                    if len(line1 + " " + wd) < 40:
                        line1 += " " + wd
                    else:
                        line2 += " " + wd
                cv2.putText(frame, line1.strip(), (px1 + 10, py1 + 76),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.44, (220, 240, 220), 1, cv2.LINE_AA)
                if line2:
                    cv2.putText(frame, line2.strip(), (px1 + 10, py1 + 98),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.44, (220, 240, 220), 1, cv2.LINE_AA)

                agent_msg = f"Agent: {agent_step['status'].upper() if agent_step else 'CONFIRMED'}"
                cv2.putText(frame, f"{agent_msg} | Conf: {top_res['confidence_percentage']:.1f}%",
                            (px1 + 10, py1 + 120), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 180, 180), 1, cv2.LINE_AA)
            elif top_pred and top_pred['confidence_score'] >= 0.22:
                cv2.rectangle(frame, (px1, py1), (px2, py2), (255, 220, 0), 2)
                cv2.putText(frame, "STATUS: ACQUIRING SIGN FOCUS...", (px1 + 10, py1 + 26),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 220, 0), 2, cv2.LINE_AA)
                cv2.putText(frame, f"Candidate: {top_pred['class_name']} ({top_conf:.1f}%)", (px1 + 10, py1 + 55),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.46, (255, 255, 255), 1, cv2.LINE_AA)
                cv2.putText(frame, "* Hold steady inside central reticle", (px1 + 10, py1 + 82),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 230, 255), 1, cv2.LINE_AA)
                cv2.putText(frame, f"* Threshold: {self.confidence_threshold:.2f} (Press '-' to lower)", (px1 + 10, py1 + 106),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 180, 180), 1, cv2.LINE_AA)
            else:
                cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 210, 60), 2)
                cv2.putText(frame, "STATUS: SCANNING VIDEO FEED", (px1 + 10, py1 + 26),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 210, 60), 2, cv2.LINE_AA)
                cv2.putText(frame, "* Hold traffic sign or phone in target reticle", (px1 + 10, py1 + 58),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.44, (220, 220, 220), 1, cv2.LINE_AA)
                cv2.putText(frame, "* Ensure adequate room lighting on sign", (px1 + 10, py1 + 82),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 200), 1, cv2.LINE_AA)
                cv2.putText(frame, f"* Active Model: 108 Indian RTO Signs", (px1 + 10, py1 + 106),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.40, (160, 200, 255), 1, cv2.LINE_AA)

        return frame

    def _open_capture(self, cam_id):
        """Attempts to open VideoCapture with platform-optimized backends and verifies a frame can be read."""
        # On Windows, try DirectShow (CAP_DSHOW) first as MSMF often has MF_E_INVALIDREQUEST issues
        backends = []
        if isinstance(cam_id, int) and sys.platform.startswith("win"):
            backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]
        else:
            backends = [cv2.CAP_ANY]

        for backend in backends:
            try:
                cap = cv2.VideoCapture(cam_id, backend) if backend != cv2.CAP_ANY else cv2.VideoCapture(cam_id)
                if cap.isOpened():
                    # Test grabbing a frame to make sure it's not locked/black/empty
                    for _ in range(3):
                        ret, test_frame = cap.read()
                        if ret and test_frame is not None and test_frame.size > 0:
                            print(f"[SUCCESS] Camera {cam_id} opened successfully with backend {backend} ({test_frame.shape[1]}x{test_frame.shape[0]}).")
                            return cap
                    cap.release()
            except Exception as e:
                print(f"[DEBUG] Backend {backend} attempt failed: {e}")
        return None

    def _generate_demo_frame(self, target_class_id=None):
        """Generates a dynamic simulated road scene with real canonical traffic signs for all 108 RTO classes."""
        h, w = 720, 1280
        frame = np.zeros((h, w, 3), dtype=np.uint8)

        # Sky gradient
        frame[:360, :] = (230, 190, 140)
        # Road asphalt
        frame[360:, :] = (55, 55, 60)
        # Horizon green grass line
        frame[350:370, :] = (60, 120, 60)

        # Lane markings
        offset = (self.demo_step * 8) % 80
        for y in range(380 + offset, 720, 80):
            cv2.line(frame, (640, y), (640, min(720, y + 40)), (0, 220, 240), 4)

        # Select which of the 108 signs to display
        if target_class_id is not None and 0 <= int(target_class_id) < 108:
            cid = int(target_class_id)
        else:
            # Cycle sequentially across all 108 RTO classes (every 90 frames ~3s per sign)
            cid = (self.demo_step // 90) % 108

        # Position moving towards driver
        t = (self.demo_step % 120) / 120.0
        sign_size = int(80 + t * 140)  # zooms in from 80 to 220px
        sign_x = int(820 + t * 130)
        sign_y = int(210 + t * 120)

        canonical_path = Path(f"dataset/Test/{cid}/canonical.png")
        if canonical_path.exists() and sign_x + sign_size < w and sign_y + sign_size < h:
            c_img = cv2.imread(str(canonical_path))
            if c_img is not None:
                sign_resized = cv2.resize(c_img, (sign_size, sign_size), interpolation=cv2.INTER_AREA)
                frame[sign_y:sign_y+sign_size, sign_x:sign_x+sign_size] = sign_resized

        self.demo_step += 1
        return frame

    def run(self):
        """Starts real-time webcam video stream processing loop."""
        cap = None
        if not self.demo_mode:
            print(f"[INFO] Opening OpenCV Webcam Stream (Camera ID: {self.camera_id})...")
            cap = self._open_capture(self.camera_id)

            # Fallback probe alternative camera IDs (0, 1, 2, 3)
            if cap is None and isinstance(self.camera_id, int):
                for alt_id in [0, 1, 2, 3]:
                    if alt_id != self.camera_id:
                        print(f"[INFO] Probing alternative camera index: {alt_id}...")
                        cap = self._open_capture(alt_id)
                        if cap is not None:
                            self.camera_id = alt_id
                            break

            if cap is None:
                print("=" * 65)
                print("[ERROR] Unable to access a working webcam stream!")
                print("Troubleshooting steps for Windows:")
                print(" 1. Check physical privacy shutter / slider on your webcam.")
                print(" 2. Open Lenovo Vantage and turn OFF 'Camera Privacy Mode'.")
                print(" 3. Open Windows Settings -> Privacy & Security -> Camera -> Allow desktop apps.")
                print(" 4. Close any browser tabs or applications currently using the camera.")
                print(" 5. If using a secondary camera, specify: --camera 0 (or 1)")
                print(" 6. You can also run with simulated demo mode: --demo")
                print("=" * 65)
                return

            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        else:
            print("[INFO] Running in SIMULATED DEMO MODE (interactive driving road feed).")

        window_name = "Real-Time Traffic Sign Recognition & Action Advisory"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, 1280, 720)
        cv2.setMouseCallback(window_name, self._mouse_callback)

        prev_time = time.time()
        frame_count = 0
        fps = 0.0
        consecutive_empty = 0

        print("=" * 65)
        print("    REAL-TIME WEBCAM TRAFFIC SIGN RECOGNITION ENGINE STARTED    ")
        print("=" * 65)
        print("  Controls:")
        print("    [Click / Drag] Lock custom Target Box directly on sign")
        print("    [Right-Click/R] Reset target reticle to center")
        print("    [SPACE] Freeze frame & run Deep Forensic Scan (TTA)")
        print("    [L] Cycle & Inject canonical 108 RTO signs to verify")
        print("    [Q] Quit application")
        print("    [S] Save frame screenshot")
        print("    [M] Toggle between available model checkpoints")
        print("    [A] Toggle TTS Audio alerts ON/OFF")
        print("    [+] Increase confidence threshold")
        print("    [-] Decrease confidence threshold")
        print("=" * 65)

        try:
            while self.demo_mode or (cap is not None and cap.isOpened()):
                if self.is_frozen and self.frozen_frame is not None:
                    frame = self.frozen_frame.copy()
                    time.sleep(0.03)
                elif self.demo_mode:
                    frame = self._generate_demo_frame()
                    time.sleep(0.033)
                else:
                    ret, frame = cap.read()
                    if not ret or frame is None or frame.size == 0:
                        consecutive_empty += 1
                        if consecutive_empty % 30 == 1:
                            print(f"[WARNING] Empty frame received ({consecutive_empty} times). Retrying...")
                        time.sleep(0.03)
                        if consecutive_empty > 60:
                            print("[ERROR] Camera stream interrupted or blocked. Check privacy shutter or permissions.")
                            break
                        continue
                    consecutive_empty = 0

                # Inject canonical sign if selected via [L]
                if self.injected_sign_cid is not None:
                    c_p = Path(f"dataset/Test/{self.injected_sign_cid}/canonical.png")
                    if c_p.exists():
                        c_im = cv2.imread(str(c_p))
                        if c_im is not None:
                            h_f, w_f = frame.shape[:2]
                            sz = int(min(w_f, h_f) * 0.35)
                            c_res = cv2.resize(c_im, (sz, sz), interpolation=cv2.INTER_AREA)
                            ox, oy = (w_f - sz) // 2, (h_f - sz) // 2
                            frame[oy:oy+sz, ox:ox+sz] = c_res
                            cv2.rectangle(frame, (ox - 4, oy - 4), (ox + sz + 4, oy + sz + 4), (0, 255, 255), 2)
                            tag_msg = f"[ TEST INJECTION: #{self.injected_sign_cid:03d} {self.predictor.class_names.get(self.injected_sign_cid, '')} ]"
                            cv2.putText(frame, tag_msg, (ox - 30, max(24, oy - 10)),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 255, 255), 2, cv2.LINE_AA)

                t_start = time.time()

                # 1. Detect candidate Traffic Sign ROIs
                rois = self.detect_traffic_sign_rois(frame)

                best_candidate = None
                raw_detections = []
                all_preds = []

                if rois:
                    for item in rois:
                        x, y, bw, bh = item[0], item[1], item[2], item[3]
                        cropped = item[4]

                        # Square-pad (letterbox) to maintain circular/triangular aspect ratio
                        padded_crop = square_pad_crop(cropped)
                        res = self.predictor.predict(padded_crop, use_tta=self.is_frozen)
                        all_preds.append(res)

                        cand_dict = {
                            'bbox': (x, y, bw, bh),
                            'prediction': res
                        }
                        if best_candidate is None or res['confidence_score'] > best_candidate['prediction']['confidence_score']:
                            best_candidate = cand_dict

                        if res['confidence_score'] >= self.confidence_threshold:
                            alert = self.alert_system.process_detection(res['class_id'], res['confidence_score'])
                            cand_dict['alert'] = alert
                            raw_detections.append(cand_dict)

                raw_detections.sort(key=lambda d: d['prediction']['confidence_score'], reverse=True)
                detection_results = raw_detections[:2]

                # Step 2: Multi-Agent Coordinator Integration
                top_pred = best_candidate['prediction'] if best_candidate else None
                norm_lbl, norm_conf = self.adapter.normalize(top_pred) if top_pred else (None, 0.0)
                agent_step = self.coordinator.process(norm_lbl, norm_conf)

                # Promote multi-frame consensus to active detection even if slight single-frame dip
                if agent_step["status"] == "alert" and not detection_results and best_candidate:
                    alert = self.alert_system.process_detection(best_candidate['prediction']['class_id'], best_candidate['prediction']['confidence_score'])
                    best_candidate['alert'] = alert
                    detection_results = [best_candidate]

                # 3. Trigger Audio Alert if new sign detected with sufficient cooldown
                if detection_results and self.enable_audio:
                    top_alert = detection_results[0].get('alert') or self.alert_system.process_detection(detection_results[0]['prediction']['class_id'], detection_results[0]['prediction']['confidence_score'])
                    curr_time = time.time()
                    if top_alert and top_alert['detected'] and top_alert['speech_prompt']:
                        class_id = top_alert['class_id']
                        if (class_id != self.last_spoken_class) or (curr_time - self.last_audio_time > self.audio_cooldown):
                            self._speak_alert(top_alert['speech_prompt'])
                            self.last_audio_time = curr_time
                            self.last_spoken_class = class_id

                latency_ms = (time.time() - t_start) * 1000.0

                # Calculate FPS
                frame_count += 1
                curr_t = time.time()
                if curr_t - prev_time >= 1.0:
                    fps = frame_count / (curr_t - prev_time)
                    frame_count = 0
                    prev_time = curr_t

                # 4. Draw HUD Overlays with Targeting Reticle and Multi-Agent Decision
                annotated_frame = self.draw_hud_overlay(
                    frame, detection_results, fps, latency_ms,
                    raw_rois=rois, all_preds=all_preds,
                    best_candidate=best_candidate, agent_step=agent_step
                )

                if self.is_frozen:
                    cv2.putText(annotated_frame, "[ PAUSED: FRAME FROZEN FOR DEEP SCAN ] (Press SPACE to Resume)",
                                (20, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2, cv2.LINE_AA)

                # 5. Display OpenCV Window
                cv2.imshow(window_name, annotated_frame)

                # Keyboard Interactivity
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == 27:  # 'q' or ESC
                    print("[INFO] Quitting webcam recognition engine...")
                    break
                elif key == 32:  # SPACEBAR
                    self.is_frozen = not self.is_frozen
                    if self.is_frozen:
                        self.frozen_frame = frame.copy()
                        print("[INFO] Frame Frozen for Deep Forensic Scan (TTA Active). Press Space to resume.")
                    else:
                        self.frozen_frame = None
                        print("[INFO] Resumed live camera stream.")
                elif key == ord('r'):
                    self.custom_roi = None
                    self.injected_sign_cid = None
                    print("[INFO] Target reticle reset to center.")
                elif key == ord('l'):
                    if self.injected_sign_cid is None:
                        self.injected_sign_cid = 0
                    else:
                        self.injected_sign_cid = (self.injected_sign_cid + 1) % self.predictor.num_classes
                    print(f"[INFO] Injected Canonical Test Sign #{self.injected_sign_cid:03d}: {self.predictor.class_names.get(self.injected_sign_cid, '')}")
                elif key == ord('s'):
                    out_path = f"webcam_capture_{int(time.time())}.png"
                    cv2.imwrite(out_path, annotated_frame)
                    print(f"[SUCCESS] Saved webcam frame to: {out_path}")
                elif key == ord('m'):
                    if len(self.available_models) > 1:
                        self.current_model_idx = (self.current_model_idx + 1) % len(self.available_models)
                        next_ckpt = self.available_models[self.current_model_idx]
                        print(f"[INFO] Switching model to: {next_ckpt}")
                        self.predictor = TrafficSignPredictor(checkpoint_path=next_ckpt, dataset_dir=self.dataset_dir)
                        self.adapter.class_mapping = self.predictor.class_names
                elif key == ord('a'):
                    self.enable_audio = not self.enable_audio
                    state = "ENABLED 🔊" if self.enable_audio else "DISABLED 🔇"
                    print(f"[INFO] Audio Alerts: {state}")
                elif key == ord('+') or key == ord('='):
                    self.confidence_threshold = min(0.95, self.confidence_threshold + 0.05)
                    self.alert_system.confidence_threshold = self.confidence_threshold
                    self.coordinator.threshold = self.confidence_threshold
                    self.coordinator.validation_agent.threshold = self.confidence_threshold
                    print(f"[INFO] Confidence Threshold increased to: {self.confidence_threshold:.2f}")
                elif key == ord('-'):
                    self.confidence_threshold = max(0.20, self.confidence_threshold - 0.05)
                    self.alert_system.confidence_threshold = self.confidence_threshold
                    self.coordinator.threshold = self.confidence_threshold
                    self.coordinator.validation_agent.threshold = self.confidence_threshold
                    print(f"[INFO] Confidence Threshold decreased to: {self.confidence_threshold:.2f}")

        finally:
            if cap is not None:
                cap.release()
            cv2.destroyAllWindows()
            print("[INFO] Stream released successfully.")


def main():
    parser = argparse.ArgumentParser(description="Real-Time Webcam Traffic Sign Recognition System")
    parser.add_argument("--model", type=str, default="models/rto_best.pth", help="Path to trained PyTorch model checkpoint")
    parser.add_argument("--camera", type=str, default="0", help="Webcam camera index (e.g. 0, 1) or video file path")
    parser.add_argument("--demo", action="store_true", help="Run with simulated road driving feed instead of webcam")
    parser.add_argument("--conf", type=float, default=0.35, help="Alert confidence threshold (default: 0.35)")
    parser.add_argument("--no-audio", action="store_true", help="Disable text-to-speech audio voice alerts")
    parser.add_argument("--dataset", type=str, default="dataset", help="Dataset folder path")
    args = parser.parse_args()

    cam_id = int(args.camera) if args.camera.isdigit() else args.camera

    engine = TrafficSignWebcamEngine(
        checkpoint_path=args.model,
        camera_id=cam_id,
        confidence_threshold=args.conf,
        enable_audio=not args.no_audio,
        dataset_dir=args.dataset,
        demo_mode=args.demo
    )
    engine.run()


if __name__ == "__main__":
    main()
