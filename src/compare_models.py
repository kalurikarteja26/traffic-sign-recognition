"""
src/compare_models.py

Benchmark & Performance Comparison Engine.
Compares Baseline Custom CNN vs MobileNetV2 Transfer Learning Model on the
100% UNSEEN GTSRB Test Set.

Evaluates:
- Classification Accuracy, Macro/Weighted F1-Score, Precision, Recall
- Model size / total trainable parameter count
- Per-sample inference latency (milliseconds per image)
- Exports comparative CSV & diagnostic visualization figure
"""

import os
import time
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

from src.data_preprocessing import build_dataloaders
from src.model import get_model


class ModelComparator:
    """Benchmark comparator for Traffic Sign Recognition architectures."""

    def __init__(self, dataset_dir="dataset", models_dir="models"):
        self.dataset_dir = Path(dataset_dir)
        self.models_dir = Path(models_dir)
        self.device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))

    def evaluate_checkpoint(self, checkpoint_path):
        """Loads checkpoint and computes test set performance metrics + inference latency."""
        chk_path = Path(checkpoint_path)
        if not chk_path.exists():
            print(f"[WARNING] Checkpoint {chk_path} not found.")
            return None

        checkpoint = torch.load(chk_path, map_location=self.device, weights_only=False)
        model_name = checkpoint.get('model_name', 'baseline')
        img_size = checkpoint.get('img_size', 32)

        # Load architecture
        model = get_model(model_name, num_classes=43).to(self.device)
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()

        # Count parameters
        param_count = sum(p.numel() for p in model.parameters())

        # Load test dataloader
        _, _, test_loader, _ = build_dataloaders(
            dataset_dir=self.dataset_dir, img_size=img_size, batch_size=64
        )

        y_true = []
        y_pred = []

        start_time = time.time()
        sample_count = 0

        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(self.device), labels.to(self.device)
                outputs = model(images)
                preds = torch.argmax(outputs, dim=1)

                y_true.extend(labels.cpu().numpy())
                y_pred.extend(preds.cpu().numpy())
                sample_count += images.size(0)

        total_latency_sec = time.time() - start_time
        latency_ms_per_image = (total_latency_sec / sample_count) * 1000.0

        acc = accuracy_score(y_true, y_pred) * 100.0
        p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_true, y_pred, average='macro')
        p_weight, r_weight, f1_weight, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted')

        return {
            'Model Name': model_name.upper(),
            'Parameters': param_count,
            'Resolution': f"{img_size}x{img_size}",
            'Test Accuracy (%)': round(acc, 2),
            'Macro Precision (%)': round(p_macro * 100.0, 2),
            'Macro Recall (%)': round(r_macro * 100.0, 2),
            'Macro F1-Score (%)': round(f1_macro * 100.0, 2),
            'Weighted F1-Score (%)': round(f1_weight * 100.0, 2),
            'Latency (ms/img)': round(latency_ms_per_image, 2)
        }

    def run_comparison(self, save_dir="results"):
        """Evaluates available checkpoints and produces benchmark table and plots."""
        checkpoints = {
            'Baseline CNN': self.models_dir / "baseline_best.pth",
            'MobileNetV2 Transfer': self.models_dir / "mobilenet_best.pth"
        }

        results = []
        for name, path in checkpoints.items():
            res = self.evaluate_checkpoint(path)
            if res:
                res['Architecture'] = name
                results.append(res)

        if not results:
            print("[ERROR] No valid model checkpoints found to compare!")
            return None

        df_comparison = pd.DataFrame(results)
        save_path_dir = Path(save_dir)
        save_path_dir.mkdir(parents=True, exist_ok=True)

        csv_path = save_path_dir / "model_comparison.csv"
        df_comparison.to_csv(csv_path, index=False)

        print("\n" + "=" * 70)
        print("          TRAFFIC SIGN CLASSIFIER MODEL COMPARISON BENCHMARK      ")
        print("=" * 70)
        print(df_comparison.to_string(index=False))
        print("-" * 70)
        print(f"[SUCCESS] Benchmark report saved to {csv_path}")

        # Plot Visual Comparison
        self.plot_comparison_chart(df_comparison, save_path=save_path_dir / "model_comparison.png")
        return df_comparison

    def plot_comparison_chart(self, df, save_path="results/model_comparison.png"):
        """Plots visual bar chart comparing accuracy, macro F1, and latency."""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

        models = df['Architecture'].values
        x = np.arange(len(models))
        width = 0.35

        # Accuracy & F1 plot
        ax1.bar(x - width/2, df['Test Accuracy (%)'], width, label='Test Accuracy (%)', color='#2ecc71')
        ax1.bar(x + width/2, df['Macro F1-Score (%)'], width, label='Macro F1-Score (%)', color='#3498db')
        ax1.set_ylabel('Percentage (%)', fontsize=12, fontweight='bold')
        ax1.set_title('Test Accuracy vs Macro F1-Score', fontsize=14, fontweight='bold')
        ax1.set_xticks(x)
        ax1.set_xticklabels(models, fontweight='bold')
        ax1.set_ylim(0, 105)
        ax1.legend(fontsize=11)
        ax1.grid(axis='y', linestyle='--', alpha=0.7)

        for i in x:
            ax1.text(i - width/2, df['Test Accuracy (%)'].iloc[i] + 1, f"{df['Test Accuracy (%)'].iloc[i]}%", ha='center', fontsize=9)
            ax1.text(i + width/2, df['Macro F1-Score (%)'].iloc[i] + 1, f"{df['Macro F1-Score (%)'].iloc[i]}%", ha='center', fontsize=9)

        # Latency plot
        ax2.bar(x, df['Latency (ms/img)'], width=0.4, color='#e74c3c')
        ax2.set_ylabel('Inference Latency (ms/image)', fontsize=12, fontweight='bold')
        ax2.set_title('Average Inference Latency (Lower is Better)', fontsize=14, fontweight='bold')
        ax2.set_xticks(x)
        ax2.set_xticklabels(models, fontweight='bold')
        ax2.grid(axis='y', linestyle='--', alpha=0.7)

        for i in x:
            ax2.text(i, df['Latency (ms/img)'].iloc[i] + 0.2, f"{df['Latency (ms/img)'].iloc[i]} ms", ha='center', fontsize=10, fontweight='bold')

        plt.suptitle("GTSRB Model Performance & Latency Benchmark Comparison", fontsize=16, fontweight='bold', y=1.02)
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"[SUCCESS] Comparison visualization chart saved to {save_path}")


def main():
    comparator = ModelComparator()
    comparator.run_comparison()


if __name__ == "__main__":
    main()
