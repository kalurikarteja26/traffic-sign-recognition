"""
src/train.py

Training Engine for Traffic Sign Classifier with Validation, Early Stopping,
Learning Rate Scheduling, Model Checkpointing, and Metric Logging.

Overfitting Mitigation Strategies Implemented:
1. Data Augmentation: Applied to training set via data_preprocessing.py.
2. Dropout (0.25 - 0.5): Deactivates random neurons during training passes.
3. Weight Decay (L2 Regularization): Penalizes large weight values (AdamW 1e-4).
4. Early Stopping: Monitors validation loss; terminates training if no improvement after 'patience' epochs.
5. Best Checkpoint Saving: Saves top-performing model weights based on peak validation accuracy.
"""

import os
import time
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from pathlib import Path
from tqdm import tqdm

from src.data_preprocessing import build_dataloaders
from src.model import get_model


class FocalLoss(nn.Module):
    """
    Multi-class Focal Loss to address severe class imbalance and penalize hard misclassifications.
    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    """
    def __init__(self, weight=None, gamma=2.0, reduction='mean', label_smoothing=0.0):
        super(FocalLoss, self).__init__()
        self.weight = weight
        self.gamma = gamma
        self.reduction = reduction
        self.label_smoothing = label_smoothing

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(
            inputs, targets,
            weight=self.weight,
            reduction='none',
            label_smoothing=self.label_smoothing
        )
        pt = torch.exp(-ce_loss)
        focal_loss = ((1.0 - pt) ** self.gamma) * ce_loss

        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        return focal_loss


class EarlyStopping:
    """Early Stopping monitor to halt training when validation loss stops improving."""

    def __init__(self, patience=5, min_delta=0.001):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_val_loss = float('inf')
        self.early_stop = False

    def __call__(self, val_loss):
        if val_loss < (self.best_val_loss - self.min_delta):
            self.best_val_loss = val_loss
            self.counter = 0
        else:
            self.counter += 1
            print(f"[EARLY STOPPING] No improvement for {self.counter}/{self.patience} epochs.")
            if self.counter >= self.patience:
                self.early_stop = True


def mixup_data(x, y, alpha=0.2, device='cpu'):
    """
    MixUp augmentation: blends two training samples together.
    Forces the model to learn from interpolated examples rather than
    memorising exact pixel patterns, dramatically reducing overfitting.
    """
    if alpha > 0:
        lam = np.random.beta(alpha, alpha)
    else:
        lam = 1.0
    batch_size = x.size(0)
    index = torch.randperm(batch_size).to(device)
    mixed_x = lam * x + (1 - lam) * x[index]
    y_a, y_b = y, y[index]
    return mixed_x, y_a, y_b, lam


def mixup_criterion(criterion, pred, y_a, y_b, lam):
    """Computes blended cross-entropy loss for MixUp-augmented batch."""
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)


def train_epoch(model, dataloader, criterion, optimizer, device, use_mixup=True):
    """Executes single training pass over dataset with optional MixUp."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in tqdm(dataloader, desc="Training Batch", leave=False):
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()

        if use_mixup:
            mixed_images, labels_a, labels_b, lam = mixup_data(images, labels, alpha=0.2, device=device)
            outputs = model(mixed_images)
            loss = mixup_criterion(criterion, outputs, labels_a, labels_b, lam)
        else:
            outputs = model(images)
            loss = criterion(outputs, labels)

        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        # Accuracy is measured on the dominant label
        _, preds = torch.max(outputs, 1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    epoch_loss = running_loss / total
    epoch_acc  = (correct / total) * 100.0
    return epoch_loss, epoch_acc


def validate_epoch(model, dataloader, criterion, device):
    """Executes single evaluation pass over validation dataset."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in tqdm(dataloader, desc="Validation Batch", leave=False):
            images, labels = images.to(device), labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

    epoch_loss = running_loss / total
    epoch_acc = (correct / total) * 100.0
    return epoch_loss, epoch_acc


