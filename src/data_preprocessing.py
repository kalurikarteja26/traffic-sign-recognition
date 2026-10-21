"""
src/data_preprocessing.py

Data Preprocessing, Augmentation Pipeline, Dataset Loader, and Train/Val/Test Splitter.

Detailed Rationale:
1. Resizing (32x32 / 128x128): Converts raw images of varying sizes (15x15 to 250x250) into
   uniform tensor dimensions required by convolutional layers.
2. Pixel Normalization (ImageNet mean & std): Centers pixel intensities around zero and scales variance
   to 1.0, enabling smooth gradient propagation and preventing exploding gradients.
3. Label Encoding (0..42): Maps class subfolders directly to integer target indices for CrossEntropyLoss.
4. Safe Augmentation vs Unsafe Transforms:
   - SAFE: Rotation (-10 to +10 deg), subtle translation (+-8%), zoom (0.95-1.05x), brightness/contrast jitter.
   - UNSAFE: Horizontal/Vertical flips are FORBIDDEN because directional signs (Turn Left/Right)
     and numbers/text in speed limits change semantic meaning when mirrored or flipped!
"""

import os
import cv2
# pyrefly: ignore [missing-import]
import torch
from PIL import Image
from pathlib import Path
import pandas as pd
import numpy as np
# pyrefly: ignore [missing-import]
from torch.utils.data import Dataset, DataLoader, Subset
# pyrefly: ignore [missing-import]
from torchvision import transforms
from sklearn.model_selection import train_test_split


class GTSRBDataset(Dataset):
    """Custom PyTorch Dataset for Universal Traffic Sign Dataset (52 classes)."""

    def __init__(self, root_dir, transform=None, num_classes=52):
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.num_classes = num_classes
        self.image_paths = []
        self.labels = []

        # Load images from class subdirectories (0..51)
        for class_id in range(num_classes):
            class_dir = self.root_dir / str(class_id)
            if class_dir.exists():
                for img_path in class_dir.glob("*.*"):
                    if img_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.ppm', '.bmp']:
                        self.image_paths.append(img_path)
                        self.labels.append(class_id)

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        label = self.labels[idx]

        # Load RGB image
        image = Image.open(img_path).convert('RGB')

        if self.transform:
            image = self.transform(image)

        return image, label


class ApplyCLAHE:
    """Equalizes luminance channel in LAB color space to handle dark, shadowed, or washed-out signs."""
    def __init__(self, clip_limit=2.0, tile_grid_size=(4, 4)):
        self.clip_limit = clip_limit
        self.tile_grid_size = tile_grid_size

    def __call__(self, img):
        np_img = np.array(img)
        lab = cv2.cvtColor(np_img, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=self.clip_limit, tileGridSize=self.tile_grid_size)
        l = clahe.apply(l)
        lab = cv2.merge((l, a, b))
        return Image.fromarray(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB))


def get_data_transforms(img_size=128):
    """
    Construct training (with safe augmentations + CLAHE) and validation/testing transforms.

    Args:
        img_size (int): Resolution to resize images (default: 128 for rich feature retention).
    """
    train_transform = transforms.Compose([
        ApplyCLAHE(),
        transforms.Resize((img_size, img_size)),
        transforms.RandomRotation(degrees=15),
        transforms.RandomAffine(degrees=0, translate=(0.10, 0.10), scale=(0.90, 1.10)),
        transforms.RandomPerspective(distortion_scale=0.3, p=0.4),
        transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
        transforms.ColorJitter(brightness=0.4, contrast=0.4, saturation=0.3, hue=0.05),
        transforms.RandomGrayscale(p=0.05),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        ),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.15), value=0)
    ])

    # Deterministic Validation & Test Pipeline (NO stochastic augmentation, but WITH CLAHE)
    val_test_transform = transforms.Compose([
        ApplyCLAHE(),
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    return train_transform, val_test_transform


def build_dataloaders(dataset_dir="dataset", img_size=128, batch_size=64, val_split=0.15, num_workers=0, num_classes=52):
    """
    Creates stratified Train, Validation, and Test PyTorch DataLoaders.

    Args:
        dataset_dir (str): Path to dataset directory containing Train/ and Test/.
        img_size (int): Target image width and height (default: 128).
        batch_size (int): Mini-batch size.
        val_split (float): Fraction of training set reserved for validation (e.g. 0.15 for 85/15 split).
        num_workers (int): DataLoader worker threads.
        num_classes (int): Total target classes (52).

    Returns:
        train_loader, val_loader, test_loader, class_weights
    """
    dataset_path = Path(dataset_dir)
    train_dir = dataset_path / "Train"
    if not train_dir.exists() or len(list(train_dir.glob("*"))) == 0:
        for candidate in ["DATA", "train", "Data", "DATASET"]:
            c_path = dataset_path / candidate
            if c_path.exists() and len(list(c_path.glob("*"))) > 0:
                train_dir = c_path
                break

    test_dir = dataset_path / "Test"
    if not test_dir.exists() or len(list(test_dir.glob("*"))) == 0:
        for candidate in ["TEST", "test", "Test"]:
            c_path = dataset_path / candidate
            if c_path.exists() and len(list(c_path.glob("*"))) > 0:
                test_dir = c_path
                break

    train_transform, val_test_transform = get_data_transforms(img_size=img_size)

    # Instantiate full training dataset
    full_train_dataset = GTSRBDataset(train_dir, transform=train_transform, num_classes=num_classes)
    val_base_dataset = GTSRBDataset(train_dir, transform=val_test_transform, num_classes=num_classes)
    test_dataset = GTSRBDataset(test_dir, transform=val_test_transform, num_classes=num_classes)

    if len(full_train_dataset) == 0:
        raise FileNotFoundError(
            f"No training image files found in '{train_dir}'."
        )

    targets = full_train_dataset.labels

    # Stratified split to maintain exact class proportions in train & val
    train_indices, val_indices = train_test_split(
        np.arange(len(targets)),
        test_size=val_split,
        stratify=targets,
        random_state=42
    )

    train_subset = Subset(full_train_dataset, train_indices)
    val_subset = Subset(val_base_dataset, val_indices)

    # DataLoader creation
    train_loader = DataLoader(
        train_subset, batch_size=batch_size, shuffle=True,
        num_workers=num_workers, pin_memory=True
    )
    val_loader = DataLoader(
        val_subset, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=True
    )
    test_loader = DataLoader(
        test_dataset, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=True
    )

    # Compute class weights for loss function class imbalance mitigation
    class_counts = np.bincount(np.array(targets)[train_indices], minlength=num_classes)
    total_samples = len(train_indices)
    class_weights = total_samples / (float(num_classes) * class_counts + 1e-6)
    class_weights_tensor = torch.FloatTensor(class_weights)


    print(f"[INFO] DataLoaders Built Successfully (Resolution: {img_size}x{img_size}, Batch Size: {batch_size}):")
    print(f"  - Training Samples   : {len(train_subset):,}")
    print(f"  - Validation Samples : {len(val_subset):,}")
    print(f"  - Testing Samples    : {len(test_dataset):,}")

    return train_loader, val_loader, test_loader, class_weights_tensor


if __name__ == "__main__":
    t_tr, v_tr = get_data_transforms(32)
    print("[SUCCESS] Data preprocessing and transform definitions verified.")
