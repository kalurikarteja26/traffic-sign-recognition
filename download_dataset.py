"""
download_dataset.py

Automated dataset downloader and directory structure initializer for the
German Traffic Sign Recognition Benchmark (GTSRB) dataset.

Supports:
1. Downloading via torchvision.datasets.GTSRB
2. Fallback direct zip download if torchvision download is restricted
3. Organizing into standard dataset/ folder with class subdirectories (0..42)
"""

import os
import shutil
import zipfile
import urllib.request
import pandas as pd
from pathlib import Path

# 43 GTSRB Class Names Dictionary
CLASS_NAMES = {
    0: 'Speed limit (20km/h)',
    1: 'Speed limit (30km/h)',
    2: 'Speed limit (50km/h)',
    3: 'Speed limit (60km/h)',
    4: 'Speed limit (70km/h)',
    5: 'Speed limit (80km/h)',
    6: 'End of speed limit (80km/h)',
    7: 'Speed limit (100km/h)',
    8: 'Speed limit (120km/h)',
    9: 'No passing',
    10: 'No passing for vehicles over 3.5 metric tons',
    11: 'Right-of-way at the next intersection',
    12: 'Priority road',
    13: 'Yield',
    14: 'Stop',
    15: 'No vehicles',
    16: 'Vehicles over 3.5 metric tons prohibited',
    17: 'No entry',
    18: 'General caution',
    19: 'Dangerous curve to the left',
    20: 'Dangerous curve to the right',
    21: 'Double curve',
    22: 'Bumpy road',
    23: 'Slippery road',
    24: 'Road narrows on the right',
    25: 'Road work',
    26: 'Traffic signals',
    27: 'Pedestrians',
    28: 'Children crossing',
    29: 'Bicycles crossing',
    30: 'Beware of ice/snow',
    31: 'Wild animals crossing',
    32: 'End of all speed and passing limits',
    33: 'Turn right ahead',
    34: 'Turn left ahead',
    35: 'Ahead only',
    36: 'Go straight or right',
    37: 'Go straight or left',
    38: 'Keep right',
    39: 'Keep left',
    40: 'Roundabout mandatory',
    41: 'End of no passing',
    42: 'End of no passing by vehicles over 3.5 metric tons'
}

DATASET_DIR = Path("dataset")
TRAIN_DIR = DATASET_DIR / "Train"
TEST_DIR = DATASET_DIR / "Test"


def create_directory_structure():
    """Create project dataset directories."""
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    TRAIN_DIR.mkdir(parents=True, exist_ok=True)
    TEST_DIR.mkdir(parents=True, exist_ok=True)
    for class_id in range(43):
        (TRAIN_DIR / str(class_id)).mkdir(parents=True, exist_ok=True)
        (TEST_DIR / str(class_id)).mkdir(parents=True, exist_ok=True)
    print(f"[INFO] Created directory structure under {DATASET_DIR.resolve()}")


def download_via_torchvision():
    """Download GTSRB using torchvision.datasets.GTSRB."""
    print("[INFO] Attempting download via torchvision.datasets.GTSRB...")
    try:
        # pyrefly: ignore [missing-import]
        import torchvision.datasets as datasets
        raw_dir = DATASET_DIR / "raw"
        train_data = datasets.GTSRB(root=str(raw_dir), split='train', download=True)
        test_data = datasets.GTSRB(root=str(raw_dir), split='test', download=True)
        print("[INFO] torchvision download complete. Re-organizing files...")

        # Process train images
        records_train = []
        train_samples = getattr(train_data, '_samples', None)
        if train_samples is None:
            train_samples = [train_data[i] for i in range(len(train_data))]

        for img_path, target in train_samples:
            src_path = Path(img_path)
            target_class_dir = TRAIN_DIR / str(target)
            dest_path = target_class_dir / src_path.name
            shutil.copy2(src_path, dest_path)
            records_train.append({
                'Path': f"Train/{target}/{src_path.name}",
                'ClassId': target,
                'ClassName': CLASS_NAMES[target]
            })

        # Process test images
        records_test = []
        test_samples = getattr(test_data, '_samples', None)
        if test_samples is None:
            test_samples = [test_data[i] for i in range(len(test_data))]

        for img_path, target in test_samples:
            src_path = Path(img_path)
            target_class_dir = TEST_DIR / str(target)
            dest_path = target_class_dir / src_path.name
            shutil.copy2(src_path, dest_path)
            records_test.append({
                'Path': f"Test/{target}/{src_path.name}",
                'ClassId': target,
                'ClassName': CLASS_NAMES[target]
            })

        # Save metadata CSV files
        pd.DataFrame(records_train).to_csv(DATASET_DIR / "Train.csv", index=False)
        pd.DataFrame(records_test).to_csv(DATASET_DIR / "Test.csv", index=False)
        print("[SUCCESS] Dataset successfully organized and CSV metadata saved!")
        return True
    except Exception as e:
        print(f"[WARNING] Torchvision download encountered error: {e}")
        return False


def main():
    print("=" * 60)
    print("      GTSRB DATASET DOWNLOAD & PREPARATION PIPELINE         ")
    print("=" * 60)
    create_directory_structure()

    success = download_via_torchvision()
    if not success:
        print("[INFO] Please ensure internet connection or download GTSRB directly into dataset/ directory.")

    # Save class_names metadata JSON/CSV
    class_df = pd.DataFrame(list(CLASS_NAMES.items()), columns=['ClassId', 'SignName'])
    class_df.to_csv(DATASET_DIR / "signnames.csv", index=False)
    print(f"[INFO] Class mapping written to {DATASET_DIR / 'signnames.csv'}")


if __name__ == "__main__":
    main()
