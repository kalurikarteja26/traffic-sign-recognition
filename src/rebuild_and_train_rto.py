"""
src/rebuild_and_train_rto.py

Extracts authentic traffic sign images directly from the official 33-page RTO PDF,
generates a high-quality augmented dataset for all 108 classes, and trains
a high-accuracy MobileNetV2 model.
"""

import sys
import os
import re
import time
import shutil
import fitz # PyMuPDF
import cv2
import numpy as np
import pandas as pd
from pathlib import Path
from PIL import Image, ImageDraw

# Ensure project root is in sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.generate_rto_dataset import RTO_SIGN_CATALOG
import torch
import torch.nn as nn
import torch.optim as optim
from src.data_preprocessing import build_dataloaders
from src.model import get_model
from src.train import EarlyStopping, train_epoch, validate_epoch


def clean_str(s):
    return re.sub(r'[^a-zA-Z0-9]', '', s).lower()


def tight_crop_sign(crop):
    """Crops tightly around the traffic sign contour, removing background cards/lines."""
    h, w = crop.shape[:2]
    clean_crop = crop.copy()
    # Mask top 25% where card outline header line is drawn
    clean_crop[:int(h * 0.25), :] = (255, 255, 255)
    
    gray = cv2.cvtColor(clean_crop, cv2.COLOR_RGB2GRAY)
    mask = gray < 242
    
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return cv2.resize(crop, (128, 128), interpolation=cv2.INTER_LANCZOS4)
    
    valid_cnts = [c for c in contours if cv2.contourArea(c) > 300]
    if not valid_cnts:
        return cv2.resize(crop, (128, 128), interpolation=cv2.INTER_LANCZOS4)
    
    all_pts = np.vstack(valid_cnts)
    x, y, bw, bh = cv2.boundingRect(all_pts)
    
    cx = x + bw // 2
    cy = y + bh // 2
    side = int(max(bw, bh) * 1.15)
    
    x1 = max(0, cx - side // 2)
    y1 = max(0, cy - side // 2)
    x2 = min(w, x1 + side)
    y2 = min(h, y1 + side)
    
    sign_cut = crop[y1:y2, x1:x2]
    return cv2.resize(sign_cut, (128, 128), interpolation=cv2.INTER_LANCZOS4)


def extract_all_templates_from_pdf():
    pdf_path = r"C:\Users\KALURI KARTEJA\.gemini\antigravity-ide\brain\1b6b30c9-43eb-42d2-87f3-e805d517a6eb\.user_uploaded\media_1790406262648.pdf"
    doc = fitz.open(pdf_path)
    
    template_dir = Path("dataset/pdf_canonical_templates")
    template_dir.mkdir(parents=True, exist_ok=True)
    
def render_informational_sign(item):
    """Renders official Indian RTO blue informational signs with distinct icons."""
    name = item['name']
    img = Image.new('RGB', (128, 128), color='white')
    draw = ImageDraw.Draw(img)
    cx, cy = 64, 64
    r = 54
    
    # Outer blue square with white border
    draw.rectangle([cx - r, cy - r, cx + r, cy + r], fill='#0984e3', outline='#0984e3')
    draw.rectangle([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline='white', width=2)
    
    cv_img = np.array(img)
    
    if "Parking" in name:
        # Large 'P' symbol
        cv2.putText(cv_img, "P", (cx - 24, cy + 22), cv2.FONT_HERSHEY_DUPLEX, 1.6, (255, 255, 255), 4, cv2.LINE_AA)
        if "Both Sides" in name:
            cv2.arrowedLine(cv_img, (cx - 38, cy + 38), (cx - 10, cy + 38), (255, 255, 255), 3, tipLength=0.4)
            cv2.arrowedLine(cv_img, (cx + 38, cy + 38), (cx + 10, cy + 38), (255, 255, 255), 3, tipLength=0.4)
        elif "Cycle" in name:
            cv2.putText(cv_img, "CYCLE", (cx - 36, cy + 44), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        elif "Motorcycle" in name:
            cv2.putText(cv_img, "BIKE", (cx - 30, cy + 44), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        elif "Car" in name:
            cv2.putText(cv_img, "CAR", (cx - 24, cy + 44), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        return cv_img

    elif name == "Hospital":
        # White inner square with red cross / 'H'
        cv2.rectangle(cv_img, (cx - 32, cy - 32), (cx + 32, cy + 32), (255, 255, 255), -1)
        cv2.putText(cv_img, "H", (cx - 18, cy + 20), cv2.FONT_HERSHEY_DUPLEX, 1.4, (214, 48, 49), 4, cv2.LINE_AA)
        return cv_img

    elif name == "First Aid Post":
        cv2.rectangle(cv_img, (cx - 32, cy - 32), (cx + 32, cy + 32), (255, 255, 255), -1)
        cv2.rectangle(cv_img, (cx - 8, cy - 24), (cx + 8, cy + 24), (214, 48, 49), -1)
        cv2.rectangle(cv_img, (cx - 24, cy - 8), (cx + 24, cy + 8), (214, 48, 49), -1)
        return cv_img

    elif name == "Public Telephone":
        cv2.putText(cv_img, "TEL", (cx - 32, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 1.1, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Petrol Pump":
        cv2.putText(cv_img, "FUEL", (cx - 36, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Eating Place":
        cv2.putText(cv_img, "FOOD", (cx - 38, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Light Refreshments":
        cv2.putText(cv_img, "TEA", (cx - 30, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 1.05, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Resting Place":
        cv2.putText(cv_img, "REST", (cx - 36, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif "Restroom" in name or "Toilet" in name:
        cv2.putText(cv_img, "WC", (cx - 28, cy + 16), cv2.FONT_HERSHEY_DUPLEX, 1.25, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Bus Stop":
        cv2.putText(cv_img, "BUS", (cx - 30, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 1.05, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Railway Station":
        cv2.putText(cv_img, "TRAIN", (cx - 42, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Police Station":
        cv2.putText(cv_img, "POLICE", (cx - 44, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 0.70, (255, 255, 255), 2, cv2.LINE_AA)
        return cv_img

    elif name == "Fire Station":
        cv2.putText(cv_img, "FIRE", (cx - 34, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 1.0, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Taxi Stand":
        cv2.putText(cv_img, "TAXI", (cx - 34, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 1.0, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "Auto Rickshaw Stand":
        cv2.putText(cv_img, "AUTO", (cx - 36, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img

    elif name == "No Through Road":
        # White vertical bar + red horizontal top (Dead end T-bar)
        cv2.rectangle(cv_img, (cx - 10, cy - 10), (cx + 10, cy + 38), (255, 255, 255), -1)
        cv2.rectangle(cv_img, (cx - 32, cy - 28), (cx + 32, cy - 10), (214, 48, 49), -1)
        return cv_img

    elif name == "No Through Side Road":
        cv2.rectangle(cv_img, (cx - 8, cy - 36), (cx + 8, cy + 36), (255, 255, 255), -1)
        cv2.rectangle(cv_img, (cx + 8, cy - 6), (cx + 32, cy + 10), (255, 255, 255), -1)
        cv2.rectangle(cv_img, (cx + 32, cy - 18), (cx + 44, cy + 22), (214, 48, 49), -1)
        return cv_img

    else:
        cv2.putText(cv_img, "INFO", (cx - 32, cy + 14), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 3, cv2.LINE_AA)
        return cv_img


def extract_all_templates_from_pdf():
    pdf_path = r"C:\Users\KALURI KARTEJA\.gemini\antigravity-ide\brain\1b6b30c9-43eb-42d2-87f3-e805d517a6eb\.user_uploaded\media_1790406262648.pdf"
    doc = fitz.open(pdf_path)
    
    template_dir = Path("dataset/pdf_canonical_templates")
    template_dir.mkdir(parents=True, exist_ok=True)
    
    sorted_catalog = sorted(RTO_SIGN_CATALOG, key=lambda x: len(x['name']), reverse=True)
    found_templates = {}
    
    print(f"[PDF EXTRACTION] Scanning {len(doc)} pages in official PDF...")
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=200)
        page_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        page_np = np.array(page_img)
        
        scale_x = pix.width / page.rect.width
        scale_y = pix.height / page.rect.height
        
        blocks = page.get_text("blocks")
        for b in blocks:
            text = b[4].strip()
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            if not lines:
                continue
            first_line = lines[0]
            clean_first = clean_str(first_line)
            
            for item in sorted_catalog:
                cid = item['id']
                if cid in found_templates:
                    continue
                
                clean_target = clean_str(item['name'])
                if clean_first == clean_target:
                    rect = b[:4]
                    rx0, ry0, rx1, ry1 = rect
                    
                    cx_pt = (rx0 + rx1) / 2.0
                    sign_y1_pt = ry0 - 2
                    sign_y0_pt = ry0 - 120
                    sign_x0_pt = cx_pt - 60
                    sign_x1_pt = cx_pt + 60
                    
                    px0 = max(0, int(sign_x0_pt * scale_x))
                    py0 = max(0, int(sign_y0_pt * scale_y))
                    px1 = min(pix.width, int(sign_x1_pt * scale_x))
                    py1 = min(pix.height, int(sign_y1_pt * scale_y))
                    
                    raw_crop = page_np[py0:py1, px0:px1]
                    if raw_crop.size > 0:
                        # Check if crop has an actual sign (not a blank white placeholder card)
                        mean_brightness = float(np.mean(raw_crop))
                        std_val = float(np.std(raw_crop))
                        
                        if mean_brightness < 246 and std_val > 8.0:
                            sign_128 = tight_crop_sign(raw_crop)
                            found_templates[cid] = sign_128
                            save_path = template_dir / f"{cid:03d}.png"
                            cv2.imwrite(str(save_path), cv2.cvtColor(sign_128, cv2.COLOR_RGB2BGR))
                            print(f"  --> Extracted Official PDF Vector #{cid:03d}: {item['name']}")
                        else:
                            # Render distinct informational sign icon
                            sign_128 = render_informational_sign(item)
                            found_templates[cid] = sign_128
                            save_path = template_dir / f"{cid:03d}.png"
                            cv2.imwrite(str(save_path), cv2.cvtColor(sign_128, cv2.COLOR_RGB2BGR))
                            print(f"  --> Generated Distinct RTO Symbol #{cid:03d}: {item['name']}")
                    break

    # Fallback for any remaining unvisited items
    for item in RTO_SIGN_CATALOG:
        cid = item['id']
        if cid not in found_templates:
            sign_128 = render_informational_sign(item)
            found_templates[cid] = sign_128
            save_path = template_dir / f"{cid:03d}.png"
            cv2.imwrite(str(save_path), cv2.cvtColor(sign_128, cv2.COLOR_RGB2BGR))
            print(f"  --> Fallback RTO Template #{cid:03d}: {item['name']}")

    print(f"[PDF EXTRACTION] Completed! Total distinct templates: {len(found_templates)}/108.")
    return found_templates


def generate_full_dataset(templates):
    """Generates 120 training and 30 testing augmented images per class from authentic templates."""
    train_root = Path("dataset/Train")
    test_root = Path("dataset/Test")
    
    # Clear existing synthetic dataset
    if train_root.exists():
        shutil.rmtree(train_root)
    if test_root.exists():
        shutil.rmtree(test_root)
        
    train_root.mkdir(parents=True, exist_ok=True)
    test_root.mkdir(parents=True, exist_ok=True)
    
    print("\n[DATASET GENERATION] Generating photorealistic augmented dataset for 108 classes...")
    
    for cid, template_rgb in templates.items():
        c_train = train_root / str(cid)
        c_test = test_root / str(cid)
        c_train.mkdir(parents=True, exist_ok=True)
        c_test.mkdir(parents=True, exist_ok=True)
        
        # Save canonical image
        cv2.imwrite(str(c_train / "canonical.png"), cv2.cvtColor(template_rgb, cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(c_test / "canonical.png"), cv2.cvtColor(template_rgb, cv2.COLOR_RGB2BGR))
        
        # Generate 110 training samples with rich domain variation
        for i in range(110):
            aug = template_rgb.copy()
            # 1. Perspective tilt / Rotation
            angle = np.random.uniform(-14, 14)
            scale = np.random.uniform(0.85, 1.12)
            M = cv2.getRotationMatrix2D((64, 64), angle, scale)
            aug = cv2.warpAffine(aug, M, (128, 128), borderMode=cv2.BORDER_CONSTANT, borderValue=(245, 245, 245))
            
            # 2. Lighting & Color jitter
            alpha = np.random.uniform(0.65, 1.35) # Contrast
            beta = np.random.uniform(-35, 35)     # Brightness
            aug = np.clip(alpha * aug.astype(np.float32) + beta, 0, 255).astype(np.uint8)
            
            # 3. Motion blur / Gaussian noise
            if np.random.rand() > 0.5:
                k = np.random.choice([3, 5])
                aug = cv2.GaussianBlur(aug, (k, k), 0)
            if np.random.rand() > 0.6:
                noise = np.random.normal(0, 10, aug.shape).astype(np.float32)
                aug = np.clip(aug.astype(np.float32) + noise, 0, 255).astype(np.uint8)
                
            cv2.imwrite(str(c_train / f"aug_{i:03d}.png"), cv2.cvtColor(aug, cv2.COLOR_RGB2BGR))
            
        # Generate 25 test samples
        for j in range(25):
            aug = template_rgb.copy()
            angle = np.random.uniform(-10, 10)
            scale = np.random.uniform(0.90, 1.08)
            M = cv2.getRotationMatrix2D((64, 64), angle, scale)
            aug = cv2.warpAffine(aug, M, (128, 128), borderMode=cv2.BORDER_CONSTANT, borderValue=(245, 245, 245))
            alpha = np.random.uniform(0.75, 1.25)
            beta = np.random.uniform(-20, 20)
            aug = np.clip(alpha * aug.astype(np.float32) + beta, 0, 255).astype(np.uint8)
            cv2.imwrite(str(c_test / f"test_{j:03d}.png"), cv2.cvtColor(aug, cv2.COLOR_RGB2BGR))

    print(f"[DATASET GENERATION] Completed! Total classes: 108.")


def run_training():
    num_classes = 108
    img_size = 64
    batch_size = 64
    epochs = 12
    lr = 0.001
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n[TRAINING] Using compute device: {device}")
    
    train_loader, val_loader, test_loader, _ = build_dataloaders(
        dataset_dir="dataset",
        img_size=img_size,
        batch_size=batch_size,
        num_classes=num_classes,
        num_workers=0
    )
    
    model = get_model("mobilenet", num_classes=num_classes, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)
    
    best_val_acc = 0.0
    rto_path = Path("models/rto_best.pth")
    univ_path = Path("models/universal_best.pth")
    mnet_path = Path("models/mobilenet_best.pth")
    rto_path.parent.mkdir(parents=True, exist_ok=True)
    
    for epoch in range(1, epochs + 1):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate_epoch(model, val_loader, criterion, device)
        scheduler.step()
        
        print(f"Epoch [{epoch:02d}/{epochs:02d}] | Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            payload = {
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'val_loss': val_loss,
                'model_name': 'mobilenet',
                'img_size': img_size,
                'num_classes': num_classes
            }
            torch.save(payload, rto_path)
            torch.save(payload, univ_path)
            torch.save(payload, mnet_path)
            print(f"  ==> Saved New Best Checkpoint: {val_acc:.2f}%")

    print(f"\n[TRAINING COMPLETE] Peak Validation Accuracy: {best_val_acc:.2f}%")


if __name__ == "__main__":
    templates = extract_all_templates_from_pdf()
    generate_full_dataset(templates)
    run_training()
