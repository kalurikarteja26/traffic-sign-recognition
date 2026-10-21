"""
src/dataset_explorer.py

Dataset Exploration, Analysis, and Integrity Checking Tool.
Performs quantitative audit on GTSRB dataset, class distribution,
image dimension checks, corrupt image detection, and sample visualizations.
"""

import os
import cv2
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image
from pathlib import Path

# Set plotting style
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')


class DatasetExplorer:
    """Exploratory Data Analysis and Validation Tool for Traffic Sign Dataset."""

    def __init__(self, dataset_dir="dataset"):
        self.dataset_dir = Path(dataset_dir)
        self.train_dir = self.dataset_dir / "Train"
        self.test_dir = self.dataset_dir / "Test"
        self.signnames_csv = self.dataset_dir / "signnames.csv"
        self.class_names = self._load_class_names()

    def _load_class_names(self):
        """Load class ID to sign name mapping."""
        if self.signnames_csv.exists():
            df = pd.read_csv(self.signnames_csv)
            return dict(zip(df['ClassId'], df['SignName']))
        else:
            return {i: f"Class_{i}" for i in range(43)}

    def explore_counts(self):
        """Count total images and images per class across Train and Test splits."""
        train_counts = {}
        test_counts = {}

        for c in range(43):
            train_cls_dir = self.train_dir / str(c)
            test_cls_dir = self.test_dir / str(c)
            train_counts[c] = len(list(train_cls_dir.glob("*.*"))) if train_cls_dir.exists() else 0
            test_counts[c] = len(list(test_cls_dir.glob("*.*"))) if test_cls_dir.exists() else 0

        total_train = sum(train_counts.values())
        total_test = sum(test_counts.values())

        print("=" * 60)
        print("                DATASET SUMMARY AUDIT                      ")
        print("=" * 60)
        print(f"Total Training Images   : {total_train:,}")
        print(f"Total Testing Images    : {total_test:,}")
        print(f"Total Dataset Images    : {total_train + total_test:,}")
        print(f"Total Classes           : {len(train_counts)}")
        print(f"Min Images per Class    : {min(train_counts.values())} (Class {min(train_counts, key=train_counts.get)})")
        print(f"Max Images per Class    : {max(train_counts.values())} (Class {max(train_counts, key=train_counts.get)})")
        print("-" * 60)

        return train_counts, test_counts

    def check_image_dimensions_and_integrity(self):
        """Inspect image shapes, resolution ranges, color channels, and check for corrupted files."""
        widths = []
        heights = []
        channels = []
        corrupted_files = []

        print("[INFO] Auditing image integrity and dimensions across dataset...")
        image_paths = list(self.train_dir.rglob("*.*")) + list(self.test_dir.rglob("*.*"))

        for img_path in image_paths:
            if img_path.suffix.lower() not in ['.png', '.jpg', '.jpeg', '.ppm', '.bmp']:
                continue
            try:
                with Image.open(img_path) as img:
                    img.verify()  # Verify integrity
                # Reopen to read dimensions
                with Image.open(img_path) as img:
                    w, h = img.size
                    c = len(img.getbands())
                    widths.append(w)
                    heights.append(h)
                    channels.append(c)
            except Exception as e:
                corrupted_files.append((str(img_path), str(e)))

        print("\n" + "=" * 60)
        print("              IMAGE DIMENSION & INTEGRITY AUDIT            ")
        print("=" * 60)
        print(f"Verified Images Audited : {len(widths):,}")
        print(f"Corrupted/Invalid Files : {len(corrupted_files)}")
        if widths:
            print(f"Min Dimension (W x H)   : {min(widths)} x {min(heights)} px")
            print(f"Max Dimension (W x H)   : {max(widths)} x {max(heights)} px")
            print(f"Mean Dimension (W x H)  : {np.mean(widths):.1f} x {np.mean(heights):.1f} px")
            print(f"Median Dimension (W x H): {np.median(widths):.1f} x {np.median(heights):.1f} px")
            print(f"Unique Channels         : {set(channels)} (Expected RGB = 3)")
        print("-" * 60)

        if corrupted_files:
            print("[WARNING] Found corrupted files:")
            for cf, err in corrupted_files:
                print(f"  - {cf}: {err}")

        return widths, heights, corrupted_files

    def plot_class_distribution(self, save_path="results/class_distribution.png"):
        """Generate and save class distribution bar chart highlighting imbalance."""
        train_counts, test_counts = self.explore_counts()

        df = pd.DataFrame({
            'ClassId': list(train_counts.keys()),
            'TrainCount': list(train_counts.values()),
            'TestCount': list(test_counts.values()),
            'SignName': [self.class_names.get(i, f"Class {i}") for i in train_counts.keys()]
        }).sort_values(by='ClassId')

        fig, ax = plt.subplots(figsize=(14, 7))
        bar_width = 0.4
        x = np.arange(len(df))

        ax.bar(x - bar_width/2, df['TrainCount'], width=bar_width, label='Train Samples', color='#3498db')
        ax.bar(x + bar_width/2, df['TestCount'], width=bar_width, label='Test Samples', color='#e74c3c')

        ax.set_xlabel('Class ID / Traffic Sign Name', fontsize=12, fontweight='bold')
        ax.set_ylabel('Number of Images', fontsize=12, fontweight='bold')
        ax.set_title('GTSRB Class Distribution & Class Imbalance Analysis', fontsize=14, fontweight='bold')
        ax.set_xticks(x[::2])
        ax.set_xticklabels(df['ClassId'][::2])
        ax.legend(fontsize=11)
        plt.tight_layout()

        os.makedirs(Path(save_path).parent, exist_ok=True)
        plt.savefig(save_path, dpi=300)
        plt.close()
        print(f"[SUCCESS] Class distribution chart saved to {save_path}")

    def plot_sample_grid(self, samples_per_class=1, save_path="results/sample_images.png"):
        """Generate sample visual grid showing traffic sign examples from classes."""
        fig, axes = plt.subplots(7, 7, figsize=(15, 15))
        axes = axes.ravel()

        for c in range(43):
            cls_dir = self.train_dir / str(c)
            img_paths = list(cls_dir.glob("*.*"))
            if img_paths:
                img = cv2.imread(str(img_paths[0]))
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                axes[c].imshow(img)
                name = self.class_names.get(c, f"Class {c}")
                if len(name) > 18:
                    name = name[:16] + ".."
                axes[c].set_title(f"[{c}] {name}", fontsize=8)
            axes[c].axis('off')

        # Turn off remaining empty subplots
        for i in range(43, 49):
            axes[i].axis('off')

        plt.suptitle("GTSRB Sample Traffic Sign Grid (43 Classes)", fontsize=16, fontweight='bold', y=0.98)
        plt.tight_layout()

        os.makedirs(Path(save_path).parent, exist_ok=True)
        plt.savefig(save_path, dpi=300)
        plt.close()
        print(f"[SUCCESS] Sample grid saved to {save_path}")


def main():
    explorer = DatasetExplorer()
    explorer.explore_counts()
    explorer.check_image_dimensions_and_integrity()
    explorer.plot_class_distribution()
    explorer.plot_sample_grid()


if __name__ == "__main__":
    main()
