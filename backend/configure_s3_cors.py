#!/usr/bin/env python3
"""
Script to configure S3 CORS settings for the bucket.
Run this script to allow direct access to S3 images from web browsers.
"""

import boto3
import json
import os
from pathlib import Path

def load_env():
    """Populate os.environ from .env.local (simple line-by-line parser)."""
    env_path = Path(__file__).parent.parent / ".env.local"
    if not env_path.exists():
        raise FileNotFoundError(f"Environment file not found: {env_path}")

    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip('"').strip("'")

def configure_s3_cors():
    """Configure CORS settings for the S3 bucket."""
    load_env()
    
    # Initialize S3 client
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY"],
        aws_secret_access_key=os.environ["AWS_SECRET_KEY"],
        region_name=os.environ["AWS_REGION"],
    )
    
    bucket_name = os.environ["S3_BUCKET_NAME"]
    
    # Load CORS configuration
    cors_config_path = Path(__file__).parent / "s3_cors_config.json"
    with open(cors_config_path, 'r') as f:
        cors_config = json.load(f)
    
    try:
        # Apply CORS configuration
        s3_client.put_bucket_cors(
            Bucket=bucket_name,
            CORSConfiguration={
                'CORSRules': cors_config
            }
        )
        print(f"✅ Successfully configured CORS for bucket: {bucket_name}")
        print("You can now use direct S3 URLs in your frontend.")
        
    except Exception as e:
        print(f"❌ Error configuring CORS: {e}")
        print("Make sure your AWS credentials have permission to modify bucket CORS settings.")

if __name__ == "__main__":
    configure_s3_cors() 