from pathlib import Path
import pandas as pd
import numpy as np
from tqdm import tqdm
import torch, torchvision.transforms as T
from torchvision.models import resnet18
from PIL import Image                # NEW import (add near top)

# ---------- 1. Paths ----------
ROOT = Path("/data")
CSV  = ROOT / "atlas_meta.csv"
VEC_OUT = ROOT / "atlas_vectors.npy"   # will hold N x 512 float32

# ---------- 2. Load metadata ----------
meta = pd.read_csv(CSV)

# ---------- 3. Pre-trained CNN backbone ----------
device = "cpu"          # or "cuda" if you have a GPU
model = resnet18(weights="IMAGENET1K_V1")
model.fc = torch.nn.Identity()    # strips off the 1000-class head
model.eval().to(device)

# ---------- 4. Image pre-processing ----------
trans = T.Compose([
    T.Resize(224),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485,0.456,0.406],
                std=[0.229,0.224,0.225]),
])

# ---------- 5. Loop over every row ----------

vecs = []
with torch.no_grad():
    for img_path in tqdm(meta["file_path"], desc="Vectorising"):
        # --- open image safely ---
        img = Image.open(img_path).convert("RGB")      # ← FIXED

        # --- preprocess & embed ---
        x = trans(img).unsqueeze(0).to(device)         # 1×3×224×224
        v = model(x).squeeze().cpu().numpy()           # 512-D
        v = v / np.linalg.norm(v)                      # L2-normalise

        vecs.append(v.astype(np.float32))


vecs = np.stack(vecs)                 # shape (N,512)
np.save(VEC_OUT, vecs)
print("✅  Saved", vecs.shape, "→", VEC_OUT)
