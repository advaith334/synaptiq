from pathlib import Path
import numpy as np, pandas as pd

ROOT = Path("/data")
vecs = np.load(ROOT / "atlas_vectors.npy")            # (N,512)
ids  = pd.read_csv(ROOT / "atlas_meta.csv")["id"].to_numpy(np.int64)

np.savez(ROOT / "atlas_numpy_bundle.npz", vecs=vecs, ids=ids)
print("✅  atlas_numpy_bundle.npz saved (", vecs.shape, ")")
