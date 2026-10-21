"""
src/predict.py

Single Image and Video Frame Traffic Sign Inference Engine.

Designed specifically for seamless integration with downstream OpenCV real-time
laptop webcam application. Accepts image paths OR raw BGR NumPy frames from OpenCV.

Uses Test-Time Augmentation (TTA) by default: each ROI is passed through 6
augmented variants (brightness, contrast, rotation, zoom) and softmax scores are
averaged — directly bridging the domain gap between clean training data and noisy
webcam input without any retraining.

Returns:
- class_id (int): Predicted GTSRB Class ID
- class_name (str): Human-readable traffic sign title
- confidence_score (float): Averaged TTA probability (0.0 to 1.0)
- margin_score (float): Gap between top-1 and top-2 probabilities
- tta_variants (int): Number of TTA passes used
"""

import cv2
import torch
import torch.nn.functional as F
from PIL import Image
import numpy as np
import pandas as pd
from pathlib import Path
from torchvision import transforms

from src.model import get_model
from src.data_preprocessing import ApplyCLAHE


class TrafficSignPredictor:
    """Inference engine for real-time traffic sign classification with TTA."""

    def __init__(self, checkpoint_path="models/baseline_best.pth", dataset_dir="dataset"):
        self.checkpoint_path = Path(checkpoint_path)
        self.dataset_dir = Path(dataset_dir)
        self.device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))

        # Load Checkpoint
        if not self.checkpoint_path.exists():
            raise FileNotFoundError(f"Model checkpoint not found at {self.checkpoint_path}. Train model first!")

        print(f"[INFO] Loading inference model checkpoint from {self.checkpoint_path}...")
        checkpoint = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
        self.model_name = checkpoint.get('model_name', 'baseline')
        self.img_size = checkpoint.get('img_size', 32)

        # Auto-detect num_classes from state_dict to prevent tensor shape mismatch
        if 'num_classes' in checkpoint:
            self.num_classes = checkpoint['num_classes']
        else:
            state_dict = checkpoint['model_state_dict']
            last_weight_key = [k for k in state_dict.keys() if 'weight' in k][-1]
            self.num_classes = state_dict[last_weight_key].shape[0]

        # Load Architecture & Weights
        self.model = get_model(self.model_name, num_classes=self.num_classes).to(self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()

        # Class Mapping Dictionary
        self.class_names = self._load_class_names()

        # ── Base inference transform (deterministic with CLAHE) ───────────────
        self.base_transform = transforms.Compose([
            ApplyCLAHE(),
            transforms.Resize((self.img_size, self.img_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        # ── TTA transform bank — simulates webcam/print/screen variations ─────
        self.tta_transforms = [
            # 1. Original with CLAHE (same as base)
            self.base_transform,
            # 2. Slightly brighter
            transforms.Compose([
                ApplyCLAHE(),
                transforms.Resize((self.img_size, self.img_size)),
                transforms.ColorJitter(brightness=0.35),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ]),
            # 3. Lower contrast
            transforms.Compose([
                ApplyCLAHE(),
                transforms.Resize((self.img_size, self.img_size)),
                transforms.ColorJitter(contrast=0.35),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ]),
            # 4. Small rotation −8°
            transforms.Compose([
                ApplyCLAHE(),
                transforms.Resize((self.img_size, self.img_size)),
                transforms.RandomRotation(degrees=(-8, -8)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ]),
            # 5. Small rotation +8°
            transforms.Compose([
                ApplyCLAHE(),
                transforms.Resize((self.img_size, self.img_size)),
                transforms.RandomRotation(degrees=(8, 8)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ]),
            # 6. Slight zoom-in
            transforms.Compose([
                ApplyCLAHE(),
                transforms.Resize((int(self.img_size * 1.12), int(self.img_size * 1.12))),
                transforms.CenterCrop(self.img_size),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ]),
        ]

        # Keep legacy .transform alias for any external code referencing it
        self.transform = self.base_transform

        print(f"[INFO] TTA enabled: {len(self.tta_transforms)} augmentation variants per inference pass.")

    def _load_class_names(self):
        from src.driver_alert import GTSRB_SAFETY_METADATA
        names = {i: GTSRB_SAFETY_METADATA.get(i, {}).get('name', f"Class_{i}") for i in range(self.num_classes)}
        for fname in ["labels.csv", "signnames.csv", "signnames_universal.csv"]:
            csv_path = self.dataset_dir / fname
            if not csv_path.exists():
                csv_path = Path("training data") / fname
            if csv_path.exists():
                df = pd.read_csv(csv_path)
                name_col = 'Name' if 'Name' in df.columns else ('SignName' if 'SignName' in df.columns else None)
                if name_col and 'ClassId' in df.columns:
                    for _, row in df.iterrows():
                        names[int(row['ClassId'])] = str(row[name_col])
                    break
        return names

    def _to_pil(self, image_input):
        """Convert any supported input type to a PIL RGB image."""
        if isinstance(image_input, np.ndarray):
            rgb = cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB)
            return Image.fromarray(rgb)
        elif isinstance(image_input, (str, Path)):
            return Image.open(image_input).convert('RGB')
        elif isinstance(image_input, Image.Image):
            return image_input.convert('RGB')
        else:
            raise TypeError(f"Unsupported image input type: {type(image_input)}")

    def predict(self, image_input, use_tta=True):
        """
        Classifies a single traffic sign image or OpenCV BGR video frame.

        Uses Test-Time Augmentation (TTA) by default: runs the image through
        multiple augmented variants and averages softmax probabilities, which
        significantly improves real-world robustness against lighting, angle,
        and screen/print colour-shift variations.

        Args:
            image_input: filepath str/Path, PIL Image, or OpenCV BGR np.ndarray.
            use_tta (bool): If True, averages predictions over all TTA variants.

        Returns:
            dict with class_id, class_name, confidence_score,
            confidence_percentage, margin_score, and tta_variants count.
        """
        pil_img = self._to_pil(image_input)
        transforms_to_use = self.tta_transforms if use_tta else [self.base_transform]

        # Stack all TTA variants into one batch → single forward pass (efficient)
        tensors  = torch.stack([t(pil_img) for t in transforms_to_use]).to(self.device)

        with torch.no_grad():
            outputs   = self.model(tensors)          # (N_tta, num_classes)
            probs     = F.softmax(outputs, dim=1)    # (N_tta, num_classes)
            avg_probs = probs.mean(dim=0)            # (num_classes,) — TTA average

        top2_values, top2_indices = torch.topk(avg_probs, 2)

        class_id    = top2_indices[0].item()
        confidence  = top2_values[0].item()
        second_conf = top2_values[1].item()
        margin      = confidence - second_conf
        class_name  = self.class_names.get(class_id, f"Class_{class_id}")

        return {
            'class_id':              class_id,
            'class_name':            class_name,
            'confidence_score':      confidence,
            'confidence_percentage': round(confidence * 100.0, 2),
            'margin_score':          round(margin, 4),
            'tta_variants':          len(transforms_to_use),
        }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Traffic Sign Inference Engine")
    parser.add_argument("--image",  type=str,   default=None,  help="Path to single image for prediction")
    parser.add_argument("--model",  type=str,   default="models/universal_best.pth", help="Checkpoint model path")
    parser.add_argument("--webcam", action="store_true", help="Launch real-time webcam recognition engine")
    parser.add_argument("--camera", type=int,   default=0,    help="Webcam camera index (default: 0)")
    parser.add_argument("--conf",   type=float, default=0.60,  help="Confidence threshold (default: 0.60)")
    parser.add_argument("--no-tta", action="store_true",       help="Disable Test-Time Augmentation")
    args = parser.parse_args()

    print("=" * 60)
    print("        TRAFFIC SIGN INFERENCE & WEBCAM ENGINE             ")
    print("=" * 60)

    if args.webcam:
        from src.webcam_recognition import TrafficSignWebcamEngine
        engine = TrafficSignWebcamEngine(
            checkpoint_path=args.model if Path(args.model).exists() else "models/baseline_best.pth",
            camera_id=args.camera,
            confidence_threshold=args.conf
        )
        engine.run()
        return

    ckpt = args.model if Path(args.model).exists() else "models/baseline_best.pth"
    try:
        predictor = TrafficSignPredictor(ckpt)
        print("[SUCCESS] Predictor engine initialized successfully!")

        if args.image:
            res = predictor.predict(args.image, use_tta=not args.no_tta)
            print(f"\nPrediction for: {args.image}")
            print(f"  Class ID     : {res['class_id']}")
            print(f"  Sign Name    : {res['class_name']}")
            print(f"  Confidence   : {res['confidence_percentage']}%")
            print(f"  Margin       : {res['margin_score']*100:.1f}pp")
            print(f"  TTA variants : {res['tta_variants']}\n")
    except Exception as e:
        print(f"[INFO] Demo predictor initialization notice: {e}")


if __name__ == "__main__":
    main()
