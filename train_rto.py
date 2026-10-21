"""
train_rto.py

Training Engine for the 108-Class Official Indian RTO Traffic Signs Model.
Trains a fine-tuned MobileNetV2 Transfer Learning classifier on all 108 classes
from the official RTO Traffic Signs Reference Chart.

Saves checkpoints to:
- models/rto_best.pth
- models/universal_best.pth
- models/mobilenet_best.pth
"""

import os
import time
import torch
import torch.nn as nn
import torch.optim as optim
from pathlib import Path

from src.data_preprocessing import build_dataloaders
from src.model import get_model
from src.train import EarlyStopping, FocalLoss, train_epoch, validate_epoch


def train_rto_model(epochs=8, batch_size=64, lr=0.001, dataset_dir="dataset", model_name="mobilenet", img_size=64):
    if hasattr(os, 'cpu_count'):
        torch.set_num_threads(min(8, os.cpu_count() or 4))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[HARDWARE] Active Compute Device: {device} (Threads: {torch.get_num_threads()})")

    num_classes = 108

    # Load 108-Class DataLoaders
    train_loader, val_loader, test_loader, class_weights = build_dataloaders(
        dataset_dir=dataset_dir,
        img_size=img_size,
        batch_size=batch_size,
        num_classes=num_classes,
        num_workers=0
    )

    # Instantiate Model Architecture (MobileNetV2 Transfer Learning)
    model = get_model(model_name=model_name, num_classes=num_classes, pretrained=True).to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    early_stopping = EarlyStopping(patience=5)

    best_val_acc = 0.0
    rto_save_path = Path("models/rto_best.pth")
    universal_save_path = Path("models/universal_best.pth")
    mobilenet_save_path = Path("models/mobilenet_best.pth")
    os.makedirs(rto_save_path.parent, exist_ok=True)

    history = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}

    print("\n" + "=" * 70)
    print(f"   STARTING 108-CLASS RTO TRAFFIC SIGN MODEL TRAINING")
    print(f"   Architecture: {model_name.upper()} | Res: {img_size}x{img_size} | Epochs: {epochs} | LR: {lr}")
    print("=" * 70)
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate_epoch(model, val_loader, criterion, device)

        scheduler.step()

        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['train_acc'].append(train_acc)
        history['val_acc'].append(val_acc)

        print(f"Epoch [{epoch:02d}/{epochs:02d}] | "
              f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            checkpoint_payload = {
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'val_loss': val_loss,
                'model_name': model_name,
                'img_size': img_size,
                'num_classes': num_classes
            }
            torch.save(checkpoint_payload, rto_save_path)
            torch.save(checkpoint_payload, universal_save_path)
            torch.save(checkpoint_payload, mobilenet_save_path)
            print(f"  --> Checkpoint Saved: Peak Val Acc = {val_acc:.2f}% at {rto_save_path}")

        early_stopping(val_loss)
        if early_stopping.early_stop:
            print(f"[INFO] Early stopping triggered at Epoch {epoch}.")
            break

    total_duration = time.time() - start_time
    print("\n" + "=" * 70)
    print(f"   TRAINING COMPLETE: Peak Validation Accuracy = {best_val_acc:.2f}%")
    print(f"   Total Duration: {total_duration:.1f}s ({total_duration/60:.2f} mins)")
    print(f"   Saved Checkpoint: {rto_save_path}")
    print("=" * 70)

    # Evaluate on test set
    print("\n[INFO] Evaluating trained model on unseen test set...")
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for images, labels in test_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

    test_acc = (correct / total) * 100.0 if total > 0 else 0.0
    print(f"[TEST BENCHMARK] Final Test Accuracy across all 108 RTO Classes: {test_acc:.2f}%\n")


if __name__ == "__main__":
    train_rto_model()
