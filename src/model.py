"""
src/model.py

Model Architecture Definitions:
1. BaselineCustomCNN: Compact, fast, custom 3-stage ConvNet designed specifically for traffic sign classification.
2. MobileNetV2Transfer: Pretrained MobileNetV2 transfer learning model fine-tuned for 43 traffic sign classes.

Architecture Details:
- Input Shape: (B, 3, 32, 32) for Baseline CNN; (B, 3, 128, 128) for MobileNetV2.
- Output Classes: 43 (GTSRB Class IDs).
- Activation Functions: ReLU for intermediate feature maps, Softmax implicitly handled in PyTorch CrossEntropyLoss.
"""

# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
# pyrefly: ignore [missing-import]
import torchvision.models as models


class BaselineCustomCNN(nn.Module):
    """
    Custom Baseline Convolutional Neural Network (CNN) for Traffic Sign Classification.
    """

    def __init__(self, num_classes=52):
        super(BaselineCustomCNN, self).__init__()


        # Conv Block 1: 32x32 -> 16x16
        self.block1 = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout2d(0.25)
        )

        # Conv Block 2: 16x16 -> 8x8
        self.block2 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout2d(0.25)
        )

        # Conv Block 3: 8x8 -> 4x4
        self.block3 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout2d(0.25)
        )

        # FC Classifier Head
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 4 * 4, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.classifier(x)
        return x


class MobileNetV2Transfer(nn.Module):
    """
    Transfer Learning Model leveraging MobileNetV2 pretrained on ImageNet.
    Extremely lightweight inverted residual bottleneck architecture optimized for CPU real-time inference.
    """

    def __init__(self, num_classes=52, pretrained=True, freeze_features=False):
        super(MobileNetV2Transfer, self).__init__()

        weights = models.MobileNet_V2_Weights.DEFAULT if pretrained else None
        base_model = models.mobilenet_v2(weights=weights)

        self.features = base_model.features

        if freeze_features:
            for param in self.features.parameters():
                param.requires_grad = False

        # Replace classification head for target classes
        in_features = base_model.classifier[1].in_features
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = nn.functional.adaptive_avg_pool2d(x, (1, 1))
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x


class EfficientNetB0Transfer(nn.Module):
    """
    Transfer Learning Model using EfficientNet-B0 pretrained on ImageNet.
    Achieves ~96-98% on GTSRB while remaining fast enough for CPU real-time inference.
    Input: (B, 3, 128, 128)  Output: (B, num_classes)
    """

    def __init__(self, num_classes=52, pretrained=True, freeze_features=False):
        super(EfficientNetB0Transfer, self).__init__()

        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        base_model = models.efficientnet_b0(weights=weights)

        self.features = base_model.features
        self.avgpool  = base_model.avgpool

        if freeze_features:
            for param in self.features.parameters():
                param.requires_grad = False

        # Replace classification head for target classes
        in_features = base_model.classifier[1].in_features
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(in_features, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x


def get_model(model_name="baseline", num_classes=52, pretrained=True):

    """
    Factory function to instantiate models.

    Args:
        model_name (str): "baseline", "mobilenet", or "efficientnet".
        num_classes (int): Number of target classes.
        pretrained (bool): Pretrained weights flag.
    """
    if model_name.lower() == "baseline":
        model = BaselineCustomCNN(num_classes=num_classes)
        print(f"[INFO] Initialized BaselineCustomCNN ({sum(p.numel() for p in model.parameters()):,} parameters)")
    elif model_name.lower() in ["mobilenet", "mobilenetv2"]:
        model = MobileNetV2Transfer(num_classes=num_classes, pretrained=pretrained)
        print(f"[INFO] Initialized MobileNetV2Transfer ({sum(p.numel() for p in model.parameters()):,} parameters)")
    elif model_name.lower() in ["efficientnet", "efficientnetb0"]:
        model = EfficientNetB0Transfer(num_classes=num_classes, pretrained=pretrained)
        print(f"[INFO] Initialized EfficientNetB0Transfer ({sum(p.numel() for p in model.parameters()):,} parameters)")
    else:
        raise ValueError(f"Unknown model architecture: {model_name}. Use 'baseline', 'mobilenet', or 'efficientnet'.")

    return model


if __name__ == "__main__":
    b_model = get_model("baseline")
    m_model = get_model("mobilenet")

    dummy_baseline_input = torch.randn(2, 3, 32, 32)
    dummy_mobilenet_input = torch.randn(2, 3, 128, 128)

    assert b_model(dummy_baseline_input).shape == (2, 43)
    assert m_model(dummy_mobilenet_input).shape == (2, 43)
    print("[SUCCESS] Model shapes and forward passes verified successfully.")
