"""
app.py — AeroVision ADAS
Autonomous Traffic Sign Recognition & Intelligent Driver Safety Advisory System.
AeroVision ADAS / Quantum Titanium Aerospace Cockpit Design System.

Features:
- Quantum Titanium Design System (#070B14, #101A2B, #3B82F6, #10B981, #F59E0B, #EF4444)
- 6-View Cockpit Architecture: Overview, Live Detection, Image Analysis, Analytics, Event History, Settings
- Real-time Multi-Scale Traffic Sign Perception (108 Official Indian RTO Classes)
- Aerospace Camera HUD with Corner Reticles, Target Lock, and Action Advisories
- Multi-Agent Overwatch Activity Panel (Validation, Rules, Context, Alert Agents)
- Real-Time System Telemetry (Dynamic FPS, Resolution, Latency, Camera & Model Status)
- Live Audio Speech Synthesis & Statutory Motor Vehicles Act Advisories
"""

import time
import json
import cv2
import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
from PIL import Image
import streamlit as st
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

from src.predict import TrafficSignPredictor
from src.driver_alert import DriverAlertSystem, GTSRB_SAFETY_METADATA
from traffic_safety_agents import (
    TrafficSafetyCoordinator,
    TrafficSafetyLLMAssistant,
    ModelOutputAdapter
)

