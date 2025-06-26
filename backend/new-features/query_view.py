#!/usr/bin/env python

# ───────────────────────────────────────────────────────────────
# 1. EDIT THESE THREE LINES TO MATCH YOUR FOLDER STRUCTURE
# ───────────────────────────────────────────────────────────────
from pathlib import Path
ROOT   = Path("/data")
BUNDLE = ROOT / "atlas_numpy_bundle.npz"          # created by build_numpy_bundle.py
META_CSV = ROOT / "atlas_meta.csv"
# ───────────────────────────────────────────────────────────────

# 2. Standard imports
import argparse, html, tempfile, webbrowser
import numpy as np, pandas as pd
from PIL import Image
import torch, torchvision.transforms as T
from torchvision.models import resnet18

# 3. CLI parsing
ap = argparse.ArgumentParser()
ap.add_argument("img", help="Path to query JPG/PNG")
ap.add_argument("-k", "--topk", type=int, default=4, help="neighbours to show") #how many neighbours
args = ap.parse_args()

# 4. Load atlas vectors + IDs + metadata
bundle = np.load(BUNDLE)
VECS   = bundle["vecs"]            # (N,512)  L2-normalised float32
IDS    = bundle["ids"]             # (N,)     int64
META   = pd.read_csv(META_CSV).set_index("id")

# 5. Build the embedder (ResNet-18 backbone)
device = "cpu"
model  = resnet18(weights="IMAGENET1K_V1")
model.fc = torch.nn.Identity()
model.eval().to(device)

transform = T.Compose([
    T.Resize(224), T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize([0.485,0.456,0.406],
                [0.229,0.224,0.225])
])
@torch.no_grad()
def embed(img_path) -> np.ndarray:
    img = Image.open(img_path).convert("RGB")
    vec = model(transform(img).unsqueeze(0)).squeeze().cpu().numpy()
    return (vec / np.linalg.norm(vec)).astype(np.float32)

# 6. Embed query → cosine similarity (NumPy dot-product)
query_vec = embed(args.img)
sims      = VECS @ query_vec                     # cosine similarities
best_idx  = sims.argsort()[-args.topk:][::-1]    # top-k indices

# 7. Collect rows for printing & HTML
rows = []
print(f"\nTop-{args.topk} similar cases:")
for rank, idx in enumerate(best_idx, 1):
    case_id  = IDS[idx]
    score    = sims[idx]
    row      = META.loc[case_id]
    print(f"{rank}. id={case_id:<4}  label={row.label:<12}  "
          f"score={score:.3f}  path={row.file_path}")
    rows.append((case_id, row.label, row.file_path, score))

# 8. Build an on-the-fly HTML page
thumb_css = "max-height:240px;max-width:240px;border:1px solid #ccc;margin:4px;"
cells = [
    f"""
    <div style='text-align:center'>
      <img src="file://{html.escape(Path(p).resolve().as_posix())}" style="{thumb_css}">
      <div style='font:12px Arial'>{html.escape(lbl)}<br>score&nbsp;{sc:.3f}</div>
    </div>
    """
    for (_id, lbl, p, sc) in rows
]

html_doc = f"""
<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Tumour-Atlas Match</title></head>
<body style="font-family:Arial, sans-serif">
<h2>Query vs. Top {args.topk} Match{'es' if args.topk>1 else ''}</h2>
<div style="display:flex;flex-wrap:wrap">
  <div style="text-align:center;margin-right:20px">
    <img src="file://{html.escape(Path(args.img).resolve().as_posix())}"
         style="max-height:300px;max-width:300px;border:2px solid #000;">
    <div style='font:14px Arial;font-weight:bold'>QUERY</div>
  </div>
  {''.join(cells)}
</div>
</body></html>
"""

tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".html")
tmp.write(html_doc.encode("utf-8")); tmp.close()
webbrowser.open(f"file://{tmp.name}")
print("\n🔗  Opened browser tab for visual comparison.")
