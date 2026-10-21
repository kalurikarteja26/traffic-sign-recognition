"""
src/generate_universal_signs.py

Universal Traffic Sign Dataset Generator.
Renders clean vector geometries & photorealistic augmented image samples
for 9 international traffic signs missing from GTSRB:

- Class 43: No U-Turn ↩️
- Class 44: No Left Turn ↰
- Class 45: No Right Turn ↱
- Class 46: No Parking 🅿️
- Class 47: No Stopping 🚫
- Class 48: Railway Level Crossing 🚂
- Class 49: One Way ⬆️
- Class 50: Speed Bump 🐫
- Class 51: Hospital Zone 🏥

Saves samples into dataset/Train/43..51 and dataset/Test/43..51.
"""

import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# Target image resolution (high res template before augmentation)
CANVAS_SIZE = 128


def create_base_no_uturn():
    """Renders vector image for No U-Turn (Class 43)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='white')
    draw = ImageDraw.Draw(img)

    # Red Circle Border
    draw.ellipse([8, 8, 120, 120], fill='white', outline='#d63031', width=12)

    # Draw U-Turn Arrow (Black)
    # Vertical line down, curve bottom, vertical line up with arrowhead
    draw.line([75, 45, 75, 75], fill='black', width=9)
    draw.arc([45, 60, 75, 90], start=0, end=180, fill='black', width=9)
    draw.line([45, 55, 45, 75], fill='black', width=9)

    # Arrowhead pointing down on left stem
    points = [(37, 65), (45, 78), (53, 65)]
    draw.polygon(points, fill='black')

    # Red Slash Over Arrow
    draw.line([25, 25, 103, 103], fill='#d63031', width=11)
    return img


def create_base_no_left_turn():
    """Renders vector image for No Left Turn (Class 44)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='white')
    draw = ImageDraw.Draw(img)

    draw.ellipse([8, 8, 120, 120], fill='white', outline='#d63031', width=12)

    # Stem up & turn left
    draw.line([70, 85, 70, 55], fill='black', width=9)
    draw.line([70, 55, 45, 55], fill='black', width=9)
    # Arrowhead left
    draw.polygon([(47, 47), (35, 55), (47, 63)], fill='black')

    # Red Slash
    draw.line([25, 25, 103, 103], fill='#d63031', width=11)
    return img


def create_base_no_right_turn():
    """Renders vector image for No Right Turn (Class 45)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='white')
    draw = ImageDraw.Draw(img)

    draw.ellipse([8, 8, 120, 120], fill='white', outline='#d63031', width=12)

    # Stem up & turn right
    draw.line([58, 85, 58, 55], fill='black', width=9)
    draw.line([58, 55, 83, 55], fill='black', width=9)
    # Arrowhead right
    draw.polygon([(81, 47), (93, 55), (81, 63)], fill='black')

    # Red Slash
    draw.line([25, 25, 103, 103], fill='#d63031', width=11)
    return img


def create_base_no_parking():
    """Renders vector image for No Parking (Class 46)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='#0984e3')
    draw = ImageDraw.Draw(img)

    # Outer Red Ring
    draw.ellipse([6, 6, 122, 122], outline='#d63031', width=14)

    # White Letter 'P'
    draw.line([52, 40, 52, 88], fill='white', width=10)
    draw.arc([52, 40, 82, 66], start=270, end=90, fill='white', width=9)

    # Red Slash
    draw.line([22, 22, 106, 106], fill='#d63031', width=12)
    return img


def create_base_no_stopping():
    """Renders vector image for No Stopping / No Standing (Class 47)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='#0984e3')
    draw = ImageDraw.Draw(img)

    draw.ellipse([6, 6, 122, 122], outline='#d63031', width=14)

    # Red Cross (X)
    draw.line([22, 22, 106, 106], fill='#d63031', width=12)
    draw.line([22, 106, 106, 22], fill='#d63031', width=12)
    return img


def create_base_railway_crossing():
    """Renders vector image for Railway Crossing (Class 48)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='white')
    draw = ImageDraw.Draw(img)

    # Yellow Warning Triangle
    triangle_pts = [(64, 12), (12, 116), (116, 116)]
    draw.polygon(triangle_pts, fill='#f1c40f', outline='#d63031')

    # Black Locomotive Train Icon / Cross
    draw.line([44, 48, 84, 88], fill='black', width=8)
    draw.line([44, 88, 84, 48], fill='black', width=8)
    draw.rectangle([50, 92, 78, 100], fill='black')
    return img


def create_base_one_way():
    """Renders vector image for One Way (Class 49)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='#0984e3')
    draw = ImageDraw.Draw(img)

    # White Border
    draw.rectangle([6, 6, 122, 122], outline='white', width=4)

    # Large Upward White Arrow
    draw.line([64, 98, 64, 40], fill='white', width=16)
    draw.polygon([(64, 20), (40, 46), (88, 46)], fill='white')
    return img


def create_base_speed_bump():
    """Renders vector image for Speed Bump (Class 50)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='white')
    draw = ImageDraw.Draw(img)

    # Warning Triangle with Red Border
    draw.polygon([(64, 10), (10, 116), (118, 116)], fill='white', outline='#e74c3c')

    # Double Bump Silhouette
    draw.arc([36, 75, 64, 95], start=180, end=0, fill='black', width=8)
    draw.arc([64, 75, 92, 95], start=180, end=0, fill='black', width=8)
    draw.line([25, 95, 103, 95], fill='black', width=6)
    return img