# ---------------------------------------------------------------------------
# 1. STREAMLIT PAGE CONFIGURATION & THEME
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="AeroVision ADAS — Traffic Sign Intelligence",
    page_icon="🚘",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Inject Quantum Titanium Design System
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&display=swap');

    /* Global Dark Canvas */
    .stApp {
        background-color: #070B14 !important;
        background-image: 
            radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.12) 0%, transparent 65%),
            radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.06) 0%, transparent 50%),
            radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px) !important;
        background-size: 100% 100%, 100% 100%, 24px 24px !important;
        color: #F8FAFC !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    }

    /* Streamlit Global Header */
    header[data-testid="stHeader"] {
        background: rgba(7, 11, 20, 0.85) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    /* Sidebar Aerospace Cockpit */
    [data-testid="stSidebar"] {
        background-color: #0A0E1A !important;
        border-right: 1px solid rgba(59, 130, 246, 0.18) !important;
        box-shadow: 8px 0 32px rgba(0, 0, 0, 0.6) !important;
    }
    [data-testid="stSidebar"] * {
        color: #CBD5E1 !important;
    }
    [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {
        font-family: 'Outfit', sans-serif !important;
        color: #F8FAFC !important;
        letter-spacing: -0.3px !important;
    }

    /* Brand Header Box */
    .aerovision-brand-box {
        background: linear-gradient(135deg, rgba(16, 26, 43, 0.95) 0%, rgba(11, 19, 32, 0.98) 100%);
        border: 1px solid rgba(59, 130, 246, 0.35);
        border-radius: 14px;
        padding: 16px 18px;
        margin-bottom: 20px;
        box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .brand-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: -0.4px;
        background: linear-gradient(135deg, #FFFFFF 30%, #93C5FD 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .brand-tag {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem;
        font-weight: 600;
        color: #38BDF8;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        margin-top: 3px;
    }

    /* Quantum Titanium Deck Cards */
    .titanium-card {
        background: linear-gradient(135deg, #101A2B 0%, #0C1422 100%);
        border: 1px solid rgba(59, 130, 246, 0.20);
        border-radius: 14px;
        padding: 18px 20px;
        margin-bottom: 16px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }

    /* Telemetry KPI Widget */
    .kpi-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 18px;
    }
    .kpi-box {
        background: rgba(16, 26, 43, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 14px 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
    }
    .kpi-box:hover {
        border-color: rgba(59, 130, 246, 0.4);
        transform: translateY(-2px);
    }
    .kpi-label {
        font-family: 'Inter', sans-serif;
        font-size: 0.74rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #94A3B8;
        margin-bottom: 4px;
    }
    .kpi-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.45rem;
        font-weight: 700;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* Risk Protocol Action Cards */
    .card-critical {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(153, 27, 27, 0.14) 100%);
        border: 1px solid rgba(239, 68, 68, 0.50);
        border-left: 5px solid #EF4444;
        border-radius: 14px;
        padding: 20px 22px;
        margin-bottom: 16px;
        box-shadow: 0 12px 32px -8px rgba(239, 68, 68, 0.35);
    }
    .card-warning {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(180, 83, 9, 0.14) 100%);
        border: 1px solid rgba(245, 158, 11, 0.50);
        border-left: 5px solid #F59E0B;
        border-radius: 14px;
        padding: 20px 22px;
        margin-bottom: 16px;
        box-shadow: 0 12px 32px -8px rgba(245, 158, 11, 0.35);
    }
    .card-info {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(30, 58, 138, 0.14) 100%);
        border: 1px solid rgba(59, 130, 246, 0.50);
        border-left: 5px solid #3B82F6;
        border-radius: 14px;
        padding: 20px 22px;
        margin-bottom: 16px;
        box-shadow: 0 12px 32px -8px rgba(59, 130, 246, 0.35);
    }

    /* Agent Activity Status Chips */
    .agent-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.80rem;
        font-weight: 600;
        margin-right: 6px;
        margin-bottom: 6px;
    }
    .agent-active {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.45);
        color: #34D399;
    }
    .agent-monitoring {
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.45);
        color: #FBBF24;
    }
    .agent-rejected {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.45);
        color: #F87171;
    }
    .agent-suppressed {
        background: rgba(59, 130, 246, 0.15);
        border: 1px solid rgba(59, 130, 246, 0.45);
        color: #60A5FA;
    }

    /* Pulse Dot Indicator */
    .live-pulse {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #10B981;
        box-shadow: 0 0 10px #10B981;
        display: inline-block;
        animation: pulseAnimation 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulseAnimation {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.35; transform: scale(0.85); }
    }

    /* Interactive Radio Navigation */
    div[data-testid="stRadio"] label {
        background: rgba(16, 26, 43, 0.65) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 10px !important;
        padding: 9px 14px !important;
        margin-bottom: 6px !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
    }
    div[data-testid="stRadio"] label:hover {
        border-color: rgba(59, 130, 246, 0.5) !important;
        background: rgba(37, 99, 235, 0.15) !important;
        transform: translateX(3px) !important;
    }

    /* Buttons Styling */
    .stButton > button {
        background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%) !important;
        color: #FFFFFF !important;
        border: 1px solid rgba(59, 130, 246, 0.4) !important;
        border-radius: 10px !important;
        font-family: 'Inter', sans-serif !important;
        font-weight: 600 !important;
        font-size: 0.88rem !important;
        padding: 8px 18px !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28) !important;
    }
    .stButton > button:hover {
        background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%) !important;
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45) !important;
        transform: translateY(-1.5px) !important;
    }

    /* Expanders & Accordions */
    div[data-testid="stExpander"] {
        background: rgba(16, 26, 43, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 12px !important;
        backdrop-filter: blur(12px) !important;
    }

    /* Telemetry Badge */
    .telemetry-chip {
        display: inline-flex;
        align-items: center;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #CBD5E1;
        padding: 3px 10px;
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
    }
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# 2. MODEL CACHING & DETECTION BACKEND
# ---------------------------------------------------------------------------
@st.cache_resource
def load_predictors() -> Dict[str, TrafficSignPredictor]:
    """Caches and loads the deep learning inference engines."""
    predictors = {}
    rto_path = Path("models/rto_best.pth")
    universal_path = Path("models/universal_best.pth")
    mobilenet_path = Path("models/mobilenet_best.pth")

    if rto_path.exists():
        try:
            predictors["Official Indian RTO 108-Class Model"] = TrafficSignPredictor(checkpoint_path=str(rto_path))
        except Exception as e:
            print(f"[ERROR] Loading RTO model: {e}")

    if universal_path.exists() and "Official Indian RTO 108-Class Model" not in predictors:
        try:
            predictors["Universal 52-Class Model"] = TrafficSignPredictor(checkpoint_path=str(universal_path))
        except Exception as e:
            print(f"[ERROR] Loading Universal model: {e}")

    if mobilenet_path.exists() and "Official Indian RTO 108-Class Model" not in predictors:
        try:
            predictors["MobileNetV2 Transfer Model"] = TrafficSignPredictor(checkpoint_path=str(mobilenet_path))
        except Exception as e:
            pass

    return predictors


def square_pad_crop(crop: np.ndarray, fill_val: int = 255) -> np.ndarray:
    """Pads any rectangular crop to a 1:1 square aspect ratio."""
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


def extract_and_evaluate_best_sign_roi(predictor: TrafficSignPredictor, pil_img: Image.Image, use_tta: bool = True):
    """
    Evaluates multi-scale candidate crops (nested foveal pyramid, Hough circles,
    adaptive contours, color contours, full frame) and selects the region
    with the highest prediction confidence score.
    Returns: (best_res, best_crop, annotated_display_pil, best_tag, best_bbox)
    """
    w, h = pil_img.size
    np_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    candidates = []

    # 1. Nested Center Foveal Crops
    cx, cy = w // 2, h // 2
    for scale in [0.28, 0.42, 0.58, 0.75]:
        hw, hh = int(w * scale * 0.5), int(h * scale * 0.5)
        x1, y1 = max(0, cx - hw), max(0, cy - hh)
        x2, y2 = min(w, cx + hw), min(h, cy + hh)
        c_crop = pil_img.crop((x1, y1, x2, y2))
        candidates.append((f"Foveal Focus ({int(scale*100)}%)", c_crop, (x1, y1, x2 - x1, y2 - y1)))

    # 2. Shape-Aware Hough Circles
    gray = cv2.cvtColor(np_bgr, cv2.COLOR_BGR2GRAY)
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
            c_crop = pil_img.crop((x1, y1, x2, y2))
            candidates.append((f"Hough Circle ({r*2}px)", c_crop, (x1, y1, x2 - x1, y2 - y1)))

    # 3. Adaptive Thresholding Contours
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5)
    cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in cnts:
        area = cv2.contourArea(cnt)
        if (w * h * 0.015) < area < (w * h * 0.70):
            bx, by, bw, bh = cv2.boundingRect(cnt)
            aspect = float(bw) / max(1, bh)
            if 0.5 <= aspect <= 2.0:
                pad = int(min(bw, bh) * 0.12)
                x1, y1 = max(0, bx - pad), max(0, by - pad)
                x2, y2 = min(w, bx + bw + pad), min(h, by + bh + pad)
                c_crop = pil_img.crop((x1, y1, x2, y2))
                candidates.append((f"Adaptive Contour ({bw}x{bh})", c_crop, (x1, y1, x2 - x1, y2 - y1)))
                break

    # 4. Color Contours (Red, Blue, Yellow)
    hsv = cv2.cvtColor(np_bgr, cv2.COLOR_BGR2HSV)
    m_r = cv2.bitwise_or(cv2.inRange(hsv, (0, 30, 30), (18, 255, 255)), cv2.inRange(hsv, (140, 30, 30), (180, 255, 255)))
    m_b = cv2.inRange(hsv, (80, 30, 30), (140, 255, 255))
    m_y = cv2.inRange(hsv, (12, 35, 35), (45, 255, 255))
    combined = cv2.bitwise_or(cv2.bitwise_or(m_r, m_b), m_y)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    morph = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > (24 * 24 * 0.4):
            x, y, bw, bh = cv2.boundingRect(cnt)
            asp = float(bw) / max(1, bh)
            if 0.45 <= asp <= 2.2 and bw < w * 0.95 and bh < h * 0.95:
                pad = int(min(bw, bh) * 0.12)
                x1, y1 = max(0, x - pad), max(0, y - pad)
                x2, y2 = min(w, x + bw + pad), min(h, y + bh + pad)
                c_crop = pil_img.crop((x1, y1, x2, y2))
                candidates.append((f"Color Contour ({bw}x{bh})", c_crop, (x1, y1, x2 - x1, y2 - y1)))
                break

    # 5. Full Frame View
    candidates.append(("Full Frame View", pil_img, (0, 0, w, h)))

    best_res = None
    best_crop = pil_img
    best_tag = "Full Frame View"
    best_box = (0, 0, w, h)

    for tag, crop_img, box in candidates:
        try:
            c_np = cv2.cvtColor(np.array(crop_img), cv2.COLOR_RGB2BGR)
            c_padded = square_pad_crop(c_np)
            res = predictor.predict(c_padded, use_tta=use_tta)
            if best_res is None or res["confidence_score"] > best_res["confidence_score"]:
                best_res = res
                best_crop = crop_img
                best_tag = tag
                best_box = box
        except Exception:
            pass

    # Draw Aerospace Corner Reticles and Box on display image
    annotated = np_bgr.copy()
    bx, by, bw, bh = best_box
    if best_res and (bw < w or bh < h):
        c_color = (0, 230, 80) if best_res["confidence_score"] >= 0.35 else (0, 180, 255)
        # Bounding box
        cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), c_color, 2)
        # 4 Corner brackets
        c_len = max(8, min(24, int(min(bw, bh) * 0.25)))
        cv2.line(annotated, (bx, by), (bx + c_len, by), c_color, 3)
        cv2.line(annotated, (bx, by), (bx, by + c_len), c_color, 3)
        cv2.line(annotated, (bx + bw, by), (bx + bw - c_len, by), c_color, 3)
        cv2.line(annotated, (bx + bw, by), (bx + bw, by + c_len), c_color, 3)
        cv2.line(annotated, (bx, by + bh), (bx + c_len, by + bh), c_color, 3)
        cv2.line(annotated, (bx, by + bh), (bx, by + bh - c_len), c_color, 3)
        cv2.line(annotated, (bx + bw, by + bh), (bx + bw - c_len, by + bh), c_color, 3)
        cv2.line(annotated, (bx + bw, by + bh), (bx + bw, by + bh - c_len), c_color, 3)

        tag_str = f" {best_res['class_name']} [{best_res['confidence_percentage']:.1f}%] "
        (tw, th), _ = cv2.getTextSize(tag_str, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        cv2.rectangle(annotated, (bx, max(0, by - th - 10)), (bx + tw + 6, by), (16, 26, 43), -1)
        cv2.rectangle(annotated, (bx, max(0, by - th - 10)), (bx + tw + 6, by), c_color, 1)
        cv2.putText(annotated, tag_str, (bx + 3, max(16, by - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)

    annotated_pil = Image.fromarray(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
    return best_res, best_crop, annotated_pil, best_tag, best_box


def draw_aerovision_cockpit_hud(
    frame: np.ndarray,
    detection_results: List[Dict[str, Any]],
    fps: float,
    latency_ms: float,
    camera_status: str = "STREAMING",
    model_name: str = "RTO 108-Class"
) -> np.ndarray:
    """
    Renders high-contrast AeroVision ADAS cockpit HUD overlays on the live video frame.
    Corner reticles, telemetry status bar, risk-colored bounding boxes, and statutory driver directive.
    """
    canvas = frame.copy()
    h, w = canvas.shape[:2]

    # 1. Top Telemetry Ribbon
    ribbon_h = 42
    ribbon_bg = canvas.copy()
    cv2.rectangle(ribbon_bg, (0, 0), (w, ribbon_h), (7, 11, 20), -1)
    cv2.addWeighted(ribbon_bg, 0.88, canvas, 0.12, 0, canvas)
    cv2.line(canvas, (0, ribbon_h), (w, ribbon_h), (59, 130, 246), 1)

    # Top Telemetry Labels
    cv2.putText(canvas, "AEROVISION ADAS", (14, 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.60, (59, 130, 246), 2, cv2.LINE_AA)

    status_col = (16, 185, 129) if "STREAM" in camera_status.upper() else (148, 163, 184)
    cv2.circle(canvas, (190, 21), 5, status_col, -1)
    cv2.putText(canvas, camera_status, (202, 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 255, 255), 1, cv2.LINE_AA)

    telemetry_str = f"FPS: {fps:.1f}  |  LATENCY: {latency_ms:.1f}ms  |  RES: {w}x{h}  |  {model_name.upper()}"
    (tw, th), _ = cv2.getTextSize(telemetry_str, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
    cv2.putText(canvas, telemetry_str, (max(10, w - tw - 16), 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (148, 163, 184), 1, cv2.LINE_AA)

    # 2. Aerospace Center Reticle Crosshairs (Corner brackets around foveal region)
    cx, cy = w // 2, h // 2
    rw, rh = int(w * 0.42), int(h * 0.46)
    rx1, ry1 = cx - rw // 2, cy - rh // 2
    rx2, ry2 = cx + rw // 2, cy + rh // 2
    bracket_len = 22
    reticle_col = (100, 116, 139)

    cv2.line(canvas, (rx1, ry1), (rx1 + bracket_len, ry1), reticle_col, 1)
    cv2.line(canvas, (rx1, ry1), (rx1, ry1 + bracket_len), reticle_col, 1)
    cv2.line(canvas, (rx2, ry1), (rx2 - bracket_len, ry1), reticle_col, 1)
    cv2.line(canvas, (rx2, ry1), (rx2, ry1 + bracket_len), reticle_col, 1)
    cv2.line(canvas, (rx1, ry2), (rx1 + bracket_len, ry2), reticle_col, 1)
    cv2.line(canvas, (rx1, ry2), (rx1, ry2 - bracket_len), reticle_col, 1)
    cv2.line(canvas, (rx2, ry2), (rx2 - bracket_len, ry2), reticle_col, 1)
    cv2.line(canvas, (rx2, ry2), (rx2, ry2 - bracket_len), reticle_col, 1)

    # Center tiny crosshair
    cv2.line(canvas, (cx - 8, cy), (cx + 8, cy), reticle_col, 1)
    cv2.line(canvas, (cx, cy - 8), (cx, cy + 8), reticle_col, 1)

    # 3. Detection Bounding Boxes & Risk Action Cards
    color_bgr_map = {
        "CRITICAL": (68, 68, 239),     # Red
        "WARNING": (11, 158, 245),     # Amber Gold
        "INFORMATIONAL": (246, 130, 59) # Blue
    }

    if detection_results:
        top_det = detection_results[0]
        x, y, bw, bh = top_det["bbox"]
        res = top_det["prediction"]
        alert = top_det.get("alert", {})
        tier = alert.get("risk_tier", "INFORMATIONAL")
        bgr = color_bgr_map.get(tier, (16, 185, 129))
        conf_pct = res["confidence_percentage"]

        # High-visibility bounding box with corner accents
        cv2.rectangle(canvas, (x, y), (x + bw, y + bh), bgr, 2)
        c_len = max(8, min(20, int(min(bw, bh) * 0.3)))
        cv2.line(canvas, (x, y), (x + c_len, y), bgr, 4)
        cv2.line(canvas, (x, y), (x, y + c_len), bgr, 4)
        cv2.line(canvas, (x + bw, y), (x + bw - c_len, y), bgr, 4)
        cv2.line(canvas, (x + bw, y), (x + bw, y + c_len), bgr, 4)
        cv2.line(canvas, (x, y + bh), (x + c_len, y + bh), bgr, 4)
        cv2.line(canvas, (x, y + bh), (x, y + bh - c_len), bgr, 4)
        cv2.line(canvas, (x + bw, y + bh), (x + bw - c_len, y + bh), bgr, 4)
        cv2.line(canvas, (x + bw, y + bh), (x + bw, y + bh - c_len), bgr, 4)

        # Label Banner
        lbl_txt = f"{tier}: {res['class_name']} ({conf_pct:.1f}%)"
        (lw, lh), _ = cv2.getTextSize(lbl_txt, cv2.FONT_HERSHEY_SIMPLEX, 0.52, 2)
        ly = max(y - 8, lh + ribbon_h + 8)
        cv2.rectangle(canvas, (x, ly - lh - 6), (x + lw + 12, ly + 4), (16, 26, 43), -1)
        cv2.rectangle(canvas, (x, ly - lh - 6), (x + lw + 12, ly + 4), bgr, 1)
        cv2.putText(canvas, lbl_txt, (x + 6, ly - 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 2, cv2.LINE_AA)

        # Bottom Driver Action Directive Banner
        banner_h = 58
        by1 = h - banner_h - 10
        by2 = h - 10
        bx1 = 16
        bx2 = w - 16

        action_bg = canvas.copy()
        cv2.rectangle(action_bg, (bx1, by1), (bx2, by2), (16, 26, 43), -1)
        cv2.addWeighted(action_bg, 0.90, canvas, 0.10, 0, canvas)
        cv2.rectangle(canvas, (bx1, by1), (bx2, by2), bgr, 1)

        action_txt = f"ACTION: {alert.get('advice', 'Proceed with caution.')}"
        cv2.putText(canvas, f"{tier} PROTOCOL  |  #{res['class_id']:03d}  |  CONFIDENCE {conf_pct:.1f}%",
                    (bx1 + 14, by1 + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.44, bgr, 1, cv2.LINE_AA)
        cv2.putText(canvas, action_txt[:85], (bx1 + 14, by1 + 44),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 255, 255), 1, cv2.LINE_AA)

    return canvas


# ---------------------------------------------------------------------------
# 3. INITIALIZE MULTI-AGENT STATE & CONTROLS
# ---------------------------------------------------------------------------
def init_session_state():
    """Initializes multi-agent coordinator, assistant, and audit telemetry in session state."""
    if "coordinator" not in st.session_state:
        st.session_state.coordinator = TrafficSafetyCoordinator(threshold=0.30, required_frames=2)
    if "assistant" not in st.session_state:
        st.session_state.assistant = TrafficSafetyLLMAssistant(coordinator=st.session_state.coordinator)
    if "adapter" not in st.session_state:
        st.session_state.adapter = ModelOutputAdapter()
    if "streaming_active" not in st.session_state:
        st.session_state.streaming_active = False
    if "captured_frame" not in st.session_state:
        st.session_state.captured_frame = None
    if "recent_events" not in st.session_state:
        st.session_state.recent_events = []
    if "telemetry" not in st.session_state:
        st.session_state.telemetry = {
            "fps": 0.0,
            "latency_ms": 0.0,
            "resolution": "1280x720",
            "camera_status": "STANDBY",
            "model_status": "ONLINE (models/rto_best.pth)"
        }
    if "nav_view" not in st.session_state:
        st.session_state.nav_view = "🛰️ Overview"


init_session_state()
predictors = load_predictors()
alert_sys = DriverAlertSystem()


# ---------------------------------------------------------------------------
# 4. SIDEBAR NAVIGATION & TELEMETRY CONTROL
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown("""
    <div class="aerovision-brand-box">
        <div class="brand-title">
            <span class="live-pulse"></span> AeroVision ADAS
        </div>
        <div class="brand-tag">Quantum Titanium • Cockpit Perception</div>
    </div>
    """, unsafe_allow_html=True)

    nav_options = [
        "🛰️ Overview",
        "🎯 Live Detection",
        "🔬 Image Analysis",
        "📊 Analytics",
        "📋 Event History",
        "⚙️ Settings"
    ]

    selected_nav = st.radio(
        "NAVIGATION ROUTER",
        options=nav_options,
        index=nav_options.index(st.session_state.nav_view) if st.session_state.nav_view in nav_options else 0,
        label_visibility="collapsed"
    )
    st.session_state.nav_view = selected_nav

    st.markdown("---")
    st.markdown("### 📡 ADAS System Telemetry")

    # Real Model Status
    if predictors:
        active_model_name = list(predictors.keys())[0]
        predictor = predictors[active_model_name]
        st.session_state.adapter.class_mapping = predictor.class_names
        st.markdown(f"**Model**: `{active_model_name.split()[0]} ({predictor.num_classes} Classes)`")
        st.markdown(f"**Engine**: `PyTorch ({predictor.device.type.upper()})`")
    else:
        st.error("No trained models found in `models/`")
        predictor = None

    stats = st.session_state.coordinator.get_summary_stats()
    st.markdown(f"**Confirmed Alerts**: `{stats.get('alerts_issued', 0)}`")
    st.markdown(f"**Filtered Noise**: `{stats.get('rejections', 0)}`")
    st.markdown(f"**Camera State**: `{st.session_state.telemetry.get('camera_status', 'STANDBY')}`")

    st.markdown("---")
    with st.expander("📋 108 Official RTO Sign Catalog"):
        df_classes = pd.DataFrame([
            {
                "ID": f"#{k:03d}",
                "Sign": v["name"],
                "Tier": f"{v['icon']} {v['tier']}",
                "Directive": v["advice"]
            }
            for k, v in GTSRB_SAFETY_METADATA.items()
        ])
        st.dataframe(df_classes, hide_index=True)


# ---------------------------------------------------------------------------
# 5. VIEW 1: OVERVIEW COCKPIT
# ---------------------------------------------------------------------------
if st.session_state.nav_view == "🛰️ Overview":
    st.markdown("""
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
            <h1 style="font-family:'Outfit',sans-serif; margin:0; font-size:2.1rem; font-weight:800; letter-spacing:-0.5px;">
                AeroVision ADAS • Executive Perception Deck
            </h1>
            <p style="margin:4px 0 0 0; color:#94A3B8; font-size:0.95rem;">
                Autonomous Traffic Sign Intelligence & Regulatory Overwatch • Quantum Titanium Architecture
            </p>
        </div>
        <div class="telemetry-chip">
            <span class="live-pulse" style="margin-right:6px;"></span> ADAS PERCEPTION ONLINE
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Telemetry KPI Ribbon
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""
        <div class="kpi-box">
            <div class="kpi-label">Neural Network Scope</div>
            <div class="kpi-value" style="color:#38BDF8;">
                {predictor.num_classes if predictor else 0} <span style="font-size:0.8rem; font-weight:500; color:#94A3B8;">Classes</span>
            </div>
            <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">Official Indian RTO Signs</div>
        </div>
        """, unsafe_allow_html=True)
    with c2:
        st.markdown(f"""
        <div class="kpi-box">
            <div class="kpi-label">Multi-Agent Overwatch</div>
            <div class="kpi-value" style="color:#10B981;">
                4 <span style="font-size:0.8rem; font-weight:500; color:#94A3B8;">Agents</span>
            </div>
            <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">Validation • Rules • Context • Alert</div>
        </div>
        """, unsafe_allow_html=True)
    with c3:
        st.markdown(f"""
        <div class="kpi-box">
            <div class="kpi-label">Safety Alerts Issued</div>
            <div class="kpi-value" style="color:#F59E0B;">
                {stats.get('alerts_issued', 0)} <span style="font-size:0.8rem; font-weight:500; color:#94A3B8;">Events</span>
            </div>
            <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">Temporal consensus confirmed</div>
        </div>
        """, unsafe_allow_html=True)
    with c4:
        st.markdown(f"""
        <div class="kpi-box">
            <div class="kpi-label">Perception Latency</div>
            <div class="kpi-value" style="color:#A78BFA;">
                {st.session_state.telemetry.get('latency_ms', 12.0):.1f} <span style="font-size:0.8rem; font-weight:500; color:#94A3B8;">ms</span>
            </div>
            <div style="font-size:0.75rem; color:#64748B; margin-top:4px;">Multi-scale foveal inference</div>
        </div>
        """, unsafe_allow_html=True)

    col_left, col_right = st.columns([1.2, 1.0])

    with col_left:
        st.markdown("""
        <div class="titanium-card">
            <h3 style="font-family:'Outfit',sans-serif; margin-top:0; font-size:1.25rem;">
                🚀 Cockpit Quick Actions & Telemetry
            </h3>
            <p style="color:#CBD5E1; font-size:0.92rem; line-height:1.6;">
                AeroVision ADAS couples deep convolutional neural network feature extractors with a 4-agent
                regulatory arbitration system. Road imagery is continuously scanned via multi-scale foveal
                pyramids and shape-aware Hough circle locators, enforcing statutory compliance under the Motor Vehicles Act.
            </p>
        </div>
        """, unsafe_allow_html=True)

        btn_c1, btn_c2, btn_c3 = st.columns(3)
        if btn_c1.button("🎯 Launch Live Detection", key="btn_goto_live", use_container_width=True):
            st.session_state.nav_view = "🎯 Live Detection"
            st.rerun()
        if btn_c2.button("🔬 Inspect Sign Library", key="btn_goto_analysis", use_container_width=True):
            st.session_state.nav_view = "🔬 Image Analysis"
            st.rerun()
        if btn_c3.button("📊 View Model Analytics", key="btn_goto_analytics", use_container_width=True):
            st.session_state.nav_view = "📊 Analytics"
            st.rerun()

        st.markdown("#### 🛣️ Statutory Category Coverage")
        stat_c1, stat_c2, stat_c3 = st.columns(3)
        stat_c1.info("**Mandatory (43 Signs)**\n\nStop, Give Way, Speed Limits, No Entry, Overtaking Prohibited.")
        stat_c2.warning("**Cautionary (44 Signs)**\n\nCurves, Narrow Road, School Ahead, Pedestrian Crossing, Slippery Road.")
        stat_c3.success("**Informational (21 Signs)**\n\nHospital, Petrol Pump, Parking, First Aid Post, Eating Place.")

    with col_right:
        st.markdown("#### 🤖 Multi-Agent Overwatch System Status")
        st.markdown(f"""
        <div class="titanium-card" style="padding:14px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:#38BDF8;">🛡️ ValidationAgent</span>
                <span class="agent-pill agent-active">ACTIVE • THRESHOLD {st.session_state.coordinator.threshold*100:.0f}%</span>
            </div>
            <p style="font-size:0.84rem; color:#94A3B8; margin:6px 0 0 0;">
                Suppresses low-confidence artifacts and camera noise. Total rejections filtered: <b>{stats.get('rejections', 0)}</b>.
            </p>
        </div>

        <div class="titanium-card" style="padding:14px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:#FBBF24;">📜 RulesEngineAgent</span>
                <span class="agent-pill agent-active">108 STATUTORY DIRECTIVES</span>
            </div>
            <p style="font-size:0.84rem; color:#94A3B8; margin:6px 0 0 0;">
                Translates predicted sign classes into statutory driver duties and safety risk protocols.
            </p>
        </div>

        <div class="titanium-card" style="padding:14px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:#A78BFA;">⏱️ ContextAgent</span>
                <span class="agent-pill agent-active">CONSENSUS BUFFER {st.session_state.coordinator.required_frames} FRAMES</span>
            </div>
            <p style="font-size:0.84rem; color:#94A3B8; margin:6px 0 0 0;">
                Eliminates single-frame video flickers and suppresses repeat audio alerts for held signs.
            </p>
        </div>

        <div class="titanium-card" style="padding:14px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:#34D399;">🚨 AlertAgent</span>
                <span class="agent-pill agent-active">AUDIO DISPATCH ARMED</span>
            </div>
            <p style="font-size:0.84rem; color:#94A3B8; margin:6px 0 0 0;">
                Synthesizes non-blocking voice directives and generates structured JSON-LD audit events.
            </p>
        </div>
        """, unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# 6. VIEW 2: LIVE DETECTION (COCKPIT HUD)
# ---------------------------------------------------------------------------
elif st.session_state.nav_view == "🎯 Live Detection":
    st.markdown("""
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div>
            <h1 style="font-family:'Outfit',sans-serif; margin:0; font-size:2.0rem; font-weight:800; letter-spacing:-0.5px;">
                🎯 AeroVision ADAS • Live Camera HUD
            </h1>
            <p style="margin:4px 0 0 0; color:#94A3B8; font-size:0.92rem;">
                Real-Time Video Road Perception • Corner Reticles • Multi-Agent Safety Arbitration
            </p>
        </div>
        <div class="telemetry-chip">
            <span class="live-pulse" style="margin-right:6px;"></span> COCKPIT ACTIVE
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Camera Controls Bar
    ctrl_col1, ctrl_col2, ctrl_col3, ctrl_col4, ctrl_col5 = st.columns([1, 1, 1.2, 1.2, 1.6])
    start_cam = ctrl_col1.button("▶️ Start", key="btn_start_cam", use_container_width=True)
    stop_cam = ctrl_col2.button("⏹️ Stop", key="btn_stop_cam", use_container_width=True)
    capture_cam = ctrl_col3.button("📸 Capture Frame", key="btn_cap_cam", use_container_width=True)
    upload_cam = ctrl_col4.button("📤 Upload Image", key="btn_switch_upload", use_container_width=True)

    stream_mode = ctrl_col5.selectbox(
        "Stream Mode",
        options=["🚗 Highway Simulated ADAS Stream", "📷 Browser Live Camera Viewfinder", "💻 Standalone 60 FPS Desktop App"],
        index=0
    )

    if start_cam:
        st.session_state.streaming_active = True
        st.session_state.telemetry["camera_status"] = "STREAMING"
    if stop_cam:
        st.session_state.streaming_active = False
        st.session_state.telemetry["camera_status"] = "STANDBY"
    if upload_cam:
        st.session_state.nav_view = "🔬 Image Analysis"
        st.rerun()

    col_viewfinder, col_panel = st.columns([1.35, 1.0])

    # Left: Large Live Viewfinder
    with col_viewfinder:
        view_placeholder = st.empty()
        captured_placeholder = st.empty()

        if stream_mode == "🚗 Highway Simulated ADAS Stream":
            if st.session_state.streaming_active:
                from src.webcam_recognition import TrafficSignWebcamEngine
                engine = TrafficSignWebcamEngine(
                    checkpoint_path=str(predictor.checkpoint_path) if predictor else "models/rto_best.pth",
                    confidence_threshold=st.session_state.coordinator.threshold,
                    demo_mode=True
                )
                prev_time = time.time()

                # Run streaming loop (controlled by Stop button)
                for _ in range(35):
                    if not st.session_state.streaming_active:
                        break

                    frame = engine._generate_demo_frame()
                    t_start = time.time()
                    time.sleep(0.035)

                    rois = engine.detect_traffic_sign_rois(frame)
                    detection_results = []
                    best_pred = None
                    best_bbox = None

                    if rois:
                        for x, y, bw, bh, cropped in rois:
                            res = predictor.predict(cropped, use_tta=False)
                            if best_pred is None or res['confidence_score'] > best_pred['confidence_score']:
                                best_pred = res
                                best_bbox = (x, y, bw, bh)

                        if best_pred and best_pred['confidence_score'] >= st.session_state.coordinator.threshold:
                            alert = alert_sys.process_detection(best_pred['class_id'], best_pred['confidence_score'])
                            detection_results.append({
                                'bbox': best_bbox,
                                'prediction': best_pred,
                                'alert': alert
                            })

                    now = time.time()
                    fps_val = 1.0 / max(0.001, (now - prev_time))
                    prev_time = now
                    lat_ms = (now - t_start) * 1000.0

                    # Update real telemetry in state
                    st.session_state.telemetry["fps"] = fps_val
                    st.session_state.telemetry["latency_ms"] = lat_ms
                    st.session_state.telemetry["resolution"] = f"{frame.shape[1]}x{frame.shape[0]}"
                    st.session_state.telemetry["camera_status"] = "STREAMING"

                    # Multi-agent process step
                    top_lbl = detection_results[0]['prediction']['class_name'] if detection_results else None
                    top_conf = detection_results[0]['prediction']['confidence_score'] if detection_results else 0.0
                    agent_step = st.session_state.coordinator.process(top_lbl, top_conf)

                    # Update recent events
                    if agent_step.get("status") == "alert" and detection_results:
                        ev = agent_step["event"]
                        if ev and (not st.session_state.recent_events or st.session_state.recent_events[0].get("event_id") != ev.get("event_id")):
                            st.session_state.recent_events.insert(0, ev)
                            st.session_state.recent_events = st.session_state.recent_events[:15]

                    # Draw Aerospace HUD
                    hud_frame = draw_aerovision_cockpit_hud(
                        frame, detection_results, fps_val, lat_ms,
                        camera_status="STREAMING",
                        model_name="RTO 108-Class"
                    )
                    hud_rgb = cv2.cvtColor(hud_frame, cv2.COLOR_BGR2RGB)
                    view_placeholder.image(hud_rgb, caption="AeroVision ADAS • Active Highway Stream", use_container_width=True)

                    if capture_cam:
                        st.session_state.captured_frame = Image.fromarray(hud_rgb)

            else:
                # Standby Viewfinder Graphic
                standby_canvas = np.zeros((480, 720, 3), dtype=np.uint8)
                standby_canvas[:] = (16, 26, 43)
                cv2.putText(standby_canvas, "AEROVISION ADAS - STANDBY", (180, 220),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.75, (59, 130, 246), 2, cv2.LINE_AA)
                cv2.putText(standby_canvas, "Click [▶ Start] above to initiate live road sign scanning.", (130, 260),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.50, (148, 163, 184), 1, cv2.LINE_AA)
                view_placeholder.image(standby_canvas, caption="Camera Stream Standby", use_container_width=True)

        elif stream_mode == "📷 Browser Live Camera Viewfinder":
            st.info("📷 Hold any traffic sign or phone screen displaying a sign in front of your camera:")
            cam_shot = st.camera_input("AeroVision Optical Sensor", key="live_browser_cam")
            if cam_shot is not None:
                img_live = Image.open(cam_shot).convert("RGB")
                st.session_state.captured_frame = img_live
                t0 = time.time()
                res, best_crop, annotated_pil, best_tag, best_box = extract_and_evaluate_best_sign_roi(predictor, img_live)
                lat_ms = (time.time() - t0) * 1000.0
                st.session_state.telemetry["latency_ms"] = lat_ms
                st.session_state.telemetry["fps"] = 1000.0 / max(1.0, lat_ms)
                st.session_state.telemetry["resolution"] = f"{img_live.width}x{img_live.height}"
                st.session_state.telemetry["camera_status"] = "CAPTURED"
                view_placeholder.image(annotated_pil, caption=f"Analyzed ({best_tag}): {res['class_name']}", use_container_width=True)

        elif stream_mode == "💻 Standalone 60 FPS Desktop App":
            st.markdown("""
            <div class="titanium-card">
                <h3 style="font-family:'Outfit',sans-serif; margin-top:0;">💻 Hardware-Accelerated Desktop Cockpit</h3>
                <p style="color:#CBD5E1; font-size:0.92rem;">
                    For 60 FPS latency, DirectShow hardware acceleration, and interactive mouse-targeting:
                </p>
                <div style="background:rgba(0,0,0,0.4); padding:10px 14px; border-radius:8px; font-family:'JetBrains Mono'; font-size:0.85rem; color:#38BDF8;">
                    .\\.venv\\Scripts\\python.exe desktop_app.py
                </div>
            </div>
            """, unsafe_allow_html=True)

        if st.session_state.captured_frame is not None:
            st.success("📸 Frame Captured! You can inspect it directly in Image Analysis.")
            if st.button("🔬 Send Captured Frame to Deep Analysis", key="btn_send_captured"):
                st.session_state.nav_view = "🔬 Image Analysis"
                st.rerun()

    # Right: Telemetry & Recognition & Multi-Agent Panels
    with col_panel:
        st.markdown("#### 📡 System Telemetry")
        tm1, tm2, tm3 = st.columns(3)
        tm1.metric("FPS", f"{st.session_state.telemetry['fps']:.1f}")
        tm2.metric("Latency", f"{st.session_state.telemetry['latency_ms']:.1f} ms")
        tm3.metric("Resolution", st.session_state.telemetry['resolution'])

        st.markdown("#### 🛑 Recognition Panel")
        last_sign = st.session_state.coordinator.context_agent.current_label
        if last_sign:
            rule = st.session_state.coordinator.rule_agent.get_rule(last_sign)
            tier = rule.get("risk_tier", "INFORMATIONAL")
            card_class = "card-critical" if "CRITICAL" in tier.upper() else ("card-warning" if "WARNING" in tier.upper() else "card-info")
            st.markdown(f"""
            <div class="{card_class}">
                <div style="font-size:0.80rem; font-weight:700; letter-spacing:1px; text-transform:uppercase;">
                    {tier} PROTOCOL
                </div>
                <h3 style="font-family:'Outfit',sans-serif; margin:6px 0; font-size:1.4rem; color:#FFFFFF;">
                    {rule.get('name', last_sign)}
                </h3>
                <div style="font-size:0.86rem; color:#E2E8F0; line-height:1.4;">
                    <b>Required Action:</b> {rule.get('action', 'Observe road conditions.')}
                </div>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.info("Scanning video feed for traffic signs...")

        # Multi-Agent Activity Panel
        st.markdown("#### 🤖 Multi-Agent Activity Panel")
        c_state = st.session_state.coordinator.context_agent.consecutive_count
        c_req = st.session_state.coordinator.required_frames
        is_alerting = (st.session_state.coordinator.context_agent.active_alert_label is not None)

        st.markdown(f"""
        <div class="titanium-card" style="padding:12px 14px;">
            <div style="margin-bottom:8px;">
                <span class="agent-pill agent-active">ValidationAgent</span>
                <span style="font-size:0.85rem; color:#CBD5E1;">Threshold: <b>{st.session_state.coordinator.threshold*100:.0f}%</b></span>
            </div>
            <div style="margin-bottom:8px;">
                <span class="agent-pill agent-active">RulesEngineAgent</span>
                <span style="font-size:0.85rem; color:#CBD5E1;">Directive: <b>Motor Vehicles Act Standard</b></span>
            </div>
            <div style="margin-bottom:8px;">
                <span class="agent-pill {'agent-active' if is_alerting else 'agent-monitoring'}">ContextAgent</span>
                <span style="font-size:0.85rem; color:#CBD5E1;">Temporal: <b>{c_state}/{c_req} frames</b> ({'ALERT DISPATCHED' if is_alerting else 'BUFFERING'})</span>
            </div>
            <div>
                <span class="agent-pill agent-active">AlertAgent</span>
                <span style="font-size:0.85rem; color:#CBD5E1;">Speech Alerts: <b>ENABLED (Cooldown 3.5s)</b></span>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Recent Detection Events
        st.markdown("#### 📋 Recent Detections")
        if st.session_state.recent_events:
            for ev in st.session_state.recent_events[:4]:
                p_col = "#EF4444" if ev.get("priority") == "HIGH" else ("#F59E0B" if ev.get("priority") == "MEDIUM" else "#3B82F6")
                st.markdown(f"""
                <div style="border-left:3px solid {p_col}; background:rgba(16,26,43,0.5); padding:6px 10px; border-radius:6px; margin-bottom:6px; font-size:0.84rem;">
                    <b>{ev.get('label')}</b> ({ev.get('confidence', 0)*100:.1f}%) • <span style="color:#94A3B8;">{ev.get('datetime', '')}</span>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.caption("No confirmed events in buffer yet.")


# ---------------------------------------------------------------------------
# 7. VIEW 3: IMAGE ANALYSIS (DEEP FORENSIC WORKBENCH)
# ---------------------------------------------------------------------------
elif st.session_state.nav_view == "🔬 Image Analysis":
    st.markdown("""
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div>
            <h1 style="font-family:'Outfit',sans-serif; margin:0; font-size:2.0rem; font-weight:800; letter-spacing:-0.5px;">
                🔬 AeroVision ADAS • Deep Image Analysis
            </h1>
            <p style="margin:4px 0 0 0; color:#94A3B8; font-size:0.92rem;">
                Multi-Scale Foveal Pyramid • 108 Official RTO Sign Library • Top-5 Probability Matrix
            </p>
        </div>
        <div class="telemetry-chip">
            <span class="live-pulse" style="margin-right:6px;"></span> ANALYSIS ENGINE READY
        </div>
    </div>
    """, unsafe_allow_html=True)

    col_input, col_results = st.columns([1.1, 1.0])

    pil_image = None
    if st.session_state.captured_frame is not None:
        pil_image = st.session_state.captured_frame

    with col_input:
        source_mode = st.radio(
            "Select Ingestion Source",
            ["📤 Upload Image", "📚 108 Official RTO Sign Library", "📸 Use Captured Frame"],
            horizontal=True
        )

        if source_mode == "📤 Upload Image":
            up_file = st.file_uploader("Upload traffic sign image...", type=["png", "jpg", "jpeg"])
            if up_file is not None:
                pil_image = Image.open(up_file).convert("RGB")

        elif source_mode == "📚 108 Official RTO Sign Library":
            test_dir = Path("dataset/Test")
            lib_c1, lib_c2 = st.columns([1, 1.4])
            cat_filter = lib_c1.selectbox(
                "Filter by Category",
                ["All 108 Signs", "Mandatory (0–42)", "Cautionary (43–86)", "Informational (87–107)"],
                index=0
            )

            filtered_cids = []
            for cid in range(predictor.num_classes if predictor else 108):
                if cat_filter == "All 108 Signs":
                    filtered_cids.append(cid)
                elif "Mandatory" in cat_filter and 0 <= cid <= 42:
                    filtered_cids.append(cid)
                elif "Cautionary" in cat_filter and 43 <= cid <= 86:
                    filtered_cids.append(cid)
                elif "Informational" in cat_filter and 87 <= cid <= 107:
                    filtered_cids.append(cid)

            sign_options = {
                f"#{cid:03d} - {GTSRB_SAFETY_METADATA.get(cid, {}).get('name', f'Class_{cid}')} ({GTSRB_SAFETY_METADATA.get(cid, {}).get('icon', 'ℹ️')} {GTSRB_SAFETY_METADATA.get(cid, {}).get('tier', 'INFO')})": cid
                for cid in filtered_cids
            }

            selected_sign_label = lib_c2.selectbox("Select Sign (108 Available)", options=list(sign_options.keys()), index=0)
            selected_cid = sign_options[selected_sign_label]

            sign_folder = test_dir / str(selected_cid)
            sample_choices = {}
            if sign_folder.exists():
                can_p = sign_folder / "canonical.png"
                if can_p.exists():
                    sample_choices["🌟 Reference Sign (canonical.png)"] = can_p
                for tf in sorted(list(sign_folder.glob("test_*.png")))[:10]:
                    sample_choices[f"📸 Camera Variant ({tf.name})"] = tf

            if sample_choices:
                chosen_sample = st.selectbox("Select Image Variant", options=list(sample_choices.keys()), index=0)
                pil_image = Image.open(sample_choices[chosen_sample]).convert("RGB")
            else:
                st.warning(f"No sample images found for Class #{selected_cid}")

        elif source_mode == "📸 Use Captured Frame":
            if st.session_state.captured_frame is not None:
                pil_image = st.session_state.captured_frame
                st.info("Using currently captured frame from Live Detection.")
            else:
                st.warning("No frame has been captured yet. Use Live Detection -> 'Capture Frame' button.")

    with col_results:
        if pil_image is not None and predictor is not None:
            t0 = time.time()
            res, best_crop, annotated_pil, best_tag, best_box = extract_and_evaluate_best_sign_roi(predictor, pil_image, use_tta=True)
            latency_ms = (time.time() - t0) * 1000.0
            alert = alert_sys.process_detection(res["class_id"], res["confidence_score"])

            # Render Annotated Frame
            col_input.image(annotated_pil, caption=f"Analyzed ({best_tag}): {res['class_name']} ({res['confidence_percentage']:.1f}%)", use_container_width=True)
            if best_crop is not None and best_crop != pil_image:
                col_input.image(best_crop, caption=f"🎯 Localized Sign ROI ({best_tag})", width=180)

            # High-Visibility Risk Protocol Card
            base_tier = alert.get("risk_tier", "INFORMATIONAL")
            card_class = "card-critical" if "CRITICAL" in base_tier.upper() else ("card-warning" if "WARNING" in base_tier.upper() else "card-info")

            st.markdown(f"""
            <div class="{card_class}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:0.85rem; font-weight:700; color:{alert['color_code']};">
                        {alert['icon']} RISK PROTOCOL: {alert['risk_tier']}
                    </span>
                    <span class="telemetry-chip">
                        CLASS #{res['class_id']:03d} • {res['confidence_percentage']:.1f}% CONFIDENCE
                    </span>
                </div>
                <h2 style="font-family:'Outfit',sans-serif; margin:6px 0; font-size:1.75rem; color:#FFFFFF;">
                    {alert['class_name']}
                </h2>
                <div style="font-size:0.80rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#93C5FD; margin-top:8px;">
                    Statutory Action Directive:
                </div>
                <p style="font-size:1.05rem; font-weight:600; color:#FFFFFF; margin:4px 0 0 0;">
                    {alert['advice']}
                </p>
            </div>
            """, unsafe_allow_html=True)

            # Audio Speech Prompt
            if alert.get("speech_prompt"):
                st.audio(f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q={alert['speech_prompt'].replace(' ', '+')}&tl=en")

            # Multi-Agent Consensus
            st.session_state.coordinator.required_frames = 1
            st.session_state.coordinator.context_agent.required_frames = 1
            norm_label, norm_conf = st.session_state.adapter.normalize(res)
            agent_step = st.session_state.coordinator.process(norm_label, norm_conf)

            # Add to history
            if agent_step.get("event"):
                st.session_state.recent_events.insert(0, agent_step["event"])
                st.session_state.recent_events = st.session_state.recent_events[:20]

            st.markdown(f"""
            <div class="titanium-card" style="padding:12px 16px;">
                <div style="font-weight:700; color:#38BDF8; font-size:0.95rem;">
                    🤖 Multi-Agent Decision: {agent_step['status'].upper()}
                </div>
                <div style="font-size:0.90rem; color:#F8FAFC; margin-top:4px;">
                    {agent_step['message']}
                </div>
                <div style="font-size:0.80rem; color:#94A3B8; margin-top:4px;">
                    Priority: <b>{agent_step['priority']}</b> | Latency: <b>{latency_ms:.1f}ms</b>
                </div>
            </div>
            """, unsafe_allow_html=True)

            # Top 5 Probabilities Bar Chart
            st.markdown("#### 📈 Top 5 Probability Distribution")
            chart_img = best_crop if best_crop is not None else pil_image
            tensor_img = predictor.transform(chart_img).unsqueeze(0).to(predictor.device)
            with torch.no_grad():
                probs = F.softmax(predictor.model(tensor_img), dim=1).squeeze().cpu().numpy()

            top5_idx = probs.argsort()[-5:][::-1]
            top5_df = pd.DataFrame({
                "Traffic Sign": [predictor.class_names.get(i, f"Class {i}") for i in top5_idx],
                "Probability (%)": [round(probs[i] * 100.0, 2) for i in top5_idx]
            })
            st.bar_chart(top5_df.set_index("Traffic Sign"))

            # Ask AI Explainer
            with st.expander("💬 Ask AI Safety Explainer (Decision Rationale)", expanded=False):
                q_col1, q_col2 = st.columns(2)
                q_choice = None
                if q_col1.button("❓ Why this alert?", key="btn_why"):
                    q_choice = "Why did the coordinator issue this alert?"
                if q_col2.button("🛡️ Rejection summary", key="btn_rej"):
                    q_choice = "How many low-confidence predictions were rejected?"

                cust_q = st.text_input("Or custom query:", placeholder="e.g. What is the statutory penalty?", key="cust_q")
                if cust_q:
                    q_choice = cust_q
                if q_choice:
                    ans = st.session_state.assistant.query(q_choice)
                    st.info(f"**Answer:** {ans}")
        else:
            st.info("👈 Select or upload an image to begin deep forensic perception.")


# ---------------------------------------------------------------------------
# 8. VIEW 4: ANALYTICS & BENCHMARKING
# ---------------------------------------------------------------------------
elif st.session_state.nav_view == "📊 Analytics":
    st.markdown("""
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div>
            <h1 style="font-family:'Outfit',sans-serif; margin:0; font-size:2.0rem; font-weight:800; letter-spacing:-0.5px;">
                📊 AeroVision ADAS • System Analytics & Benchmarks
            </h1>
            <p style="margin:4px 0 0 0; color:#94A3B8; font-size:0.92rem;">
                108-Class Verification Benchmark • Category Distribution • Multi-Agent Efficiency
            </p>
        </div>
        <div class="telemetry-chip">
            <span class="live-pulse" style="margin-right:6px;"></span> TELEMETRY ONLINE
        </div>
    </div>
    """, unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Model Classes", f"{predictor.num_classes if predictor else 0}")
    c2.metric("Confirmed Alerts", f"{stats.get('alerts_issued', 0)}")
    c3.metric("Noise Filtered", f"{stats.get('rejections', 0)}")
    c4.metric("Consensus Threshold", f"{st.session_state.coordinator.threshold*100:.0f}%")

    st.markdown("---")
    st.markdown("### ⚡ Automated 108-Sign Full Benchmark")
    st.markdown("Run automated evaluation across all 108 canonical signs in `dataset/Test/` to verify real accuracy:")

    if st.button("🚀 Run 108-Sign Verification Benchmark", key="btn_run_full_bench"):
        test_dir = Path("dataset/Test")
        eval_rows = []
        prog = st.progress(0.0)
        status_txt = st.empty()
        correct_count = 0
        total_eval = 0

        for i in range(predictor.num_classes if predictor else 108):
            c_path = test_dir / str(i) / "canonical.png"
            if c_path.exists():
                total_eval += 1
                img_c = Image.open(c_path).convert("RGB")
                p_res = predictor.predict(img_c, use_tta=False)
                is_match = (p_res["class_id"] == i)
                if is_match:
                    correct_count += 1
                eval_rows.append({
                    "Class": f"#{i:03d}",
                    "Trained Sign Name": GTSRB_SAFETY_METADATA.get(i, {}).get("name", f"Class_{i}"),
                    "Model Prediction": p_res["class_name"],
                    "Confidence": f"{p_res['confidence_percentage']:.1f}%",
                    "Status": "✅ PASS" if is_match else "❌ FAIL",
                    "Tier": GTSRB_SAFETY_METADATA.get(i, {}).get("tier", "INFO")
                })
            prog.progress((i + 1) / (predictor.num_classes if predictor else 108))
            status_txt.text(f"Evaluating Class #{i:03d}: {GTSRB_SAFETY_METADATA.get(i, {}).get('name', '')}...")

        acc_pct = (correct_count / total_eval * 100.0) if total_eval > 0 else 0.0
        status_txt.success(f"Benchmark Complete! Accuracy: {correct_count}/{total_eval} ({acc_pct:.1f}%) across all official classes.")
        st.dataframe(pd.DataFrame(eval_rows), hide_index=True, use_container_width=True)

    st.markdown("---")
    st.markdown("### 📊 Statutory Risk Category Distribution")
    cat_df = pd.DataFrame({
        "Category": ["Mandatory (Regulatory)", "Cautionary (Warning)", "Informational (Facility)"],
        "Sign Count": [43, 44, 21]
    })
    st.bar_chart(cat_df.set_index("Category"))


# ---------------------------------------------------------------------------
# 9. VIEW 5: EVENT HISTORY & AUDIT LEDGER
# ---------------------------------------------------------------------------
elif st.session_state.nav_view == "📋 Event History":
    st.markdown("""
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div>
            <h1 style="font-family:'Outfit',sans-serif; margin:0; font-size:2.0rem; font-weight:800; letter-spacing:-0.5px;">
                📋 AeroVision ADAS • Safety Event Audit Ledger
            </h1>
            <p style="margin:4px 0 0 0; color:#94A3B8; font-size:0.92rem;">
                Historical Record of Confirmed Safety Interventions & Statutory Directives
            </p>
        </div>
        <div class="telemetry-chip">
            <span class="live-pulse" style="margin-right:6px;"></span> AUDIT ACTIVE
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Filter Controls
    f_col1, f_col2, f_col3 = st.columns([1.2, 1.4, 1.0])
    sev_filter = f_col1.selectbox("Filter by Severity Priority", ["ALL SEVERITIES", "HIGH (Critical)", "MEDIUM (Warning)", "LOW (Info)"])
    search_term = f_col2.text_input("Search by Sign Name", placeholder="e.g. Stop, Speed Limit...")
    clear_btn = f_col3.button("🗑️ Clear History", key="btn_clear_history")

    if clear_btn:
        st.session_state.coordinator.clear_history()
        st.session_state.recent_events.clear()
        st.success("Event history cleared.")
        st.rerun()

    events = st.session_state.coordinator.history
    if events:
        filtered = []
        for ev in events:
            # Severity filter
            if "HIGH" in sev_filter and ev.get("priority") != "HIGH":
                continue
            if "MEDIUM" in sev_filter and ev.get("priority") != "MEDIUM":
                continue
            if "LOW" in sev_filter and ev.get("priority") != "LOW":
                continue
            # Search term
            if search_term and search_term.lower() not in ev.get("label", "").lower():
                continue
            filtered.append(ev)

        if filtered:
            ev_df = pd.DataFrame([
                {
                    "Event ID": f"#{e.get('event_id', 0):04d}",
                    "Timestamp": e.get("datetime", ""),
                    "Sign Title": e.get("label", ""),
                    "Priority": e.get("priority", "MEDIUM"),
                    "Confidence": f"{e.get('confidence', 0)*100:.1f}%",
                    "Required Action": e.get("action", "")
                }
                for e in filtered
            ])
            st.dataframe(ev_df, hide_index=True, use_container_width=True)

            d_col1, d_col2 = st.columns(2)
            json_data = json.dumps(filtered, indent=2)
            d_col1.download_button(
                "📥 Download Event Log (JSON)",
                data=json_data,
                file_name="aerovision_safety_audit.json",
                mime="application/json"
            )
            csv_data = ev_df.to_csv(index=False)
            d_col2.download_button(
                "📥 Download Event Log (CSV)",
                data=csv_data,
                file_name="aerovision_safety_audit.csv",
                mime="text/csv"
            )
        else:
            st.info("No events match the selected filters.")
    else:
        st.info("No confirmed safety alerts have been recorded yet.")


# ---------------------------------------------------------------------------
# 10. VIEW 6: SETTINGS & CALIBRATION
# ---------------------------------------------------------------------------
elif st.session_state.nav_view == "⚙️ Settings":
    st.markdown("""
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div>
            <h1 style="font-family:'Outfit',sans-serif; margin:0; font-size:2.0rem; font-weight:800; letter-spacing:-0.5px;">
                ⚙️ AeroVision ADAS • System Calibration
            </h1>
            <p style="margin:4px 0 0 0; color:#94A3B8; font-size:0.92rem;">
                Perception Parameters • Consensus Thresholds • Speech Synthesis Configuration
            </p>
        </div>
        <div class="telemetry-chip">
            <span class="live-pulse" style="margin-right:6px;"></span> CALIBRATION DECK
        </div>
    </div>
    """, unsafe_allow_html=True)

    set_c1, set_c2 = st.columns(2)

    with set_c1:
        st.markdown("#### 🧠 Neural Network & Perception")
        model_choice = st.selectbox("Select Model Architecture", options=list(predictors.keys()), index=0)
        st.session_state.telemetry["model_status"] = f"ONLINE ({model_choice})"

        conf_th = st.slider(
            "Alert Confidence Threshold",
            min_value=0.15, max_value=0.95, value=float(st.session_state.coordinator.threshold), step=0.05,
            help="Minimum prediction confidence required to trigger driver warnings."
        )
        st.session_state.coordinator.threshold = conf_th
        st.session_state.coordinator.validation_agent.threshold = conf_th
        alert_sys.confidence_threshold = conf_th

        enable_tta = st.checkbox("Enable 6-Pass Test-Time Augmentation (TTA)", value=True)

    with set_c2:
        st.markdown("#### 🤖 Multi-Agent Arbitration")
        agent_req_frames = st.slider(
            "Consensus Confirmation Frames",
            min_value=1, max_value=5, value=int(st.session_state.coordinator.required_frames),
            help="Number of consecutive consistent frames required before issuing a new alert."
        )
        st.session_state.coordinator.required_frames = agent_req_frames
        st.session_state.coordinator.context_agent.required_frames = agent_req_frames

        tts_enable = st.checkbox("Enable Voice Synthesis Audio Alerts", value=True)
        st.session_state.coordinator.alert_agent.enable_speech = tts_enable

        cam_idx = st.number_input("Camera Device Index", min_value=0, max_value=5, value=0)

    st.markdown("---")
    st.markdown("#### 🩺 Diagnostic Environment Telemetry")
    diag_c1, diag_c2, diag_c3, diag_c4 = st.columns(4)
    diag_c1.info(f"**PyTorch**: `{torch.__version__}`")
    diag_c2.info(f"**CUDA Device**: `{torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU Active'}`")
    diag_c3.info(f"**OpenCV**: `{cv2.__version__}`")
    diag_c4.info(f"**Streamlit**: `{st.__version__}`")

    if st.button("🔄 Reset All Settings to Factory Defaults"):
        st.session_state.coordinator.threshold = 0.30
        st.session_state.coordinator.required_frames = 2
        st.session_state.coordinator.validation_agent.threshold = 0.30
        st.session_state.coordinator.context_agent.required_frames = 2
        st.success("All perception parameters restored to factory defaults.")
        st.rerun()
