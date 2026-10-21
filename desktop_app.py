"""
desktop_app.py

High-Precision Standalone Desktop Application for Real-Time Traffic Sign Recognition
and Intelligent Driver Safety Advisory (108 Official Indian RTO Classes).

Features:
- Hardware-accelerated webcam ingestion (DirectShow / MSMF / simulated highway feed).
- Interactive Canvas Targeting: Click anywhere or drag to draw an exact ROI over the sign.
- Advanced Multi-Scale Detection Engine:
    * Shape-aware Hough Circle & Adaptive Threshold contours (immune to phone backlight glare)
    * Multi-scale foveal pyramid (25%, 40%, 55%, 70%, 85%)
    * Aspect-ratio letterbox padding (1:1 square) to maintain circular & triangular sign geometry
    * Test-Time Augmentation (TTA) 6-pass inference
- Real-Time Top-5 Probability Distribution visualizer.
- Statutory Driver Action Advisories under the Motor Vehicles Act with Risk Tier badges.
- One-Click Freeze & Deep Forensic Scan.
- Built-in 108 Official RTO Sign Quick-Tester & Reference Library.
- Non-blocking speech synthesis voice alerts with configurable cooldown.
"""

import sys
import time
import cv2
import threading
import numpy as np
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk

# Ensure project root is in sys.path
project_root = Path(__file__).resolve().parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    pyttsx3 = None
    HAS_PYTTSX3 = False

from src.predict import TrafficSignPredictor
from src.driver_alert import DriverAlertSystem, GTSRB_SAFETY_METADATA
from src.webcam_recognition import square_pad_crop
from traffic_safety_agents import TrafficSafetyCoordinator, ModelOutputAdapter


class ModernTrafficSignDesktopApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Traffic Safety AI — High-Precision Desktop Recognition System")
        self.root.geometry("1380x880")
        self.root.minsize(1180, 750)
        self.root.configure(bg="#0f111a")

        # System State
        self.camera_id = 0
        self.is_running = True
        self.is_frozen = False
        self.frozen_frame = None
        self.demo_mode = False
        self.demo_step = 0
        self.enable_audio = True
        self.enable_tta = False
        self.enhance_backlight = True
        self.confidence_threshold = 0.35
        self.reticle_scale = 0.45

        # Custom Mouse ROI State
        self.custom_roi = None       # (x1, y1, x2, y2) in canvas coordinates
        self.drag_start = None
        self.is_dragging = False

        # Audio TTS Setup
        self.last_audio_time = 0.0
        self.audio_cooldown = 4.0
        self.last_spoken_class = None
        self.tts_lock = threading.Lock()

        # Load Neural Network & Multi-Agent Pipeline
        self._init_models()

        # Video Capture Object
        self.cap = None
        self.current_frame = None
        self.prev_time = time.time()
        self.fps = 0.0

        # Build UI Layout
        self._setup_styles()
        self._build_ui()

        # Keyboard Shortcuts
        self.root.bind("<space>", lambda e: self.toggle_freeze())
        self.root.bind("<q>", lambda e: self.on_close())
        self.root.bind("<Escape>", lambda e: self.reset_custom_roi())

        # Start Camera Loop
        self._open_camera(self.camera_id)
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.after(30, self._video_loop)

    def _init_models(self):
        ckpt_path = "models/rto_best.pth"
        if not Path(ckpt_path).exists():
            for alt in ["models/universal_best.pth", "models/baseline_best.pth"]:
                if Path(alt).exists():
                    ckpt_path = alt
                    break

        print(f"[INFO] Initializing Predictor with {ckpt_path}...")
        self.predictor = TrafficSignPredictor(checkpoint_path=ckpt_path)
        self.alert_system = DriverAlertSystem(confidence_threshold=self.confidence_threshold)
        self.coordinator = TrafficSafetyCoordinator(
            threshold=self.confidence_threshold,
            required_frames=2,
            enable_speech=False
        )
        self.adapter = ModelOutputAdapter(class_mapping=self.predictor.class_names)

    def _setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#0a0f1d")
        style.configure("Card.TFrame", background="#111827", relief="flat")
        style.configure("TLabel", background="#0a0f1d", foreground="#f8fafc", font=("Segoe UI", 9))
        style.configure("Card.TLabel", background="#111827", foreground="#f8fafc", font=("Segoe UI", 9))
        style.configure("Header.TLabel", background="#0a0f1d", foreground="#38bdf8", font=("Segoe UI", 12, "bold"))
        style.configure("CardHeader.TLabel", background="#111827", foreground="#38bdf8", font=("Segoe UI", 10, "bold"))
        style.configure("TButton", font=("Segoe UI", 9, "bold"), padding=6)
        style.configure("Action.TButton", background="#2563eb", foreground="#ffffff")

    def _build_ui(self):
        # ── Top Aerospace ADAS Header ─────────────────────────────────────────
        header_frame = tk.Frame(self.root, bg="#0d1424", height=54, bd=1, relief="ridge")
        header_frame.pack(fill="x", side="top", padx=0, pady=0)

        app_title = tk.Label(
            header_frame,
            text="🛡️ AEROVISION ADAS — INTELLIGENT TRAFFIC SAFETY COCKPIT",
            bg="#0d1424", fg="#f8fafc", font=("Segoe UI", 12, "bold")
        )
        app_title.pack(side="left", padx=16, pady=10)

        self.lbl_telemetry = tk.Label(
            header_frame,
            text="[● ADAS ONLINE]  [FPS: 0.0]  [LATENCY: 0.0ms]  [RTO SCOPE: 108 CLASSES]",
            bg="#0d1424", fg="#38bdf8", font=("Consolas", 9, "bold")
        )
        self.lbl_telemetry.pack(side="right", padx=16)

        # ── Main Content Split (Left: Camera Canvas, Right: Safety Advisory HUD)
        main_container = tk.Frame(self.root, bg="#070b14")
        main_container.pack(fill="both", expand=True, padx=12, pady=10)

        # LEFT COLUMN: Video Stream & Interactive Targeting Canvas
        left_col = tk.Frame(main_container, bg="#070b14")
        left_col.pack(side="left", fill="both", expand=True, padx=(0, 8))

        # Camera Canvas Frame with Sapphire Border
        canvas_border = tk.Frame(left_col, bg="#2563eb", bd=1, relief="flat")
        canvas_border.pack(fill="both", expand=True)

        self.canvas = tk.Canvas(canvas_border, bg="#070b14", cursor="crosshair", highlightthickness=0)
        self.canvas.pack(fill="both", expand=True, padx=1, pady=1)
        self.canvas.bind("<ButtonPress-1>", self._on_canvas_press)
        self.canvas.bind("<B1-Motion>", self._on_canvas_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_canvas_release)
        self.canvas.bind("<Button-3>", lambda e: self.reset_custom_roi())

        # Targeting Instruction Guide Bar
        guide_bar = tk.Frame(left_col, bg="#111827", height=28, bd=1, relief="ridge")
        guide_bar.pack(fill="x", pady=(6, 0))
        self.lbl_targeting_tip = tk.Label(
            guide_bar,
            text="🎯 Interactive Reticle: Click/drag on camera to lock sign  |  Space: Freeze & Analyze  |  Right-Click: Auto Center",
            bg="#111827", fg="#94a3b8", font=("Segoe UI", 9)
        )
        self.lbl_targeting_tip.pack(side="left", padx=10, pady=4)

        # Interactive Control Toolbar Below Video
        control_bar = tk.Frame(left_col, bg="#111827", bd=1, relief="ridge")
        control_bar.pack(fill="x", pady=(6, 0))

        # Camera Source Dropdown
        tk.Label(control_bar, text="Camera Feed:", bg="#111827", fg="#f8fafc", font=("Segoe UI", 9, "bold")).pack(side="left", padx=(10, 4), pady=6)
        self.cb_camera = ttk.Combobox(control_bar, values=["Webcam 0", "Webcam 1", "Simulated Highway Stream"], width=17, state="readonly")
        self.cb_camera.current(0)
        self.cb_camera.pack(side="left", padx=4, pady=6)
        self.cb_camera.bind("<<ComboboxSelected>>", self._on_camera_change)

        # Action Buttons
        self.btn_freeze = tk.Button(
            control_bar, text="⏸ Freeze Scan", bg="#1e3a8a", fg="#ffffff",
            activebackground="#2563eb", activeforeground="#ffffff",
            font=("Segoe UI", 9, "bold"), relief="flat", bd=0, padx=10, command=self.toggle_freeze
        )
        self.btn_freeze.pack(side="left", padx=4, pady=6)

        self.btn_reset_roi = tk.Button(
            control_bar, text="🎯 Center Reticle", bg="#1e293b", fg="#38bdf8",
            activebackground="#334155", activeforeground="#ffffff",
            font=("Segoe UI", 9, "bold"), relief="flat", bd=0, padx=10, command=self.reset_custom_roi
        )
        self.btn_reset_roi.pack(side="left", padx=4, pady=6)

        self.btn_snapshot = tk.Button(
            control_bar, text="📸 Capture Frame", bg="#1e293b", fg="#f8fafc",
            activebackground="#334155", activeforeground="#ffffff",
            font=("Segoe UI", 9, "bold"), relief="flat", bd=0, padx=10, command=self.take_snapshot
        )
        self.btn_snapshot.pack(side="left", padx=4, pady=6)

        # Audio Toggle Checkbox
        self.var_audio = tk.BooleanVar(value=True)
        chk_audio = tk.Checkbutton(
            control_bar, text="🔊 Voice Alerts", variable=self.var_audio,
            bg="#111827", fg="#f8fafc", selectcolor="#0a0f1d", activebackground="#111827",
            font=("Segoe UI", 9), command=self._toggle_audio
        )
        chk_audio.pack(side="right", padx=12, pady=6)

        # RIGHT COLUMN: Futuristic Safety Decision & Telemetry Panels
        right_col = tk.Frame(main_container, bg="#070b14", width=470)
        right_col.pack(side="right", fill="both", expand=False)
        right_col.pack_propagate(False)

        # Panel 1: Primary Driver Action Advisory Cockpit Card
        card_advisory = tk.Frame(right_col, bg="#111827", bd=1, relief="ridge")
        card_advisory.pack(fill="x", pady=(0, 8))

        self.lbl_risk_badge = tk.Label(
            card_advisory, text="● SYSTEM NOMINAL: STANDBY SCANNING",
            bg="#064e3b", fg="#6ee7b7", font=("Segoe UI", 9, "bold"), padx=10, pady=5
        )
        self.lbl_risk_badge.pack(fill="x")

        self.lbl_sign_name = tk.Label(
            card_advisory, text="Scanning Road Sensors...",
            bg="#111827", fg="#ffffff", font=("Segoe UI", 13, "bold"), wraplength=440, justify="left"
        )
        self.lbl_sign_name.pack(anchor="w", padx=12, pady=(10, 2))

        self.lbl_confidence = tk.Label(
            card_advisory, text="Target Confidence: 0.0%",
            bg="#111827", fg="#38bdf8", font=("Segoe UI", 9)
        )
        self.lbl_confidence.pack(anchor="w", padx=12, pady=1)

        self.lbl_advice = tk.Label(
            card_advisory,
            text="Position traffic sign or mobile phone within the central reticle to engage automated road tracking.",
            bg="#111827", fg="#cbd5e1", font=("Segoe UI", 9), wraplength=440, justify="left"
        )
        self.lbl_advice.pack(anchor="w", padx=12, pady=(4, 10))

        # Multi-Agent State Indicator
        self.lbl_agent_state = tk.Label(
            card_advisory, text="🤖 Safety Agent: STANDBY • Optical Pipeline Engaged",
            bg="#0a0f1d", fg="#38bdf8", font=("Segoe UI", 8), anchor="w", padx=12, pady=4
        )
        self.lbl_agent_state.pack(fill="x")

        # Panel 2: Live Top-5 Prediction Probabilities
        card_top5 = tk.Frame(right_col, bg="#111827", bd=1, relief="ridge")
        card_top5.pack(fill="x", pady=(0, 8))

        tk.Label(
            card_top5, text="📊 Live Prediction Probabilities (Top 5)",
            bg="#111827", fg="#f8fafc", font=("Segoe UI", 9, "bold")
        ).pack(anchor="w", padx=12, pady=(8, 6))

        self.top5_bars = []
        for _ in range(5):
            row_frame = tk.Frame(card_top5, bg="#111827")
            row_frame.pack(fill="x", padx=12, pady=2)
            lbl_name = tk.Label(row_frame, text="--", bg="#111827", fg="#cbd5e1", width=25, anchor="w", font=("Segoe UI", 8))
            lbl_name.pack(side="left")
            pbar = ttk.Progressbar(row_frame, orient="horizontal", length=140, mode="determinate")
            pbar.pack(side="left", padx=4)
            lbl_pct = tk.Label(row_frame, text="0.0%", bg="#111827", fg="#38bdf8", width=7, anchor="e", font=("Consolas", 8, "bold"))
            lbl_pct.pack(side="right")
            self.top5_bars.append((lbl_name, pbar, lbl_pct))
        tk.Frame(card_top5, bg="#111827", height=6).pack()

        # Panel 3: Interactive Tuning Controls & Glare Compensation
        card_tuning = tk.Frame(right_col, bg="#111827", bd=1, relief="ridge")
        card_tuning.pack(fill="x", pady=(0, 8))

        tk.Label(
            card_tuning, text="⚙️ Sensor Sensitivity & Glare Compensation",
            bg="#111827", fg="#f8fafc", font=("Segoe UI", 9, "bold")
        ).pack(anchor="w", padx=12, pady=(8, 4))

        # Confidence Slider
        f_slider = tk.Frame(card_tuning, bg="#111827")
        f_slider.pack(fill="x", padx=12, pady=2)
        tk.Label(f_slider, text="Alert Confidence Threshold:", bg="#111827", fg="#94a3b8", font=("Segoe UI", 9)).pack(side="left")
        self.lbl_thresh_val = tk.Label(f_slider, text=f"{self.confidence_threshold:.2f}", bg="#111827", fg="#38bdf8", font=("Consolas", 9, "bold"))
        self.lbl_thresh_val.pack(side="right")
        self.slider_thresh = ttk.Scale(card_tuning, from_=0.15, to=0.85, value=self.confidence_threshold, command=self._on_thresh_change)
        self.slider_thresh.pack(fill="x", padx=12, pady=(0, 6))

        # Checkboxes for Glare Compensation & TTA
        f_checks = tk.Frame(card_tuning, bg="#111827")
        f_checks.pack(fill="x", padx=12, pady=(0, 8))
        self.var_enhance = tk.BooleanVar(value=True)
        chk_enhance = tk.Checkbutton(
            f_checks, text="Phone Glare Filter (CLAHE)", variable=self.var_enhance,
            bg="#111827", fg="#cbd5e1", selectcolor="#0a0f1d", activebackground="#111827",
            font=("Segoe UI", 8), command=self._toggle_enhance
        )
        chk_enhance.pack(side="left")

        self.var_tta = tk.BooleanVar(value=False)
        chk_tta = tk.Checkbutton(
            f_checks, text="Deep TTA (6-Pass)", variable=self.var_tta,
            bg="#111827", fg="#cbd5e1", selectcolor="#0a0f1d", activebackground="#111827",
            font=("Segoe UI", 8), command=self._toggle_tta
        )
        chk_tta.pack(side="right")

        # Panel 4: Built-in 108 Official RTO Sign Quick-Tester
        card_tester = tk.Frame(right_col, bg="#111827", bd=1, relief="ridge")
        card_tester.pack(fill="both", expand=True)

        tk.Label(
            card_tester, text="📚 108 Official RTO Sign Quick-Tester",
            bg="#111827", fg="#f8fafc", font=("Segoe UI", 9, "bold")
        ).pack(anchor="w", padx=12, pady=(8, 4))

        f_test_row = tk.Frame(card_tester, bg="#111827")
        f_test_row.pack(fill="x", padx=12, pady=2)

        # Dropdown with all 108 signs
        sign_list = [f"#{cid:03d} - {self.predictor.class_names.get(cid, f'Class {cid}')}" for cid in range(self.predictor.num_classes)]
        self.cb_signs = ttk.Combobox(f_test_row, values=sign_list, width=28, state="readonly")
        self.cb_signs.current(0)
        self.cb_signs.pack(side="left", padx=(0, 6))

        btn_test_sign = tk.Button(
            f_test_row, text="⚡ Test Sign", bg="#2563eb", fg="#ffffff",
            activebackground="#1d4ed8", activeforeground="#ffffff",
            font=("Segoe UI", 8, "bold"), relief="flat", bd=0, padx=10, command=self._test_selected_canonical
        )
        btn_test_sign.pack(side="right")

        # Canonical Thumbnail Preview Frame
        self.f_thumb_preview = tk.Frame(card_tester, bg="#0d1424", height=90, bd=1, relief="solid")
        self.f_thumb_preview.pack(fill="x", padx=12, pady=6)
        self.f_thumb_preview.pack_propagate(False)

        self.lbl_thumb = tk.Label(self.f_thumb_preview, bg="#0d1424")
        self.lbl_thumb.pack(side="left", padx=8, pady=6)

        self.lbl_thumb_info = tk.Label(
            self.f_thumb_preview, text="Select any sign above to preview and execute verification immediately.",
            bg="#0d1424", fg="#94a3b8", font=("Segoe UI", 8), wraplength=270, justify="left"
        )
        self.lbl_thumb_info.pack(side="left", padx=6, pady=6)

        self.cb_signs.bind("<<ComboboxSelected>>", self._on_preview_sign_change)
        self._on_preview_sign_change()

    # ── Interactive Targeting Event Handlers ─────────────────────────────────
    def _on_canvas_press(self, event):
        self.drag_start = (event.x, event.y)
        self.is_dragging = True

    def _on_canvas_drag(self, event):
        if self.is_dragging and self.drag_start:
            x1, y1 = self.drag_start
            x2, y2 = event.x, event.y
            self.custom_roi = (min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))

    def _on_canvas_release(self, event):
        self.is_dragging = False
        if self.drag_start:
            x1, y1 = self.drag_start
            x2, y2 = event.x, event.y
            # If user just clicked without dragging, place a 160x160 target box centered at click
            if abs(x2 - x1) < 10 and abs(y2 - y1) < 10:
                box_sz = 160
                self.custom_roi = (x2 - box_sz // 2, y2 - box_sz // 2, x2 + box_sz // 2, y2 + box_sz // 2)
            else:
                self.custom_roi = (min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))
        self.lbl_targeting_tip.config(text="🎯 Custom Target Locked | Click 'Center Reticle' to reset | Space: Freeze & Scan")

    def reset_custom_roi(self):
        self.custom_roi = None
        self.lbl_targeting_tip.config(text="🎯 Click or drag over any sign to lock on | Space: Freeze & Deep Scan | Right-Click: Auto Center")

    def toggle_freeze(self):
        self.is_frozen = not self.is_frozen
        if self.is_frozen:
            self.btn_freeze.config(text="▶️ Resume Stream", bg="#16a34a")
            self.lbl_targeting_tip.config(text="⏸️ FRAME FROZEN FOR DEEP SCAN | Click 'Resume Stream' or press Space to continue")
            # Run deep scan with full TTA on the frozen frame
            if self.current_frame is not None:
                self._run_deep_scan(self.current_frame)
        else:
            self.btn_freeze.config(text="⏸️ Freeze & Deep Scan", bg="#0284c7")
            self.reset_custom_roi()

    def _on_thresh_change(self, val):
        self.confidence_threshold = float(val)
        self.lbl_thresh_val.config(text=f"{self.confidence_threshold:.2f}")
        self.alert_system.confidence_threshold = self.confidence_threshold
        self.coordinator.threshold = self.confidence_threshold
        self.coordinator.validation_agent.threshold = self.confidence_threshold

    def _toggle_audio(self):
        self.enable_audio = self.var_audio.get()
        self.coordinator.enable_speech = self.enable_audio

    def _toggle_enhance(self):
        self.enhance_backlight = self.var_enhance.get()

    def _toggle_tta(self):
        self.enable_tta = self.var_tta.get()

    def _on_camera_change(self, event=None):
        choice = self.cb_camera.get()
        if "Webcam 0" in choice:
            self.demo_mode = False
            self._open_camera(0)
        elif "Webcam 1" in choice:
            self.demo_mode = False
            self._open_camera(1)
        elif "Simulated" in choice:
            self.demo_mode = True
            if self.cap is not None:
                self.cap.release()
                self.cap = None

    def _open_camera(self, cam_id):
        if self.cap is not None:
            self.cap.release()
        self.camera_id = cam_id
        backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY] if sys.platform.startswith("win") else [cv2.CAP_ANY]
        for b in backends:
            try:
                cap = cv2.VideoCapture(cam_id, b) if b != cv2.CAP_ANY else cv2.VideoCapture(cam_id)
                if cap.isOpened():
                    ret, test_f = cap.read()
                    if ret and test_f is not None and test_f.size > 0:
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                        self.cap = cap
                        print(f"[SUCCESS] Desktop Camera #{cam_id} opened.")
                        return
                    cap.release()
            except Exception:
                pass
        print(f"[WARNING] Unable to open camera {cam_id}. Defaulting to Simulated Stream.")
        self.demo_mode = True
        self.cb_camera.current(2)

    def _generate_demo_frame(self, target_class_id=None):
        h, w = 720, 1280
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        frame[:360, :] = (230, 190, 140)
        frame[360:, :] = (55, 55, 60)
        frame[350:370, :] = (60, 120, 60)

        offset = (self.demo_step * 8) % 80
        for y in range(380 + offset, 720, 80):
            cv2.line(frame, (640, y), (640, min(720, y + 40)), (0, 220, 240), 4)

        cid = target_class_id if target_class_id is not None else ((self.demo_step // 90) % self.predictor.num_classes)
        t = (self.demo_step % 120) / 120.0
        sign_size = int(80 + t * 140)
        sign_x = int(820 + t * 130)
        sign_y = int(210 + t * 120)

        c_path = Path(f"dataset/Test/{cid}/canonical.png")
        if c_path.exists() and sign_x + sign_size < w and sign_y + sign_size < h:
            c_img = cv2.imread(str(c_path))
            if c_img is not None:
                c_resized = cv2.resize(c_img, (sign_size, sign_size), interpolation=cv2.INTER_AREA)
                frame[sign_y:sign_y+sign_size, sign_x:sign_x+sign_size] = c_resized

        self.demo_step += 1
        return frame

def extract_smart_candidates(frame, custom_roi=None, canvas_w=800, canvas_h=500, reticle_scale=0.42):
    """
    Modular ROI candidate extraction for accurate traffic sign recognition.
    Extracts multi-scale central crops, HSV color contours (Red, Blue, Yellow),
    Hough circles for mobile screens, and adaptive contours for printed paper/cards.
    """
    h, w, _ = frame.shape
    candidates = []
    cx, cy = w // 2, h // 2

    # 1. Custom User-Drawn or Clicked Target ROI (Priority #1, weight 1.35)
    if custom_roi:
        cx1, cy1, cx2, cy2 = custom_roi
        fx1 = int(np.clip(cx1 * w / canvas_w, 0, w - 1))
        fy1 = int(np.clip(cy1 * h / canvas_h, 0, h - 1))
        fx2 = int(np.clip(cx2 * w / canvas_w, 1, w))
        fy2 = int(np.clip(cy2 * h / canvas_h, 1, h))
        if fx2 > fx1 and fy2 > fy1:
            crop = frame[fy1:fy2, fx1:fx2]
            if crop.size > 0:
                candidates.append((fx1, fy1, fx2 - fx1, fy2 - fy1, crop, "Custom Target Box", 1.35))

    # 2. Multi-Scale Central Reticle Crops (finer steps for different distances)
    for scale in [0.20, 0.30, 0.42, 0.55, 0.70]:
        hw, hh = int(w * scale * 0.5), int(h * scale * 0.5)
        x1, y1 = max(0, cx - hw), max(0, cy - hh)
        x2, y2 = min(w, cx + hw), min(h, cy + hh)
        crop = frame[y1:y2, x1:x2]
        if crop.size > 0:
            candidates.append((x1, y1, x2 - x1, y2 - y1, crop, f"Reticle ({int(scale*100)}%)", 1.0))

    # 3. HSV Color Segmentation for Red, Blue, and Yellow Sign Borders
    # High tolerance for phone backlight luminance and paper print
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask_r1 = cv2.inRange(hsv, np.array([0, 30, 25]), np.array([20, 255, 255]))
    mask_r2 = cv2.inRange(hsv, np.array([140, 30, 25]), np.array([180, 255, 255]))
    mask_red = cv2.bitwise_or(mask_r1, mask_r2)
    mask_blue = cv2.inRange(hsv, np.array([85, 35, 25]), np.array([140, 255, 255]))
    mask_yellow = cv2.inRange(hsv, np.array([14, 35, 35]), np.array([45, 255, 255]))
    combined_color_mask = cv2.bitwise_or(cv2.bitwise_or(mask_red, mask_blue), mask_yellow)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    morph_color = cv2.morphologyEx(combined_color_mask, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(morph_color, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = (w * h) * 0.001
    max_area = (w * h) * 0.65
    color_rois = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if min_area < area < max_area:
            bx, by, bw, bh = cv2.boundingRect(cnt)
            aspect = float(bw) / max(1, bh)
            if 0.58 <= aspect <= 1.70:
                pad = int(min(bw, bh) * 0.15)
                x1, y1 = max(0, bx - pad), max(0, by - pad)
                x2, y2 = min(w, bx + bw + pad), min(h, by + bh + pad)
                crop = frame[y1:y2, x1:x2]
                if crop.size > 0:
                    dist_from_center = np.hypot((bx + bw/2) - cx, (by + bh/2) - cy)
                    color_rois.append((dist_from_center, (x1, y1, x2 - x1, y2 - y1, crop, "Color Contour", 1.20)))

    color_rois.sort(key=lambda x: x[0])
    for item in color_rois[:6]:
        candidates.append(item[1])

    # 4. Shape-Aware Hough Circles (detects circular signs on phone screens / backlit displays)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 2)
    circles = cv2.HoughCircles(
        blurred, cv2.HOUGH_GRADIENT, dp=1.2, minDist=int(min(w, h) * 0.08),
        param1=70, param2=30, minRadius=int(min(w, h) * 0.05), maxRadius=int(min(w, h) * 0.45)
    )
    if circles is not None:
        for c in circles[0, :4]:
            cx_c, cy_c, r = int(c[0]), int(c[1]), int(c[2])
            pad = int(r * 0.18)
            x1, y1 = max(0, cx_c - r - pad), max(0, cy_c - r - pad)
            x2, y2 = min(w, cx_c + r + pad), min(h, cy_c + r + pad)
            crop = frame[y1:y2, x1:x2]
            if crop.size > 0:
                candidates.append((x1, y1, x2 - x1, y2 - y1, crop, "Hough Circle", 1.15))

    # 5. Adaptive Thresholding Contours (captures high-contrast sign borders on white paper/screens)
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5)
    cnts_adapt, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    adapt_rois = []
    for cnt in cnts_adapt:
        area = cv2.contourArea(cnt)
        if (w * h * 0.012) < area < (w * h * 0.60):
            bx, by, bw, bh = cv2.boundingRect(cnt)
            aspect = float(bw) / max(1, bh)
            if 0.60 <= aspect <= 1.60:
                pad = int(min(bw, bh) * 0.14)
                x1, y1 = max(0, bx - pad), max(0, by - pad)
                x2, y2 = min(w, bx + bw + pad), min(h, by + bh + pad)
                crop = frame[y1:y2, x1:x2]
                if crop.size > 0:
                    dist_from_center = np.hypot((bx + bw/2) - cx, (by + bh/2) - cy)
                    adapt_rois.append((dist_from_center, (x1, y1, x2 - x1, y2 - y1, crop, "Adaptive Contour", 1.08)))

    adapt_rois.sort(key=lambda x: x[0])
    for item in adapt_rois[:4]:
        candidates.append(item[1])

    # 6. Full Frame Fallback (low weight 0.65 to prevent full background from overriding targeted sign)
    candidates.append((0, 0, w, h, frame, "Full Frame", 0.65))
    return candidates

    def _extract_candidate_rois(self, frame, canvas_w, canvas_h):
        return extract_smart_candidates(
            frame,
            custom_roi=self.custom_roi,
            canvas_w=canvas_w,
            canvas_h=canvas_h,
            reticle_scale=self.reticle_scale
        )

    def _speak_alert(self, prompt):
        if not HAS_PYTTSX3 or not self.enable_audio:
            return
        def worker(p):
            with self.tts_lock:
                try:
                    engine = pyttsx3.init()
                    engine.setProperty('rate', 160)
                    engine.say(p)
                    engine.runAndWait()
                    engine.stop()
                except Exception:
                    pass
        threading.Thread(target=worker, args=(prompt,), daemon=True).start()

    def _run_deep_scan(self, frame):
        """Runs thorough Test-Time Augmentation on all candidate regions of the frozen frame."""
        candidates = self._extract_candidate_rois(frame, 800, 500)
        best_res = None
        best_box = None
        best_cand = None
        best_score = 0.0

        for item in candidates:
            x, y, bw, bh, crop, desc, weight = item
            sq_crop = square_pad_crop(crop)
            res = self.predictor.predict(sq_crop, use_tta=True)
            conf = res['confidence_score']
            margin = res['margin_score']
            composite = (conf * 0.55 + margin * 0.45) * weight
            if composite > best_score:
                best_score = composite
                best_res = res
                best_box = (x, y, bw, bh)
                best_cand = item

        if best_res:
            has_valid_margin = (best_res['margin_score'] >= 0.10 or best_res['confidence_score'] >= 0.60)
            has_valid_conf = (best_res['confidence_score'] >= self.confidence_threshold)
            is_confirmed = bool(has_valid_conf and has_valid_margin)
            self._update_advisory_display(best_res, is_confirmed=is_confirmed, best_cand=best_cand)
            if is_confirmed:
                alert = self.alert_system.process_detection(best_res['class_id'], best_res['confidence_score'])
                if alert and alert['detected'] and alert['speech_prompt']:
                    self._speak_alert(alert['speech_prompt'])

    # ── Main Video Processing Loop ───────────────────────────────────────────
    def _video_loop(self):
        if not self.is_running:
            return

        if not self.is_frozen:
            if self.demo_mode or self.cap is None:
                frame = self._generate_demo_frame()
            else:
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    self.root.after(30, self._video_loop)
                    return

            self.current_frame = frame.copy()
            t_start = time.time()

            canvas_w = max(100, self.canvas.winfo_width())
            canvas_h = max(100, self.canvas.winfo_height())

            # Detect ROIs across geometric, foveal, color, and custom target boxes
            candidates = self._extract_candidate_rois(frame, canvas_w, canvas_h)

            best_res = None
            best_cand = None
            best_score = 0.0

            for item in candidates:
                x, y, bw, bh, crop, desc, weight = item
                sq_crop = square_pad_crop(crop)
                res = self.predictor.predict(sq_crop, use_tta=self.enable_tta)
                conf = res['confidence_score']
                margin = res['margin_score']
                composite = (conf * 0.55 + margin * 0.45) * weight
                if composite > best_score:
                    best_score = composite
                    best_res = res
                    best_cand = item

            # Robust confirmation: require reasonable confidence and distinct margin
            has_valid_margin = best_res and (best_res['margin_score'] >= 0.10 or best_res['confidence_score'] >= 0.60)
            has_valid_conf = best_res and (best_res['confidence_score'] >= self.confidence_threshold)
            is_confirmed = bool(best_res and has_valid_conf and has_valid_margin)

            # Multi-Agent Consensus Tracking
            norm_lbl, norm_conf = self.adapter.normalize(best_res) if (best_res and is_confirmed) else (None, 0.0)
            agent_step = self.coordinator.process(norm_lbl, norm_conf)

            # Audio Alert Triggering
            if is_confirmed and best_res and self.enable_audio:
                cid = best_res['class_id']
                curr_t = time.time()
                if (cid != self.last_spoken_class) or (curr_t - self.last_audio_time > self.audio_cooldown):
                    alert_meta = GTSRB_SAFETY_METADATA.get(cid, {})
                    prompt = alert_meta.get('speech', f"Traffic sign {best_res['class_name']} detected.")
                    self._speak_alert(prompt)
                    self.last_audio_time = curr_t
                    self.last_spoken_class = cid

            # Update Right-Hand Advisory Panels
            self._update_advisory_display(best_res, is_confirmed, agent_step, best_cand=best_cand)

            # Draw HUD Overlays onto frame
            h_f, w_f, _ = frame.shape
            annotated = frame.copy()

            def draw_adas_corners(img, x1, y1, x2, y2, color, clen=20, thick=2):
                cv2.line(img, (x1, y1), (x1 + clen, y1), color, thick)
                cv2.line(img, (x1, y1), (x1, y1 + clen), color, thick)
                cv2.line(img, (x2, y1), (x2 - clen, y1), color, thick)
                cv2.line(img, (x2, y1), (x2, y1 + clen), color, thick)
                cv2.line(img, (x1, y2), (x1 + clen, y2), color, thick)
                cv2.line(img, (x1, y2), (x1, y2 - clen), color, thick)
                cv2.line(img, (x2, y2), (x2 - clen, y2), color, thick)
                cv2.line(img, (x2, y2), (x2, y2 - clen), color, thick)

            # Draw Reticle Target Box
            if self.custom_roi:
                # Custom ROI
                cx1, cy1, cx2, cy2 = self.custom_roi
                fx1 = int(np.clip(cx1 * w_f / canvas_w, 0, w_f - 1))
                fy1 = int(np.clip(cy1 * h_f / canvas_h, 0, h_f - 1))
                fx2 = int(np.clip(cx2 * w_f / canvas_w, 1, w_f))
                fy2 = int(np.clip(cy2 * h_f / canvas_h, 1, h_f))
                col = (80, 220, 50) if is_confirmed else (240, 140, 30)
                draw_adas_corners(annotated, fx1, fy1, fx2, fy2, col, clen=18, thick=2)
                cv2.rectangle(annotated, (fx1, fy1), (fx2, fy2), col, 1)
                tag_str = f"[ TARGET LOCKED: {best_res['class_name'] if best_res else 'ROI'} ]"
                cv2.putText(annotated, tag_str, (fx1, max(24, fy1 - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, col, 2, cv2.LINE_AA)
            elif is_confirmed and best_cand and (best_cand[0] > 0 or best_cand[1] > 0 or best_cand[2] < w_f or best_cand[3] < h_f):
                bx, by, bw, bh = best_cand[0], best_cand[1], best_cand[2], best_cand[3]
                col = (80, 220, 50)  # Confirmed Emerald Green
                draw_adas_corners(annotated, bx, by, bx + bw, by + bh, col, clen=16, thick=2)
                cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), col, 1)
                tag_txt = f"#{best_res['class_id']:03d} {best_res['class_name'][:18]} ({best_res['confidence_percentage']:.1f}%)" if best_res else ""
                cv2.putText(annotated, tag_txt, (bx, max(22, by - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, col, 2, cv2.LINE_AA)
            else:
                # Default Aerospace Central Guidance Reticle
                cx_f, cy_f = w_f // 2, h_f // 2
                hw_f = int(w_f * self.reticle_scale * 0.5)
                hh_f = int(h_f * self.reticle_scale * 0.5)
                rx1, ry1 = cx_f - hw_f, cy_f - hh_f
                rx2, ry2 = cx_f + hw_f, cy_f + hh_f
                col = (80, 220, 50) if is_confirmed else (240, 140, 30)
                draw_adas_corners(annotated, rx1, ry1, rx2, ry2, col, clen=26, thick=2)
                cv2.circle(annotated, (cx_f, cy_f), 3, col, -1)
                cv2.line(annotated, (cx_f - 12, cy_f), (cx_f + 12, cy_f), col, 1)
                cv2.line(annotated, (cx_f, cy_f - 12), (cx_f, cy_f + 12), col, 1)
                lbl = "TARGET LOCKED: CONFIRMED" if is_confirmed else "ALIGN SIGN, PHONE OR CARD IN RETICLE"
                cv2.putText(annotated, f"[ {lbl} ]", (rx1 + 12, ry1 + 24),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.50, col, 2, cv2.LINE_AA)

            # Telemetry FPS Calculation
            curr_t = time.time()
            if curr_t - self.prev_time >= 0.5:
                self.fps = 1.0 / max(0.001, (curr_t - self.prev_time))
                self.prev_time = curr_t
            latency_ms = (curr_t - t_start) * 1000.0

            self.lbl_telemetry.config(
                text=f"AeroVision ADAS • Model: 108 Indian RTO Classes • FPS: {self.fps:.1f} • Latency: {latency_ms:.1f}ms • Thresh: {self.confidence_threshold:.2f}"
            )

            # Convert OpenCV BGR to RGB and render onto Tkinter Canvas
            img_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
            img_pil = Image.fromarray(img_rgb).resize((canvas_w, canvas_h), Image.Resampling.BILINEAR)
            self.tk_img = ImageTk.PhotoImage(image=img_pil)
            self.canvas.create_image(0, 0, anchor="nw", image=self.tk_img)

            # If user is currently dragging on canvas, draw dragging rectangle
            if self.is_dragging and self.custom_roi:
                x1, y1, x2, y2 = self.custom_roi
                self.canvas.create_rectangle(x1, y1, x2, y2, outline="#38bdf8", width=2, dash=(4, 4))

        self.root.after(25, self._video_loop)

    def _update_advisory_display(self, best_res, is_confirmed=False, agent_step=None, best_cand=None):
        if not best_res:
            return

        cid = best_res['class_id']
        conf_pct = best_res['confidence_percentage']
        meta = GTSRB_SAFETY_METADATA.get(cid, {})
        tier = meta.get('tier', 'INFO')
        name = best_res['class_name']
        advice = meta.get('advice', 'Proceed with normal caution under traffic regulations.')

        # Top 5 Probabilities Update: compute on the TARGET CROP, not the full room!
        if hasattr(self.predictor, 'model'):
            import torch
            import torch.nn.functional as F
            try:
                target_crop = best_cand[4] if (best_cand and len(best_cand) > 4 and best_cand[4] is not None and best_cand[4].size > 0) else self.current_frame
                sq_crop = square_pad_crop(target_crop)
                pil_c = self.predictor._to_pil(sq_crop)
                t_in = self.predictor.base_transform(pil_c).unsqueeze(0).to(self.predictor.device)
                with torch.no_grad():
                    probs = F.softmax(self.predictor.model(t_in), dim=1)[0]
                top5_vals, top5_ids = torch.topk(probs, 5)
                for idx, (lbl_n, pbar, lbl_p) in enumerate(self.top5_bars):
                    c_id = top5_ids[idx].item()
                    c_pct = top5_vals[idx].item() * 100.0
                    c_name = self.predictor.class_names.get(c_id, f"Class {c_id}")
                    lbl_n.config(text=f"#{c_id:03d} {c_name[:20]}")
                    pbar['value'] = c_pct
                    lbl_p.config(text=f"{c_pct:.1f}%")
            except Exception:
                pass

        if is_confirmed:
            if tier == "CRITICAL":
                self.lbl_risk_badge.config(text=f"● CRITICAL HAZARD: CLASS #{cid:03d} ({tier})", bg="#7f1d1d", fg="#fca5a5")
            elif tier == "WARNING":
                self.lbl_risk_badge.config(text=f"● CAUTION ADVISORY: CLASS #{cid:03d} ({tier})", bg="#78350f", fg="#fcd34d")
            else:
                self.lbl_risk_badge.config(text=f"● STATUTORY DIRECTIVE: CLASS #{cid:03d} ({tier})", bg="#1e3a8a", fg="#93c5fd")

            self.lbl_sign_name.config(text=f"#{cid:03d} — {name}")
            self.lbl_confidence.config(text=f"Detection Confidence: {conf_pct:.1f}% (Confirmed Active)", fg="#34d399")
            self.lbl_advice.config(text=f"Statutory Directive: {advice}", fg="#ffffff")
            if agent_step:
                self.lbl_agent_state.config(text=f"🤖 Safety Agent: {agent_step['status'].upper()} • Priority: {agent_step['priority']} • {agent_step['message'][:50]}", fg="#38bdf8")
        elif conf_pct >= 30.0 and best_res.get('margin_score', 0) >= 0.08:
            self.lbl_risk_badge.config(text=f"◌ ACQUIRING TARGET FOCUS: #{cid:03d}", bg="#451a03", fg="#fde68a")
            self.lbl_sign_name.config(text=f"Candidate: #{cid:03d} — {name}")
            self.lbl_confidence.config(text=f"Detection Confidence: {conf_pct:.1f}% (Hold steady or center in reticle)", fg="#fbbf24")
            self.lbl_advice.config(text="Align sign inside reticle or drag custom targeting box.", fg="#94a3b8")
        else:
            self.lbl_risk_badge.config(text="● SYSTEM NOMINAL: STANDBY SCANNING", bg="#064e3b", fg="#6ee7b7")
            self.lbl_sign_name.config(text="Scanning Road Feed...")
            self.lbl_confidence.config(text=f"Standby — No Sign Locked (Floor: {conf_pct:.1f}%)", fg="#64748b")
            self.lbl_advice.config(text="Position sign, smartphone screen, or printed card inside target reticle.", fg="#64748b")
            # Clear top 5 bars during standby so noise isn't displayed
            for idx, (lbl_n, pbar, lbl_p) in enumerate(self.top5_bars):
                lbl_n.config(text=f"Slot {idx+1}")
                pbar['value'] = 0
                lbl_p.config(text="0.0%")

    # ── 108 Canonical Sign Quick-Tester Handlers ─────────────────────────────
    def _on_preview_sign_change(self, event=None):
        idx = self.cb_signs.current()
        if idx < 0:
            return
        c_path = Path(f"dataset/Test/{idx}/canonical.png")
        if c_path.exists():
            img_c = Image.open(c_path).resize((70, 70), Image.Resampling.BILINEAR)
            self.tk_thumb = ImageTk.PhotoImage(img_c)
            self.lbl_thumb.config(image=self.tk_thumb)
            meta = GTSRB_SAFETY_METADATA.get(idx, {})
            self.lbl_thumb_info.config(
                text=f"Class #{idx:03d}: {meta.get('name', '')}\nRisk: {meta.get('tier', '')} | Action: {meta.get('advice', '')[:45]}..."
            )

    def _test_selected_canonical(self):
        idx = self.cb_signs.current()
        if idx < 0:
            return
        c_path = Path(f"dataset/Test/{idx}/canonical.png")
        if not c_path.exists():
            messagebox.showwarning("File Missing", f"Canonical image not found for Class #{idx}")
            return

        c_img = cv2.imread(str(c_path))
        sq = square_pad_crop(c_img)
        res = self.predictor.predict(sq, use_tta=True)

        # Update HUD
        self._update_advisory_display(res, is_confirmed=True)
        meta = GTSRB_SAFETY_METADATA.get(idx, {})
        prompt = meta.get('speech', f"Traffic sign {res['class_name']} detected.")
        if self.enable_audio:
            self._speak_alert(prompt)

        messagebox.showinfo(
            "Quick-Test Verification Result",
            f"Evaluated Sign #{idx:03d}: {meta.get('name')}\n\n"
            f"• Model Prediction: #{res['class_id']:03d} ({res['class_name']})\n"
            f"• Confidence Score: {res['confidence_percentage']:.2f}%\n"
            f"• Match Result: {'✅ ACCURATE PASS' if res['class_id'] == idx else '❌ MISMATCH'}\n"
            f"• Risk Level: {meta.get('tier')}\n"
            f"• Statutory Action: {meta.get('advice')}"
        )

    def take_snapshot(self):
        if self.current_frame is not None:
            ts = int(time.time())
            out_file = f"capture_accurate_{ts}.png"
            cv2.imwrite(out_file, self.current_frame)
            messagebox.showinfo("Snapshot Saved", f"Captured high-resolution frame saved to:\n{out_file}")

    def on_close(self):
        self.is_running = False
        if self.cap is not None:
            self.cap.release()
        self.root.destroy()


StandaloneTrafficApp = ModernTrafficSignDesktopApp

def main():
    root = tk.Tk()
    app = ModernTrafficSignDesktopApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