def create_base_hospital():
    """Renders vector image for Hospital Zone (Class 51)."""
    img = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), color='#2980b9')
    draw = ImageDraw.Draw(img)

    draw.rectangle([6, 6, 122, 122], outline='white', width=4)

    # White 'H' Letter
    draw.line([44, 38, 44, 90], fill='white', width=12)
    draw.line([84, 38, 84, 90], fill='white', width=12)
    draw.line([44, 64, 84, 64], fill='white', width=12)
    return img


# Base generators dictionary
BASE_GENERATORS = {
    43: create_base_no_uturn,
    44: create_base_no_left_turn,
    45: create_base_no_right_turn,
    46: create_base_no_parking,
    47: create_base_no_stopping,
    48: create_base_railway_crossing,
    49: create_base_one_way,
    50: create_base_speed_bump,
    51: create_base_hospital
}


def apply_augmentations(pil_img, count=250):
    """
    Applies realistic photorealistic augmentations to base PIL image.
    Generates variations in angle, lighting, resolution, and blur.
    """
    augmented_list = []
    base_np = np.array(pil_img)

    for i in range(count):
        img_cv = base_np.copy()

        # 1. Random Rotation (-15 to +15 deg)
        angle = np.random.uniform(-15, 15)
        M_rot = cv2.getRotationMatrix2D((CANVAS_SIZE // 2, CANVAS_SIZE // 2), angle, 1.0)
        img_cv = cv2.warpAffine(img_cv, M_rot, (CANVAS_SIZE, CANVAS_SIZE), borderMode=cv2.BORDER_REFLECT)

        # 2. Random Perspective Warp
        pts1 = np.float32([[0, 0], [CANVAS_SIZE, 0], [0, CANVAS_SIZE], [CANVAS_SIZE, CANVAS_SIZE]])
        dx = np.random.uniform(-8, 8, 4)
        dy = np.random.uniform(-8, 8, 4)
        pts2 = np.float32([
            [0 + dx[0], 0 + dy[0]],
            [CANVAS_SIZE + dx[1], 0 + dy[1]],
            [0 + dx[2], CANVAS_SIZE + dy[2]],
            [CANVAS_SIZE + dx[3], CANVAS_SIZE + dy[3]]
        ])
        M_persp = cv2.getPerspectiveTransform(pts1, pts2)
        img_cv = cv2.warpPerspective(img_cv, M_persp, (CANVAS_SIZE, CANVAS_SIZE), borderMode=cv2.BORDER_REFLECT)

        # 3. Brightness & Contrast Adjustment
        alpha = np.random.uniform(0.65, 1.35)  # Contrast
        beta = np.random.randint(-35, 35)      # Brightness
        img_cv = cv2.convertScaleAbs(img_cv, alpha=alpha, beta=beta)

        # 4. Blur / Sharpen
        if np.random.rand() > 0.5:
            k = np.random.choice([3, 5])
            img_cv = cv2.GaussianBlur(img_cv, (k, k), 0)

        # 5. Gaussian Noise
        if np.random.rand() > 0.4:
            noise = np.random.normal(0, np.random.uniform(5, 15), img_cv.shape).astype(np.int16)
            img_cv = np.clip(img_cv.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # 6. Resize simulation (downscale & upscale to simulate distance/resolution variations)
        target_res = np.random.randint(24, 96)
        img_small = cv2.resize(img_cv, (target_res, target_res), interpolation=cv2.INTER_AREA)
        img_cv = cv2.resize(img_small, (CANVAS_SIZE, CANVAS_SIZE), interpolation=cv2.INTER_CUBIC)

        augmented_list.append(Image.fromarray(img_cv))

    return augmented_list


def generate_all_universal_classes(dataset_dir="dataset"):
    """Generates train & test datasets for classes 43 to 51."""
    dataset_path = Path(dataset_dir)
    train_dir = dataset_path / "Train"
    test_dir = dataset_path / "Test"

    print("=" * 65)
    print("      GENERATING UNIVERSAL TRAFFIC SIGN DATASET (CLASSES 43-51)     ")
    print("=" * 65)

    for class_id, generator_fn in BASE_GENERATORS.items():
        cls_train_dir = train_dir / str(class_id)
        cls_test_dir = test_dir / str(class_id)

        cls_train_dir.mkdir(parents=True, exist_ok=True)
        cls_test_dir.mkdir(parents=True, exist_ok=True)

        base_img = generator_fn()

        # Generate 250 Train images and 50 Test images
        train_imgs = apply_augmentations(base_img, count=250)
        test_imgs = apply_augmentations(base_img, count=50)

        for idx, img in enumerate(train_imgs):
            img.save(cls_train_dir / f"{idx:05d}.png")

        for idx, img in enumerate(test_imgs):
            img.save(cls_test_dir / f"{idx:05d}.png")

        print(f"[SUCCESS] Class {class_id:02d}: Generated {len(train_imgs)} Train & {len(test_imgs)} Test samples.")

    print("-" * 65)
    print(f"[COMPLETE] Universal signs dataset populated under {dataset_path.resolve()}")


if __name__ == "__main__":
    generate_all_universal_classes()
