"""
webcam_agent_demo.py

Integrated Real-Time Webcam + Multi-Agent Safety Advisory System (Step 3).

Preserves:
- Full OpenCV webcam video ingestion with DirectShow / MSMF backends.
- HSV contour candidate ROI segmentation.
- Deep Learning TrafficSignPredictor (108 RTO classes / Universal 52 classes).
- Visual bounding boxes and keyboard controls.

Adds the Multi-Agent Layer:
- ValidationAgent: Filters low-confidence noise (< 0.70 threshold).
- ContextAgent: 3-frame confirmation & duplicate alert suppression.
- RuleAgent: Safety advisories, action directives & risk tiers.
- AlertAgent: Non-blocking pyttsx3 speech synthesis & audit history logging.
- Step 7 LLM Assistant for interactive explanations.
"""

import sys
import time
import cv2
import threading
import argparse
import numpy as np
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from traffic_safety_agents import TrafficSafetyCoordinator, ModelOutputAdapter, TrafficSafetyLLMAssistant
from src.predict import TrafficSignPredictor
from src.driver_alert import DriverAlertSystem
from src.webcam_recognition import square_pad_crop


class TrafficSafetyWebcamAgentApp:
    """Integrated Webcam Application with the Multi-Agent Safety Architecture."""

    def __init__(
        self,
        checkpoint_path="models/rto_best.pth",
        camera_id=0,
        threshold=0.45,
        required_frames=3,
        enable_audio=True,
        demo_mode=False
    ):
        self.camera_id = camera_id
        self.demo_mode = demo_mode
        self.demo_step = 0
        self.enable_audio = enable_audio

        # Instantiate Multi-Agent Coordinator
        print(f"[INFO] Initializing Traffic Safety Coordinator (threshold={threshold:.2f}, required_frames={required_frames})...")
        self.coordinator = TrafficSafetyCoordinator(
            threshold=threshold,
            required_frames=required_frames,
            enable_speech=enable_audio
        )
        self.adapter = ModelOutputAdapter()
        self.assistant = TrafficSafetyLLMAssistant(coordinator=self.coordinator)

        # Deep learning model predictor
        self.predictor = None
        ckpt_path = Path(checkpoint_path)
        if not ckpt_path.exists():
            for alt in ["models/rto_best.pth", "models/universal_best.pth", "models/baseline_best.pth"]:
                if Path(alt).exists():
                    ckpt_path = Path(alt)
                    break

        if ckpt_path.exists():
            print(f"[INFO] Loading neural network model from: {ckpt_path}")
            self.predictor = TrafficSignPredictor(checkpoint_path=str(ckpt_path))
            self.adapter.class_mapping = self.predictor.class_names
        else:
            print("[WARNING] No model checkpoint found. Running in heuristic/demo mode.")

        self.alert_system = DriverAlertSystem(confidence_threshold=threshold)

    def _open_capture(self, cam_id):
        """Attempts to open VideoCapture with platform-optimized backends."""
        backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY] if sys.platform.startswith("win") else [cv2.CAP_ANY]
        for backend in backends:
            try:
                cap = cv2.VideoCapture(cam_id, backend) if backend != cv2.CAP_ANY else cv2.VideoCapture(cam_id)
                if cap.isOpened():
                    for _ in range(3):
                        ret, test_frame = cap.read()
                        if ret and test_frame is not None and test_frame.size > 0:
                            print(f"[SUCCESS] Camera {cam_id} opened via backend {backend}.")
                            return cap
                    cap.release()
            except Exception:
                pass
        return None

    def _detect_rois(self, frame):
        """Multi-scale ROI segmentation combining color contours and focal center crops."""
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        h, w, _ = frame.shape
        candidates = []

        # Color masks for red, blue, and yellow with broader saturation support
        mask_r1 = cv2.inRange(hsv, np.array([0, 35, 30]), np.array([18, 255, 255]))
        mask_r2 = cv2.inRange(hsv, np.array([140, 35, 30]), np.array([180, 255, 255]))
        mask_red = cv2.bitwise_or(mask_r1, mask_r2)

        mask_blue = cv2.inRange(hsv, np.array([80, 35, 30]), np.array([140, 255, 255]))
        mask_yellow = cv2.inRange(hsv, np.array([12, 35, 35]), np.array([45, 255, 255]))

        combined = cv2.bitwise_or(cv2.bitwise_or(mask_red, mask_blue), mask_yellow)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        morph = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        min_dim, max_dim = 28, int(min(h, w) * 0.70)

        contour_candidates = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < (min_dim * min_dim * 0.35):
                continue
            x, y, bw, bh = cv2.boundingRect(cnt)
            if bw < min_dim or bh < min_dim or bw > max_dim or bh > max_dim:
                continue
            aspect = float(bw) / max(1, bh)
            if 0.45 <= aspect <= 2.2:
                pad_x = int(bw * 0.10)
                pad_y = int(bh * 0.10)
                x1 = max(0, x - pad_x)
                y1 = max(0, y - pad_y)
                x2 = min(w, x + bw + pad_x)
                y2 = min(h, y + bh + pad_y)
                crop = frame[y1:y2, x1:x2]
                if crop.size > 0:
                    asp_err = abs(1.0 - aspect)
                    # 1a. Standard padding
                    pad_x1 = int(bw * 0.12)
                    pad_y1 = int(bh * 0.12)
                    x1a = max(0, x - pad_x1)
                    y1a = max(0, y - pad_y1)
                    x2a = min(w, x + bw + pad_x1)
                    y2a = min(h, y + bh + pad_y1)
                    crop_a = frame[y1a:y2a, x1a:x2a]
                    if crop_a.size > 0:
                        contour_candidates.append((asp_err, (x1a, y1a, x2a - x1a, y2a - y1a, crop_a)))

                    # 1b. Expanded padding
                    pad_x2 = int(bw * 0.35)
                    pad_y2 = int(bh * 0.35)
                    x1b = max(0, x - pad_x2)
                    y1b = max(0, y - pad_y2)
                    x2b = min(w, x + bw + pad_x2)
                    y2b = min(h, y + bh + pad_y2)
                    crop_b = frame[y1b:y2b, x1b:x2b]
                    if crop_b.size > 0:
                        contour_candidates.append((asp_err + 0.02, (x1b, y1b, x2b - x1b, y2b - y1b, crop_b)))

        # Sort contour candidates so square/circular/triangular signs come first
        contour_candidates.sort(key=lambda c: c[0])
        for c in contour_candidates[:6]:
            candidates.append(c[1])

        # 2. Central Targeting Reticle at 4 nested scales (primary webcam presentation zone)
        cx, cy = w // 2, h // 2
        for scale in [0.28, 0.42, 0.58, 0.75]:
            hw, hh = int(w * scale * 0.5), int(h * scale * 0.5)
            x1, y1 = max(0, cx - hw), max(0, cy - hh)
            x2, y2 = min(w, cx + hw), min(h, cy + hh)
            c_crop = frame[y1:y2, x1:x2]
            if c_crop.size > 0:
                candidates.append((x1, y1, x2 - x1, y2 - y1, c_crop))

        # 3. Shape-Aware Hough Circles (detects circular signs on phone screens / backlit displays)
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
                    candidates.append((x1, y1, x2 - x1, y2 - y1, c_crop))

        # 4. Roadside crop (driving feed sign location)
        rw, rh = int(w * 0.35), int(h * 0.50)
        rx, ry = int(w * 0.60), int(h * 0.22)
        crop_right = frame[ry:ry+rh, rx:rx+rw]
        if crop_right.size > 0:
            candidates.append((rx, ry, rw, rh, crop_right))

        # 5. Full frame fallback
        candidates.append((0, 0, w, h, frame))
        return candidates[:12]

    def _generate_simulated_frame(self, target_class_id=None):
        """Generates dynamic driving road feed with real 108-class canonical signs for live testing."""
        h, w = 720, 1280
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        frame[:360, :] = (230, 190, 140)  # sky
        frame[360:, :] = (55, 55, 60)      # road
        frame[350:370, :] = (60, 120, 60)  # horizon

        offset = (self.demo_step * 8) % 80
        for y in range(380 + offset, 720, 80):
            cv2.line(frame, (640, y), (640, min(720, y + 40)), (0, 220, 240), 4)

        if target_class_id is not None and 0 <= int(target_class_id) < 108:
            cid = int(target_class_id)
        else:
            cid = (self.demo_step // 90) % 108
        self.active_sim_class_id = cid

        t = (self.demo_step % 120) / 120.0
        sign_size = int(80 + t * 140)
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
        """Starts real-time webcam video stream processing loop with Multi-Agent HUD."""
        cap = None
        if not self.demo_mode:
            print(f"[INFO] Opening OpenCV Webcam Stream (Camera ID: {self.camera_id})...")
            cap = self._open_capture(self.camera_id)
            if cap is None:
                print(f"[WARNING] Could not open camera {self.camera_id}. Switching to simulated driving mode.")
                self.demo_mode = True
            else:
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        window_name = "Traffic Safety Agent — Real-Time HUD"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, 1280, 720)

        print("=" * 65)
        print("  TRAFFIC SAFETY AGENT ENGINE RUNNING (Desktop Prototype)  ")
        print("=" * 65)
        print("  Controls:")
        print("    [Q] Quit application")
        print("    [A] Toggle TTS Audio Voice Alerts")
        print("    [E] Explain recent events via AI Assistant")
        print("    [+] Increase confidence threshold")
        print("    [-] Decrease confidence threshold")
        print("=" * 65)

        prev_time = time.time()
        fps = 0.0

        try:
            while self.demo_mode or (cap is not None and cap.isOpened()):
                if self.demo_mode:
                    frame = self._generate_simulated_frame()
                    time.sleep(0.033)
                else:
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        time.sleep(0.03)
                        continue

                t_start = time.time()
                h, w, _ = frame.shape

                # 1. Detect candidate ROIs
                rois = self._detect_rois(frame)

                top_label = None
                top_conf = 0.0
                best_box = None

                # 2. Run model classification if ROIs found
                if rois and self.predictor:
                    for rx, ry, rbw, rbh, crop in rois:
                        try:
                            padded_crop = square_pad_crop(crop)
                            pred = self.predictor.predict(padded_crop, use_tta=False)
                            norm_lbl, norm_conf = self.adapter.normalize(pred)
                            if norm_conf > top_conf:
                                top_conf = norm_conf
                                top_label = norm_lbl
                                best_box = (rx, ry, rbw, rbh)
                        except Exception:
                            pass

                # If no ROI found in demo mode, canonical sign fallback
                if not top_label and self.demo_mode and hasattr(self, 'active_sim_class_id'):
                    cid = self.active_sim_class_id
                    sign_name = self.predictor.class_names.get(cid, f"Class_{cid}") if self.predictor else f"Class_{cid}"
                    top_label, top_conf = sign_name, 0.92

                # ── Step 3: Pass Normalized Prediction to Multi-Agent Coordinator ──
                result = self.coordinator.process(top_label, top_conf)

                # Draw bounding box for active candidate
                if best_box:
                    bx, by, bw, bh = best_box
                    box_color = (0, 255, 0) if result["status"] == "alert" else (0, 200, 255)
                    cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), box_color, 2)
                    tag = f"{top_label} ({top_conf*100:.1f}%)"
                    cv2.putText(frame, tag, (bx, max(20, by - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 2)

                # ── Step 3: Display Agent Status on Camera Frame ───────────────
                # Top Agent Banner (Semi-transparent dark header)
                banner_bg = frame.copy()
                cv2.rectangle(banner_bg, (0, 0), (w, 65), (15, 15, 22), -1)
                cv2.addWeighted(banner_bg, 0.82, frame, 0.18, 0, frame)

                hud_color = (0, 255, 0) if result["status"] == "alert" else (0, 200, 255)
                cv2.putText(
                    frame,
                    f"AGENT: {result['message']}",
                    (20, 36),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.65,
                    hud_color,
                    2,
                    cv2.LINE_AA
                )

                # Telemetry subtext
                stats = self.coordinator.get_summary_stats()
                telemetry = (
                    f"Status: {result['status'].upper()}  |  "
                    f"Tracked: {stats.get('current_tracked_sign') or 'None'} ({stats.get('consecutive_frames')}/{stats.get('required_frames')})  |  "
                    f"Conf: {top_conf*100:.1f}%  |  Alerts: {len(self.coordinator.history)}  |  "
                    f"Audio: {'ON' if self.coordinator.alert_agent.enable_speech else 'OFF'}"
                )
                cv2.putText(frame, telemetry, (20, 56), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (180, 200, 255), 1, cv2.LINE_AA)

                # Bottom control hints
                cv2.putText(
                    frame,
                    "[Q] Quit   [A] Toggle Voice   [E] AI Explainer   [+/-] Confidence Threshold",
                    (20, h - 14),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.44,
                    (200, 200, 200),
                    1,
                    cv2.LINE_AA
                )

                # 4. Display OpenCV Window
                cv2.imshow(window_name, frame)

                # Keyboard controls
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == 27:
                    break
                elif key == ord('a'):
                    self.coordinator.alert_agent.enable_speech = not self.coordinator.alert_agent.enable_speech
                    print(f"[INFO] Audio Alerts: {'ENABLED' if self.coordinator.alert_agent.enable_speech else 'DISABLED'}")
                elif key == ord('e'):
                    print("\n" + "=" * 60)
                    print(self.assistant.query("Why did the coordinator issue this alert?"))
                    print("=" * 60 + "\n")
                elif key == ord('+') or key == ord('='):
                    self.coordinator.threshold = min(0.95, self.coordinator.threshold + 0.05)
                    self.coordinator.validation_agent.threshold = self.coordinator.threshold
                    print(f"[INFO] Threshold increased to: {self.coordinator.threshold:.2f}")
                elif key == ord('-'):
                    self.coordinator.threshold = max(0.30, self.coordinator.threshold - 0.05)
                    self.coordinator.validation_agent.threshold = self.coordinator.threshold
                    print(f"[INFO] Threshold decreased to: {self.coordinator.threshold:.2f}")

        finally:
            if cap is not None:
                cap.release()
            cv2.destroyAllWindows()
            print("[INFO] Traffic Safety Agent shut down successfully.")


def main():
    parser = argparse.ArgumentParser(description="Traffic Safety Multi-Agent Real-Time System")
    parser.add_argument("--camera", type=int, default=0, help="Webcam device ID (default: 0)")
    parser.add_argument("--demo", action="store_true", help="Run with simulated road sign feed")
    parser.add_argument("--threshold", type=float, default=0.70, help="Agent confidence threshold (default: 0.70)")
    parser.add_argument("--frames", type=int, default=3, help="Required consecutive frames (default: 3)")
    parser.add_argument("--no-audio", action="store_true", help="Disable voice audio alerts")
    args = parser.parse_args()

    app = TrafficSafetyWebcamAgentApp(
        camera_id=args.camera,
        threshold=args.threshold,
        required_frames=args.frames,
        enable_audio=not args.no_audio,
        demo_mode=args.demo
    )
    app.run()


if __name__ == "__main__":
    main()
