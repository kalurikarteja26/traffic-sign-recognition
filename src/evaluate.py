"""
src/evaluate.py

Evaluation, Confusion Matrix Generator, Per-Class Metric Analyzer, and Error Inspector.

Evaluates trained checkpoint models on the 100% UNSEEN Test Dataset.
Calculates:
- Accuracy, Macro/Weighted Precision, Recall, F1-Score
- Confusion Matrix Heatmap
- Per-class Performance Table
- Error Analysis: Most confused class pairs and visual misclassification grid with confidence scores.
"""

import os
import cv2
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from PIL import Image
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, classification_report
)

from src.data_preprocessing import build_dataloaders
from src.model import get_model


class ModelEvaluator:
    """Evaluation and Diagnostic Engine for Traffic Sign Models."""

    def __init__(self, checkpoint_path, dataset_dir="dataset"):
        self.checkpoint_path = Path(checkpoint_path)
        self.dataset_dir = Path(dataset_dir)
        self.device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))

        # Load checkpoint
        print(f"[INFO] Loading checkpoint from {self.checkpoint_path}...")
        self.checkpoint = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
        self.model_name = self.checkpoint.get('model_name', 'baseline')
        self.img_size = self.checkpoint.get('img_size', 32)

        # Auto-detect num_classes from checkpoint or state_dict
        if 'num_classes' in self.checkpoint:
            self.num_classes = self.checkpoint['num_classes']
        else:
            state_dict = self.checkpoint['model_state_dict']
            last_weight_key = [k for k in state_dict.keys() if 'weight' in k][-1]
            self.num_classes = state_dict[last_weight_key].shape[0]

        # Load model architecture & weights
        self.model = get_model(self.model_name, num_classes=self.num_classes).to(self.device)
        self.model.load_state_dict(self.checkpoint['model_state_dict'])
        self.model.eval()

        # Load test dataloader
        _, _, self.test_loader, _ = build_dataloaders(
            dataset_dir=dataset_dir, img_size=self.img_size, batch_size=64, num_classes=self.num_classes
        )

        self.class_names = self._load_class_names()

    def _load_class_names(self):
        for fname in ["signnames_universal.csv", "signnames.csv", "labels.csv"]:
            csv_path = self.dataset_dir / fname
            if not csv_path.exists():
                csv_path = Path("training data") / fname
            if csv_path.exists():
                df = pd.read_csv(csv_path)
                name_col = 'Name' if 'Name' in df.columns else ('SignName' if 'SignName' in df.columns else None)
                if name_col and 'ClassId' in df.columns:
                    return dict(zip(df['ClassId'].astype(int), df[name_col]))
        return {i: f"Class_{i}" for i in range(self.num_classes)}

    def evaluate_test_set(self):
        """Runs predictions over unseen test set and collects all metrics."""
        y_true = []
        y_pred = []
        y_probs = []
        misclassified_samples = []

        print("[INFO] Evaluating model on 100% UNSEEN Test Dataset...")
        with torch.no_grad():
            for images, labels in self.test_loader:
                images, labels = images.to(self.device), labels.to(self.device)
                outputs = self.model(images)
                probs = torch.softmax(outputs, dim=1)
                confidences, predictions = torch.max(probs, 1)

                y_true.extend(labels.cpu().numpy())
                y_pred.extend(predictions.cpu().numpy())
                y_probs.extend(probs.cpu().numpy())

                # Collect misclassified instances
                mask = (predictions != labels)
                for img, true_lbl, pred_lbl, conf in zip(images[mask], labels[mask], predictions[mask], confidences[mask]):
                    if len(misclassified_samples) < 50:
                        misclassified_samples.append({
                            'tensor': img.cpu(),
                            'true_class': true_lbl.item(),
                            'pred_class': pred_lbl.item(),
                            'confidence': conf.item() * 100.0
                        })

        y_true = np.array(y_true)
        y_pred = np.array(y_pred)
        y_probs = np.array(y_probs)

        # Compute aggregate metrics
        acc = accuracy_score(y_true, y_pred) * 100.0
        p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_true, y_pred, average='macro')
        p_weight, r_weight, f1_weight, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted')

        print("\n" + "=" * 65)
        print("               FINAL UNSEEN TEST PERFORMANCE REPORT         ")
        print("=" * 65)
        print(f"Model Evaluated        : {self.model_name.upper()}")
        print(f"Overall Accuracy       : {acc:.2f}%")
        print(f"Macro Precision        : {p_macro * 100:.2f}%")
        print(f"Macro Recall           : {r_macro * 100:.2f}%")
        print(f"Macro F1-Score         : {f1_macro * 100:.2f}%")
        print(f"Weighted F1-Score      : {f1_weight * 100:.2f}%")
        print("-" * 65)

        return {
            'y_true': y_true, 'y_pred': y_pred, 'y_probs': y_probs,
            'accuracy': acc, 'f1_macro': f1_macro, 'misclassified': misclassified_samples
        }

    def generate_per_class_report(self, y_true, y_pred, save_path="results/per_class_metrics.csv"):
        """Generates detailed per-class accuracy, precision, recall, and F1 table."""
        precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, average=None)

        # Calculate per-class accuracy
        cm = confusion_matrix(y_true, y_pred, labels=np.arange(43))
        per_class_acc = cm.diagonal() / (cm.sum(axis=1) + 1e-6) * 100.0

        records = []
        for i in range(43):
            records.append({
                'ClassId': i,
                'SignName': self.class_names.get(i, f"Class_{i}"),
                'Samples': support[i],
                'Accuracy (%)': round(per_class_acc[i], 2),
                'Precision (%)': round(precision[i] * 100.0, 2),
                'Recall (%)': round(recall[i] * 100.0, 2),
                'F1-Score (%)': round(f1[i] * 100.0, 2)
            })

        df_report = pd.DataFrame(records)
        os.makedirs(Path(save_path).parent, exist_ok=True)
        df_report.to_csv(save_path, index=False)
        print(f"[SUCCESS] Per-class metrics exported to {save_path}")

        # Display lowest performing classes
        lowest_recall = df_report.sort_values(by='Recall (%)').head(5)
        print("\n[ERROR ANALYSIS] Top 5 Classes with Lowest Recall:")
        for _, row in lowest_recall.iterrows():
            print(f"  - [{row['ClassId']:02d}] {row['SignName']}: Recall={row['Recall (%)']}%, Acc={row['Accuracy (%)']}%")

        return df_report

    def plot_confusion_matrix(self, y_true, y_pred, save_path="results/confusion_matrix.png"):
        """Plot normalized confusion matrix heatmap."""
        cm = confusion_matrix(y_true, y_pred, labels=np.arange(43), normalize='true')

        plt.figure(figsize=(14, 12))
        sns.heatmap(cm, cmap='Blues', annot=False, fmt='.2f',
                    xticklabels=range(43), yticklabels=range(43))
        plt.title(f'GTSRB Confusion Matrix Heatmap - {self.model_name.upper()}', fontsize=14, fontweight='bold')
        plt.xlabel('Predicted Class ID', fontsize=12)
        plt.ylabel('Actual (True) Class ID', fontsize=12)
        plt.tight_layout()

        os.makedirs(Path(save_path).parent, exist_ok=True)
        plt.savefig(save_path, dpi=300)
        plt.close()
        print(f"[SUCCESS] Confusion matrix saved to {save_path}")

    def plot_misclassified_examples(self, misclassified, save_path="results/error_samples.png"):
        """Plot visual grid of misclassified traffic sign images with actual, predicted, & confidence."""
        if not misclassified:
            print("[INFO] No misclassifications to display!")
            return

        fig, axes = plt.subplots(4, 4, figsize=(14, 14))
        axes = axes.ravel()

        # Image denormalization constants
        mean = np.array([0.485, 0.456, 0.406]).reshape(3, 1, 1)
        std = np.array([0.229, 0.224, 0.225]).reshape(3, 1, 1)

        for i in range(min(16, len(misclassified))):
            sample = misclassified[i]
            img_tensor = sample['tensor'].numpy()
            # Denormalize
            img_unnorm = (img_tensor * std + mean).clip(0, 1).transpose(1, 2, 0)

            axes[i].imshow(img_unnorm)
            true_name = self.class_names.get(sample['true_class'], str(sample['true_class']))
            pred_name = self.class_names.get(sample['pred_class'], str(sample['pred_class']))

            if len(true_name) > 15:
                true_name = true_name[:13] + ".."
            if len(pred_name) > 15:
                pred_name = pred_name[:13] + ".."

            axes[i].set_title(
                f"True: [{sample['true_class']}] {true_name}\n"
                f"Pred: [{sample['pred_class']}] {pred_name}\n"
                f"Conf: {sample['confidence']:.1f}%",
                fontsize=9, color='red'
            )
            axes[i].axis('off')

        for i in range(len(misclassified), 16):
            axes[i].axis('off')

        plt.suptitle("Traffic Sign Misclassification Error Samples", fontsize=15, fontweight='bold', y=0.98)
        plt.tight_layout()

        os.makedirs(Path(save_path).parent, exist_ok=True)
        plt.savefig(save_path, dpi=300)
        plt.close()
        print(f"[SUCCESS] Misclassification visual sample grid saved to {save_path}")


def main(checkpoint_path="models/baseline_best.pth"):
    if not Path(checkpoint_path).exists():
        print(f"[ERROR] Checkpoint file {checkpoint_path} not found. Please run train.py first.")
        return

    evaluator = ModelEvaluator(checkpoint_path)
    res = evaluator.evaluate_test_set()
    evaluator.generate_per_class_report(res['y_true'], res['y_pred'])
    evaluator.plot_confusion_matrix(res['y_true'], res['y_pred'])
    evaluator.plot_misclassified_examples(res['misclassified'])


if __name__ == "__main__":
    main()