def plot_training_history(history, save_path="results/train_val_curves.png"):
    """Generates and saves training vs validation accuracy and loss curves."""
    epochs = range(1, len(history['train_loss']) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Loss Curve
    ax1.plot(epochs, history['train_loss'], 'b-o', label='Training Loss', linewidth=2)
    ax1.plot(epochs, history['val_loss'], 'r-s', label='Validation Loss', linewidth=2)
    ax1.set_title('Training vs Validation Loss', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Epoch', fontsize=12)
    ax1.set_ylabel('Loss (Cross-Entropy)', fontsize=12)
    ax1.legend(fontsize=11)
    ax1.grid(True)

    # Accuracy Curve
    ax2.plot(epochs, history['train_acc'], 'b-o', label='Training Accuracy (%)', linewidth=2)
    ax2.plot(epochs, history['val_acc'], 'r-s', label='Validation Accuracy (%)', linewidth=2)
    ax2.set_title('Training vs Validation Accuracy', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Epoch', fontsize=12)
    ax2.set_ylabel('Accuracy (%)', fontsize=12)
    ax2.legend(fontsize=11)
    ax2.grid(True)

    plt.tight_layout()
    os.makedirs(Path(save_path).parent, exist_ok=True)
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"[SUCCESS] Training history curves saved to {save_path}")


def train_model(model_name="efficientnet", epochs=40, batch_size=64, lr=5e-4, dataset_dir="dataset"):
    """Main training workflow runner."""
    # Determine Hardware Device
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"[HARDWARE] GPU Detected: {torch.cuda.get_device_name(0)}")
    elif torch.backends.mps.is_available():
        device = torch.device("mps")
        print("[HARDWARE] Apple Silicon GPU (MPS) Detected")
    else:
        device = torch.device("cpu")
        print("[HARDWARE] CPU Mode Active — training will be slow; consider reducing epochs.")

    # EfficientNet/MobileNet use 128px; baseline uses 64px
    if model_name.lower() == "baseline":
        img_size = 64
    else:
        img_size = 128

    # Load Data
    train_loader, val_loader, _, class_weights = build_dataloaders(
        dataset_dir=dataset_dir, img_size=img_size, batch_size=batch_size
    )

    # Instantiate Model
    model = get_model(model_name=model_name).to(device)

    # ── Loss: CrossEntropy with Label Smoothing (0.1) + class weights ────────
    # Label smoothing prevents the model becoming overconfident on training data,
    # forcing it to generalise to unseen webcam/screen/print variations.
    criterion = nn.CrossEntropyLoss(
        weight=class_weights.to(device),
        label_smoothing=0.10
    )
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    # ── Scheduler: CosineAnnealingWarmRestarts ────────────────────────────────
    # Periodically increases LR to escape sharp local minima, then decays again.
    # T_0=10 means the first restart happens at epoch 10.
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=10, T_mult=2, eta_min=1e-6
    )

    early_stopping = EarlyStopping(patience=8)

    best_val_acc = 0.0
    model_save_path = Path(f"models/{model_name.lower()}_best.pth")
    os.makedirs(model_save_path.parent, exist_ok=True)

    history = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}

    print("\n" + "=" * 65)
    print(f"  TRAINING: Model={model_name.upper()}, Epochs={epochs}, LR={lr}, ImgSize={img_size}")
    print(f"  MixUp: ON (alpha=0.2)  |  Label Smoothing: 0.10")
    print("=" * 65)
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device, use_mixup=True)
        val_loss, val_acc     = validate_epoch(model, val_loader, criterion, device)

        scheduler.step(epoch)  # CosineAnnealingWarmRestarts uses epoch count

        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['train_acc'].append(train_acc)
        history['val_acc'].append(val_acc)

        curr_lr = optimizer.param_groups[0]['lr']
        print(f"Epoch [{epoch:02d}/{epochs:02d}] | "
              f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}% | "
              f"LR: {curr_lr:.6f}")

        # Save Best Model Checkpoint
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                'epoch':                epoch,
                'model_state_dict':     model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc':              val_acc,
                'val_loss':             val_loss,
                'model_name':           model_name,
                'img_size':             img_size,
                'num_classes':          model.classifier[-1].out_features,
            }, model_save_path)
            print(f"  --> Checkpoint Saved: Peak Val Acc = {val_acc:.2f}% at {model_save_path}")

        # Check Early Stopping
        early_stopping(val_loss)
        if early_stopping.early_stop:
            print(f"[INFO] Early stopping triggered at Epoch {epoch}.")
            break

    total_duration = time.time() - start_time
    print("-" * 65)
    print(f"Training Complete! Time: {total_duration / 60:.2f} mins. Peak Val Acc: {best_val_acc:.2f}%")

    plot_training_history(history, save_path=f"results/{model_name.lower()}_curves.png")
    return model, history


if __name__ == "__main__":
    train_model(model_name="efficientnet", epochs=40, batch_size=32)
