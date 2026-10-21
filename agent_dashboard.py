"""
agent_dashboard.py

Step 4: Desktop Dashboard Interface for Traffic Safety Agent System.

Features:
- Main thread Tkinter GUI for event visualization and decision explanation.
- Thread-safe queue communication with background camera / model worker thread.
- Displays real-time agent status, active signs, and multi-frame consistency meter.
- Recent Events log listbox showing confirmed road sign alerts.
- Controls to toggle Audio TTS, switch between Webcam and Simulation feed, and Ask AI Explanations.
- Export event log to JSON for audit trail.
"""

import sys
import time
import json
import queue
import threading
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import cv2
import numpy as np

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from traffic_safety_agents import TrafficSafetyCoordinator, TrafficSafetyLLMAssistant


class AgentDashboard:
    """Desktop Prototype Dashboard for the Traffic Safety Multi-Agent System."""

    def __init__(self, coordinator: TrafficSafetyCoordinator = None, queue_in: queue.Queue = None):
        self.coordinator = coordinator or TrafficSafetyCoordinator(threshold=0.70, required_frames=3)
        self.queue_in = queue_in or queue.Queue()
        self.assistant = TrafficSafetyLLMAssistant(coordinator=self.coordinator)

        # Worker thread handle
        self.worker_thread = None
        self.is_running = False

        # GUI Setup
        self.root = tk.Tk()
        self.root.title("Traffic Safety Agent — Desktop Prototype")
        self.root.geometry("740x620")
        self.root.minsize(680, 560)
        self.root.configure(bg="#1e1e28")

        # Styling
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TLabel", background="#1e1e28", foreground="#ffffff")
        style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=6)
        style.configure("TFrame", background="#1e1e28")

        self._build_ui()

        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        # Start UI event polling loop (Thread-Safe)
        self.root.after(30, self._poll_queue)

        # Auto-start camera/simulation stream
        self.root.after(150, self._toggle_webcam)

    def _on_close(self):
        """Clean shutdown when user closes the window."""
        self.is_running = False
        try:
            import cv2
            cv2.destroyAllWindows()
        except Exception:
            pass
        self.root.destroy()

    def _build_ui(self):
        # Header Banner
        header_frame = tk.Frame(self.root, bg="#14141d", pady=12)
        header_frame.pack(fill=tk.X)

        title = tk.Label(
            header_frame,
            text="TRAFFIC SAFETY AGENT",
            font=("Segoe UI", 18, "bold"),
            fg="#00d4ff",
            bg="#14141d"
        )
        title.pack()

        subtitle = tk.Label(
            header_frame,
            text="Multi-Agent Decision & Driver Advisory System (Desktop Prototype)",
            font=("Segoe UI", 9),
            fg="#8888aa",
            bg="#14141d"
        )
        subtitle.pack(pady=2)

        # Status Display Box
        status_box = tk.LabelFrame(
            self.root,
            text=" Real-Time Agent Decision Status ",
            font=("Segoe UI", 10, "bold"),
            fg="#ffffff",
            bg="#252536",
            padx=15,
            pady=10
        )
        status_box.pack(padx=20, pady=12, fill=tk.X)

        self.status = tk.Label(
            status_box,
            text="Waiting for camera detection...",
            font=("Segoe UI", 13, "bold"),
            fg="#ffcc00",
            bg="#252536",
            wraplength=660,
            justify=tk.CENTER
        )
        self.status.pack(pady=6)

        # Telemetry Sub-line
        self.telemetry_label = tk.Label(
            status_box,
            text="Tracked: None | Frames: 0/3 | Threshold: 70% | Alerts: 0 | Rejections: 0",
            font=("Segoe UI", 9),
            fg="#9999bb",
            bg="#252536"
        )
        self.telemetry_label.pack(pady=2)

        # Recent Events Section
        events_frame = tk.Frame(self.root, bg="#1e1e28")
        events_frame.pack(padx=20, pady=5, fill=tk.BOTH, expand=True)

        events_header = tk.Label(
            events_frame,
            text="Recent Confirmed Events (Audit Log)",
            font=("Segoe UI", 12, "bold"),
            fg="#ffffff",
            bg="#1e1e28"
        )
        events_header.pack(anchor=tk.W, pady=(0, 5))

        # Listbox with Scrollbar
        list_container = tk.Frame(events_frame, bg="#1e1e28")
        list_container.pack(fill=tk.BOTH, expand=True)

        scrollbar = tk.Scrollbar(list_container, orient=tk.VERTICAL)
        self.events = tk.Listbox(
            list_container,
            width=85,
            height=11,
            font=("Consolas", 10),
            bg="#12121a",
            fg="#e0e0e0",
            selectbackground="#005588",
            selectforeground="#ffffff",
            yscrollcommand=scrollbar.set,
            relief=tk.FLAT,
            bd=1
        )
        scrollbar.config(command=self.events.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.events.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # Control Action Buttons
        controls_frame = tk.Frame(self.root, bg="#1e1e28", pady=10)
        controls_frame.pack(fill=tk.X, padx=20)

        self.btn_toggle_cam = tk.Button(
            controls_frame,
            text="Start Webcam Stream",
            command=self._toggle_webcam,
            bg="#0088cc",
            fg="#ffffff",
            font=("Segoe UI", 9, "bold"),
            relief=tk.FLAT,
            padx=12,
            pady=5,
            cursor="hand2"
        )
        self.btn_toggle_cam.pack(side=tk.LEFT, padx=5)

        self.btn_toggle_demo = tk.Button(
            controls_frame,
            text="Simulate Road Signs",
            command=self._run_simulation,
            bg="#44445a",
            fg="#ffffff",
            font=("Segoe UI", 9),
            relief=tk.FLAT,
            padx=12,
            pady=5,
            cursor="hand2"
        )
        self.btn_toggle_demo.pack(side=tk.LEFT, padx=5)

        self.btn_explain = tk.Button(
            controls_frame,
            text="Ask AI Explainer",
            command=self._show_explanation_dialog,
            bg="#7928ca",
            fg="#ffffff",
            font=("Segoe UI", 9, "bold"),
            relief=tk.FLAT,
            padx=12,
            pady=5,
            cursor="hand2"
        )
        self.btn_explain.pack(side=tk.LEFT, padx=5)

        self.btn_export = tk.Button(
            controls_frame,
            text="Export Log (JSON)",
            command=self._export_json,
            bg="#333344",
            fg="#ffffff",
            font=("Segoe UI", 9),
            relief=tk.FLAT,
            padx=10,
            pady=5,
            cursor="hand2"
        )
        self.btn_export.pack(side=tk.RIGHT, padx=5)

        self.btn_clear = tk.Button(
            controls_frame,
            text="Clear",
            command=self._clear_events,
            bg="#333344",
            fg="#ffffff",
            font=("Segoe UI", 9),
            relief=tk.FLAT,
            padx=10,
            pady=5,
            cursor="hand2"
        )
        self.btn_clear.pack(side=tk.RIGHT, padx=5)

    def _poll_queue(self):
        """Processes incoming messages from background worker thread safely."""
        while not self.queue_in.empty():
            try:
                msg = self.queue_in.get_nowait()
                msg_type = msg.get("type")

                if msg_type == "status":
                    text = msg.get("message", "")
                    status_code = msg.get("status", "idle")

                    color_map = {
                        "alert": "#00ff88",        # Bright Green
                        "monitoring": "#ffcc00",   # Bright Amber
                        "suppressed": "#55ccff",   # Soft Cyan
                        "rejected": "#ff5555",     # Red
                        "idle": "#8888aa"          # Dim Grey
                    }
                    fg_col = color_map.get(status_code, "#ffffff")
                    self.status.config(text=text, fg=fg_col)

                    # Update telemetry line
                    stats = self.coordinator.get_summary_stats()
                    curr_sign = stats.get("current_tracked_sign") or "None"
                    consec = stats.get("consecutive_frames", 0)
                    req = stats.get("required_frames", 3)
                    alerts = stats.get("alerts_issued", 0)
                    rejections = stats.get("rejections", 0)
                    thresh = int(stats.get("confidence_threshold", 0.70) * 100)

                    self.telemetry_label.config(
                        text=f"Tracked: '{curr_sign}' | Frame: {consec}/{req} | Threshold: {thresh}% | Alerts: {alerts} | Rejections: {rejections}"
                    )

                elif msg_type == "event":
                    ev = msg.get("data", {})
                    ts = ev.get("datetime", "")[-8:]
                    prio = ev.get("priority", "MEDIUM")
                    lbl = ev.get("label", "Unknown")
                    conf = ev.get("confidence", 0.0) * 100.0
                    action = ev.get("action", ev.get("message", ""))

                    log_entry = f"[{ts}] [{prio:^8}] {lbl} ({conf:.1f}%) -> {action}"
                    self.events.insert(0, log_entry)
                    if self.events.size() > 500:
                        self.events.delete(tk.END)

            except queue.Empty:
                break
            except Exception as ex:
                print(f"[UI UPDATE ERROR] {ex}")

        # Reschedule next check in 30ms
        self.root.after(30, self._poll_queue)

    def _toggle_webcam(self):
        """Starts or stops the background webcam recognition worker."""
        if self.is_running:
            self.is_running = False
            self.btn_toggle_cam.config(text="Start Webcam Stream", bg="#0088cc")
            self.status.config(text="Webcam stream stopped.", fg="#8888aa")
        else:
            self.is_running = True
            self.btn_toggle_cam.config(text="Stop Webcam Stream", bg="#cc3300")
            self.worker_thread = threading.Thread(target=self._run_webcam_loop, daemon=True)
            self.worker_thread.start()

    def _run_webcam_loop(self):
        """Runs webcam loop or simulated feed and pipes agent results into queue."""
        import cv2

        # Attempt to open webcam with DirectShow/MSMF/default
        backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY] if sys.platform.startswith("win") else [cv2.CAP_ANY]
        for backend in backends:
            try:
                cap = cv2.VideoCapture(0, backend) if backend != cv2.CAP_ANY else cv2.VideoCapture(0)
                if cap.isOpened():
                    ret, test_f = cap.read()
                    if ret and test_f is not None and test_f.size > 0:
                        break
                    cap.release()
                    cap = None
            except Exception:
                cap = None

        is_simulated = (cap is None or not cap.isOpened())
        if is_simulated:
            print("[INFO] Camera 0 unavailable or busy. Operating in SIMULATED DRIVING MODE.")

        # Try to load existing predictor if available
        predictor = None
        try:
            from src.predict import TrafficSignPredictor
            for ckpt in ["models/universal_best.pth", "models/rto_best.pth", "models/baseline_best.pth"]:
                if Path(ckpt).exists():
                    predictor = TrafficSignPredictor(checkpoint_path=ckpt)
                    break
        except Exception as e:
            print(f"[INFO] Predictor init notice: {e}")

        win_title = "Traffic Safety Agent — Live Camera Stream & HUD"
        cv2.namedWindow(win_title, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(win_title, 960, 540)

        demo_step = 0

        try:
            while self.is_running:
                if is_simulated:
                    # Generate simulated driving road feed
                    h, w = 720, 1280
                    frame = np.zeros((h, w, 3), dtype=np.uint8)
                    frame[:360, :] = (230, 190, 140)  # sky
                    frame[360:, :] = (55, 55, 60)      # road
                    frame[350:370, :] = (60, 120, 60)  # horizon

                    offset = (demo_step * 8) % 80
                    for y in range(380 + offset, 720, 80):
                        cv2.line(frame, (640, y), (640, min(720, y + 40)), (0, 220, 240), 4)

                    sign_cycle = (demo_step // 120) % 3
                    t = (demo_step % 120) / 120.0
                    sign_size = int(80 + t * 140)
                    sign_x = int(820 + t * 130)
                    sign_y = int(210 + t * 120)

                    if sign_x + sign_size < w and sign_y + sign_size < h:
                        sign_img = np.full((sign_size, sign_size, 3), (255, 255, 255), dtype=np.uint8)
                        cx, cy = sign_size // 2, sign_size // 2
                        r = int(sign_size * 0.46)

                        if sign_cycle == 0:  # STOP
                            pts = np.array([
                                [cx - int(r*0.4), cy - r], [cx + int(r*0.4), cy - r],
                                [cx + r, cy - int(r*0.4)], [cx + r, cy + int(r*0.4)],
                                [cx + int(r*0.4), cy + r], [cx - int(r*0.4), cy + r],
                                [cx - r, cy + int(r*0.4)], [cx - r, cy - int(r*0.4)]
                            ], np.int32)
                            cv2.fillPoly(sign_img, [pts], (20, 20, 220))
                            cv2.polylines(sign_img, [pts], True, (255, 255, 255), max(2, sign_size // 30))
                            cv2.putText(sign_img, "STOP", (cx - int(r*0.68), cy + int(r*0.28)),
                                        cv2.FONT_HERSHEY_DUPLEX, sign_size / 90.0, (255, 255, 255), max(2, sign_size // 35), cv2.LINE_AA)
                        elif sign_cycle == 1:  # Speed Limit 50
                            cv2.circle(sign_img, (cx, cy), r, (20, 20, 220), -1)
                            cv2.circle(sign_img, (cx, cy), int(r * 0.76), (255, 255, 255), -1)
                            cv2.putText(sign_img, "50", (cx - int(r*0.45), cy + int(r*0.35)),
                                        cv2.FONT_HERSHEY_DUPLEX, sign_size / 80.0, (20, 20, 20), max(2, sign_size // 30), cv2.LINE_AA)
                        else:  # Yield / Give Way
                            pts = np.array([[cx - r, cy - int(r*0.7)], [cx + r, cy - int(r*0.7)], [cx, cy + r]], np.int32)
                            cv2.fillPoly(sign_img, [pts], (20, 20, 220))
                            pts_in = np.array([[cx - int(r*0.65), cy - int(r*0.5)], [cx + int(r*0.65), cy - int(r*0.5)], [cx, cy + int(r*0.7)]], np.int32)
                            cv2.fillPoly(sign_img, [pts_in], (255, 255, 255))

                        frame[sign_y:sign_y+sign_size, sign_x:sign_x+sign_size] = sign_img

                    demo_step += 1
                    time.sleep(0.033)
                else:
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        time.sleep(0.03)
                        continue

                h, w, _ = frame.shape
                top_label, top_conf = None, 0.0
                best_box = None

                # Detect candidate ROIs via color contours
                hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
                mask_r1 = cv2.inRange(hsv, np.array([0, 70, 50]), np.array([10, 255, 255]))
                mask_r2 = cv2.inRange(hsv, np.array([160, 70, 50]), np.array([180, 255, 255]))
                mask_red = cv2.bitwise_or(mask_r1, mask_r2)
                mask_blue = cv2.inRange(hsv, np.array([100, 80, 40]), np.array([135, 255, 255]))
                mask_yellow = cv2.inRange(hsv, np.array([18, 90, 80]), np.array([34, 255, 255]))
                combined = cv2.bitwise_or(cv2.bitwise_or(mask_red, mask_blue), mask_yellow)
                contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                for cnt in contours[:6]:
                    area = cv2.contourArea(cnt)
                    if area < 600:
                        continue
                    rx, ry, rbw, rbh = cv2.boundingRect(cnt)
                    if rbw < 28 or rbh < 28 or rbw > w * 0.7:
                        continue
                    crop = frame[max(0, ry - 6):min(h, ry + rbh + 6), max(0, rx - 6):min(w, rx + rbw + 6)]
                    if crop.size > 0 and predictor:
                        try:
                            pred = predictor.predict(crop, use_tta=False)
                            conf = pred.get("confidence_score", 0.0)
                            if conf > top_conf:
                                top_conf = conf
                                top_label = pred.get("class_name")
                                best_box = (rx, ry, rbw, rbh)
                        except Exception:
                            pass

                # Simulation heuristic fallback
                if is_simulated and not top_label:
                    cycle = (demo_step // 120) % 3
                    sim_map = {0: ("Stop Sign", 0.94), 1: ("Speed Limit 50", 0.91), 2: ("Give Way", 0.89)}
                    top_label, top_conf = sim_map[cycle]

                # Pass to Coordinator
                result = self.coordinator.process(top_label, top_conf)

                # Draw bounding box
                if best_box:
                    bx, by, bw, bh = best_box
                    b_col = (0, 255, 0) if result["status"] == "alert" else (0, 200, 255)
                    cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), b_col, 2)
                    cv2.putText(frame, f"{top_label} ({top_conf*100:.1f}%)", (bx, max(22, by - 8)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, b_col, 2)

                # Draw top HUD banner
                banner_bg = frame.copy()
                cv2.rectangle(banner_bg, (0, 0), (w, 55), (12, 12, 20), -1)
                cv2.addWeighted(banner_bg, 0.82, frame, 0.18, 0, frame)

                hud_col = (0, 255, 0) if result["status"] == "alert" else (0, 200, 255)
                cv2.putText(frame, f"AGENT: {result['message']}", (15, 34),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, hud_col, 2, cv2.LINE_AA)

                # Display in OpenCV window
                cv2.imshow(win_title, frame)
                cv2.waitKey(1)

                # Send updates to Tkinter UI via thread-safe queue
                self.queue_in.put({
                    "type": "status",
                    "message": result["message"],
                    "status": result["status"]
                })

                if result["status"] == "alert" and result.get("event"):
                    self.queue_in.put({
                        "type": "event",
                        "data": result["event"]
                    })

        finally:
            if cap is not None and cap.isOpened():
                cap.release()
            cv2.destroyAllWindows()

    def _run_simulation(self):
        """Simulates consecutive frames and alerts for testing in the desktop GUI."""
        def sim_thread():
            test_signs = [
                ("stop", 0.94, 4),
                ("stop", 0.35, 1),   # low confidence rejection
                ("no_entry", 0.91, 3),
                ("speed_limit_50", 0.88, 3),
                ("pedestrian_crossing", 0.95, 3)
            ]
            for sign, conf, frames in test_signs:
                for f in range(frames):
                    res = self.coordinator.process(sign, conf)
                    self.queue_in.put({
                        "type": "status",
                        "message": res["message"],
                        "status": res["status"]
                    })
                    if res["status"] == "alert" and res.get("event"):
                        self.queue_in.put({
                            "type": "event",
                            "data": res["event"]
                        })
                    time.sleep(0.35)
                time.sleep(0.5)

        t = threading.Thread(target=sim_thread, daemon=True)
        t.start()

    def _show_explanation_dialog(self):
        """Step 7: Displays LLM / Assistant explanations of event history."""
        dialog = tk.Toplevel(self.root)
        dialog.title("AI Safety Agent Explanation")
        dialog.geometry("620x460")
        dialog.configure(bg="#181824")

        tk.Label(
            dialog,
            text="AI Decision & Audit Explainer",
            font=("Segoe UI", 14, "bold"),
            fg="#00d4ff",
            bg="#181824"
        ).pack(pady=10)

        # Question buttons
        q_frame = tk.Frame(dialog, bg="#181824")
        q_frame.pack(fill=tk.X, padx=15, pady=5)

        output_text = tk.Text(dialog, bg="#101018", fg="#e0e0e0", font=("Consolas", 10), wrap=tk.WORD, height=14)
        output_text.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)

        def set_answer(q_text):
            ans = self.assistant.query(q_text)
            output_text.delete("1.0", tk.END)
            output_text.insert(tk.END, ans)

        btn_q1 = tk.Button(
            q_frame,
            text="Signs Last Minute?",
            command=lambda: set_answer("What signs did the system detect in the last minute?"),
            bg="#2a2a3e",
            fg="#ffffff",
            font=("Segoe UI", 8),
            relief=tk.FLAT
        )
        btn_q1.pack(side=tk.LEFT, padx=3)

        btn_q2 = tk.Button(
            q_frame,
            text="Why This Alert?",
            command=lambda: set_answer("Why did the coordinator issue this alert?"),
            bg="#2a2a3e",
            fg="#ffffff",
            font=("Segoe UI", 8),
            relief=tk.FLAT
        )
        btn_q2.pack(side=tk.LEFT, padx=3)

        btn_q3 = tk.Button(
            q_frame,
            text="Rejections Count?",
            command=lambda: set_answer("How many low-confidence predictions were rejected?"),
            bg="#2a2a3e",
            fg="#ffffff",
            font=("Segoe UI", 8),
            relief=tk.FLAT
        )
        btn_q3.pack(side=tk.LEFT, padx=3)

        btn_q4 = tk.Button(
            q_frame,
            text="System Telemetry",
            command=lambda: set_answer("system summary"),
            bg="#2a2a3e",
            fg="#ffffff",
            font=("Segoe UI", 8),
            relief=tk.FLAT
        )
        btn_q4.pack(side=tk.LEFT, padx=3)

        # Initial explanation
        set_answer("Why did the coordinator issue this alert?")

    def _export_json(self):
        """Exports recorded events to a JSON file."""
        if not self.coordinator.history:
            messagebox.showinfo("Export Events", "No confirmed events recorded yet to export.")
            return

        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON Files", "*.json")],
            initialfile="traffic_agent_events.json"
        )
        if file_path:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(self.coordinator.history, f, indent=2)
            messagebox.showinfo("Success", f"Successfully exported {len(self.coordinator.history)} events to:\n{file_path}")

    def _clear_events(self):
        """Clears GUI event listbox and coordinator history."""
        self.coordinator.clear_history()
        self.events.delete(0, tk.END)
        self.status.config(text="History cleared. Monitoring resumed.", fg="#8888aa")
        self.telemetry_label.config(text="Tracked: None | Frames: 0/3 | Threshold: 70% | Alerts: 0 | Rejections: 0")

    def run(self):
        """Starts Tkinter main loop."""
        self.root.mainloop()


def main():
    dashboard = AgentDashboard()
    dashboard.run()


if __name__ == "__main__":
    main()
