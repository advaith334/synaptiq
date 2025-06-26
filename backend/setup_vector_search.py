#!/usr/bin/env python3
"""
Setup script for vector search functionality.
This creates sample data for testing the similar cases feature.
"""

import os
import numpy as np
import pandas as pd
from pathlib import Path
import tempfile
from PIL import Image

def create_sample_data():
    """Create sample vector search data for testing."""
    
    # Create new-features directory if it doesn't exist
    new_features_dir = Path(__file__).parent / "new-features"
    new_features_dir.mkdir(exist_ok=True)
    
    # Create sample metadata
    sample_cases = []
    for i in range(20):
        sample_cases.append({
            "id": i,
            "file_path": f"/tmp/sample_case_{i}.jpg",
            "label": ["glioma", "meningioma", "pituitary"][i % 3]
        })
    
    # Save metadata
    meta_df = pd.DataFrame(sample_cases)
    meta_path = new_features_dir / "atlas_meta.csv"
    meta_df.to_csv(meta_path, index=False)
    print(f"✅ Created sample metadata: {meta_path}")
    
    # Create sample vectors (random for testing)
    num_cases = len(sample_cases)
    vecs = np.random.randn(num_cases, 512).astype(np.float32)
    # Normalize vectors
    vecs = vecs / np.linalg.norm(vecs, axis=1, keepdims=True)
    
    # Save vectors and IDs
    ids = meta_df["id"].to_numpy(np.int64)
    bundle_path = new_features_dir / "atlas_numpy_bundle.npz"
    np.savez(bundle_path, vecs=vecs, ids=ids)
    print(f"✅ Created sample vectors: {bundle_path}")
    
    print(f"✅ Vector search setup complete!")
    print(f"   - {num_cases} sample cases created")
    print(f"   - Metadata: {meta_path}")
    print(f"   - Vectors: {bundle_path}")
    print(f"   - Labels: glioma, meningioma, pituitary")

if __name__ == "__main__":
    create_sample_data() 