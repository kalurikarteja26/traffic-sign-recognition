"""
train_universal.py

Training Engine for the 52-Class Universal Traffic Sign Recognition Model.
Trains Baseline Custom CNN on all 52 Universal Traffic Sign classes
(including GTSRB 0..42 + International 43..51: No U-Turn, No Left Turn, No Right Turn, No Parking, etc.).

Saves checkpoint to:
- models/universal_best.pth
- models/baseline_best.pth
"""

import os
import time
import torch
import torch.nn as nn
import torch.optim as optim
from pathlib import Path
from tqdm import tqdm

from src.data_preprocessing import build_dataloaders
from src.model import get_model
from src.train import EarlyStopping, FocalLoss, plot_training_history, train_epoch, validate_epoch


def train_universal_model(epochs=15, batch_size=32, lr=0.0005, dataset_dir="dataset", model_name="mobilenet", img_size=128):
    if hasattr(os, 'cpu_count'):
        torch.set_num_threads(min(8, os.cpu_count() or 4))
    device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))
    print(f"[HARDWARE] Active Compute Device: {device} (Threads: {torch.get_num_threads()})")

    num_classes = 52

    # Load 52-Class DataLoaders with CLAHE + 128x128 resolution
    train_loader, val_loader, test_loader, class_weights = build_dataloaders(
        dataset_dir=dataset_dir, img_size=img_size, batch_size=batch_size, num_classes=num_classes
    )

    # Instantiate Pretrained Model Architecture
    model = get_model(model_name=model_name, num_classes=num_classes, pretrained=True).to(device)

    # Multi-class FocalLoss with class balancing and gamma=2.0
    criterion = FocalLoss(weight=class_weights.to(device), gamma=2.0, label_smoothing=0.05)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    early_stopping = EarlyStopping(patience=7)

    best_val_acc = 0.0
    universal_save_path = Path("models/universal_best.pth")
    specific_save_path = Path(f"models/{model_name}_best.pth")
    baseline_save_path = Path("models/baseline_best.pth")
    os.makedirs(universal_save_path.parent, exist_ok=True)

    history = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}

    print("\n" + "=" * 70)
    print(f"   STARTING 52-CLASS UNIVERSAL MODEL TRAINING (FOCAL LOSS + CLAHE)")
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
            torch.save(checkpoint_payload, universal_save_path)
            torch.save(checkpoint_payload, specific_save_path)
            torch.save(checkpoint_payload, baseline_save_path)
            print(f"  --> Checkpoint Saved: Peak Val Acc = {val_acc:.2f}% at {universal_save_path}")

        early_stopping(val_loss)
        if early_stopping.early_stop:
            print(f"[INFO] Early stopping triggered at Epoch {epoch}.")
            break

    total_duration = time.time() - start_time
    print("-" * 70)
    print(f"Training Complete! Total Time: {total_duration / 60:.2f} mins. Peak Val Acc: {best_val_acc:.2f}%")

    plot_training_history(history, save_path="results/universal_curves.png")
    return model, history


if __name__ == "__main__":
    import argparse
    default_ds = "training data" if Path("training data").exists() else "dataset"
    parser = argparse.ArgumentParser(description="Train 52-Class Universal Traffic Sign Model (>95% Target)")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.0005, help="Learning rate")
    parser.add_argument("--model", type=str, default="mobilenet", help="Model architecture: 'mobilenet', 'efficientnet', or 'baseline'")
    parser.add_argument("--img-size", type=int, default=128, help="Target image resolution (e.g., 64 or 128)")
    parser.add_argument("--dataset", type=str, default=default_ds, help="Dataset directory path")
    args = parser.parse_args()

    train_universal_model(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        dataset_dir=args.dataset,
        model_name=args.model,
        img_size=args.img_size
    )
