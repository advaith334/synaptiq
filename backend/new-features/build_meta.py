from pathlib import Path
import pandas as pd

ROOT = Path("/data/Testing")

rows = []
counter = 0

# 2. Loop through every immediate sub-folder (= tumour class)
for class_dir in ROOT.iterdir():
    if not class_dir.is_dir():
        continue                         # skip stray files
    label = class_dir.name.lower()       # 'glioma', 'meningioma', …

    # 3. Find every .jpg (or .png) inside that folder (no sub-sub-folders here)
    for img_path in class_dir.glob("*.jp*g"):
        rows.append(
            {
                "id": counter,           # integer primary key for FAISS later
                "file_path": str(img_path),   # absolute path to the image
                "label": label                # tumour class
            }
        )
        counter += 1

# 4. Save to CSV
df = pd.DataFrame(rows)
out_csv = ROOT.parent / "atlas_meta.csv"
df.to_csv(out_csv, index=False)
print(f"✅  Saved {len(df)} rows → {out_csv}")
