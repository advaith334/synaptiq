from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pathlib import Path
from datetime import datetime
from operator import itemgetter
import google.generativeai as genai
import boto3
import json
import os
import re
import shutil
import time
from werkzeug.utils import secure_filename
from botocore.exceptions import NoCredentialsError
import io

# ----------- CONFIG ----------------------------------------------------------
import subprocess
import sys
from threading import Thread

# Add imports for vector search
from PIL import Image
import torch
import torchvision.transforms as T
from torchvision.models import resnet18
import tempfile
import html
import numpy as np
import pandas as pd
import base64

UPLOAD_FOLDER = "/tmp/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Vector search configuration
VECTOR_ROOT = Path(__file__).parent / "new-features"
VECTOR_BUNDLE = VECTOR_ROOT / "atlas_numpy_bundle.npz"
VECTOR_META = VECTOR_ROOT / "atlas_meta.csv"

# Real image database configuration
REAL_IMAGES_ROOT = Path(__file__).parent.parent / "data" / "Testing"

# Initialize vector search model (global to avoid reloading)
vector_model = None
vector_transform = None
real_image_embeddings = None
real_image_paths = None

def initialize_vector_search():
    """Initialize the vector search model and data."""
    global vector_model, vector_transform, real_image_embeddings, real_image_paths
    
    if vector_model is not None:
        return  # Already initialized
    
    try:
        # Build the embedder (ResNet-18 backbone)
        print("Initializing ResNet-18 model for vector search...")
        device = "cpu"
        vector_model = resnet18(weights="IMAGENET1K_V1")
        vector_model.fc = torch.nn.Identity()
        vector_model.eval().to(device)
        
        vector_transform = T.Compose([
            T.Resize(224), T.CenterCrop(224),
            T.ToTensor(),
            T.Normalize([0.485,0.456,0.406], [0.229,0.224,0.225])
        ])
        
        # Load and embed real images from data/Testing
        print("Loading real images from data/Testing directory...")
        load_real_image_embeddings()
        
        print("Vector search initialized successfully")
    except Exception as e:
        print(f"Warning: Vector search initialization failed: {e}")
        print("Vector search will use simplified mode")
        vector_model = None

def load_real_image_embeddings():
    """Load and embed all real images from the data/Testing directory."""
    global real_image_embeddings, real_image_paths
    
    if not REAL_IMAGES_ROOT.exists():
        print(f"Warning: Real images directory not found: {REAL_IMAGES_ROOT}")
        return
    
    try:
        real_image_paths = []
        embeddings_list = []
        
        # Walk through all subdirectories in data/Testing
        for tumor_type_dir in REAL_IMAGES_ROOT.iterdir():
            if tumor_type_dir.is_dir():
                tumor_type = tumor_type_dir.name
                print(f"Processing {tumor_type} images...")
                
                for img_file in tumor_type_dir.glob("*.jpg"):
                    try:
                        # Embed the image
                        embedding = embed_image(str(img_file))
                        
                        real_image_paths.append({
                            "path": str(img_file),
                            "tumor_type": tumor_type,
                            "filename": img_file.name
                        })
                        embeddings_list.append(embedding)
                        
                    except Exception as e:
                        print(f"Error embedding {img_file}: {e}")
                        continue
        
        if embeddings_list:
            real_image_embeddings = np.array(embeddings_list)
            print(f"Loaded {len(real_image_paths)} real images with embeddings")
        else:
            print("No real images could be loaded")
            
    except Exception as e:
        print(f"Error loading real image embeddings: {e}")

@torch.no_grad()
def embed_image(img_path) -> np.ndarray:
    """Embed an image using the ResNet-18 model."""
    if vector_model is None:
        raise RuntimeError("Vector search not initialized")
    
    img = Image.open(img_path).convert("RGB")
    vec = vector_model(vector_transform(img).unsqueeze(0)).squeeze().cpu().numpy()
    return (vec / np.linalg.norm(vec)).astype(np.float32)

def find_similar_cases(img_path, top_k=8):
    """Find similar cases for a given image using real images from data/Testing."""
    if vector_model is None or real_image_embeddings is None:
        return {"error": "Vector search not available"}
    
    try:
        # Use the actual uploaded image for vector search
        print(f"Performing vector search on uploaded image: {img_path}")
        
        # Embed the uploaded image using ResNet-18
        query_vec = embed_image(img_path)
        print(f"Generated embedding vector with shape: {query_vec.shape}")
        
        # Calculate cosine similarities with all real images
        similarities = np.dot(real_image_embeddings, query_vec)
        
        # Get top-k most similar images
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for rank, idx in enumerate(top_indices, 1):
            image_info = real_image_paths[idx]
            similarity_score = float(similarities[idx])
            
            results.append({
                "rank": rank,
                "case_id": rank,
                "label": image_info["tumor_type"],
                "file_path": image_info["path"],
                "filename": image_info["filename"],
                "similarity_score": similarity_score
            })
        
        print(f"Found {len(results)} similar cases with scores ranging from {results[-1]['similarity_score']:.3f} to {results[0]['similarity_score']:.3f}")
        return {"similar_cases": results}
    except Exception as e:
        print(f"Vector search error: {e}")
        return {"error": f"Vector search failed: {str(e)}"}

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


load_env()  # must run before we touch env vars

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

S3_BUCKET = os.environ["S3_BUCKET_NAME"]
AWS_REGION = os.environ["AWS_REGION"]

generation_config = dict(
    temperature=0.4,
    top_p=0.95,
    top_k=64,
    max_output_tokens=8192,
)

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
)


# ----------- FLASK APP -------------------------------------------------------

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize vector search on app startup
initialize_vector_search()


# ----------- HELPERS ---------------------------------------------------------

def s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY"],
        aws_secret_access_key=os.environ["AWS_SECRET_KEY"],
        region_name=AWS_REGION,
    )


def upload_to_gemini(path, mime_type=None):
    file = genai.upload_file(path, mime_type=mime_type)
    print(f"Uploading to Gemini: {path}")
    return file


def wait_for_files_active(files):
    print("Waiting for Gemini file processing…")
    for f in files:
        while (state := genai.get_file(f.name).state.name) == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(5)
        if state != "ACTIVE":
            raise RuntimeError(f"File {f.name} failed (state={state})")
    print(" ready")


def get_analysis_by_timestamp(ts: str):
    """Return context + MRI URL for a given timestamp folder."""
    cli = s3_client()
    ctx_key = f"saved/{ts}/context_{ts}.json"
    mri_key = f"saved/{ts}/mri_{ts}.jpg"

    ctx_obj = cli.get_object(Bucket=S3_BUCKET, Key=ctx_key)
    context = json.loads(ctx_obj["Body"].read())

    return {
        "context": context,
        "mri_url": f"http://localhost:5001/image/{ts}/mri_{ts}.jpg",
        "timestamp": ts,
    }


def get_latest_analysis():
    """Fallback when no timestamp is provided."""
    cli = s3_client()
    objs = cli.list_objects_v2(Bucket=S3_BUCKET, Prefix="saved/")
    if "Contents" not in objs:
        return None

    ctx_files = [o for o in objs["Contents"] if "context_" in o["Key"]]
    if not ctx_files:
        return None

    latest_ctx = max(ctx_files, key=itemgetter("LastModified"))
    ts = latest_ctx["Key"].split("context_")[1].split(".json")[0]
    return get_analysis_by_timestamp(ts)


# ----------- CORE PROCESSING -------------------------------------------------

def process_mri_scan(image_path: Path):
    """Analyze scan, upload JSON/image/summary. Returns dict to frontend."""
    if not image_path.exists():
        return {"error": f"File not found: {image_path}"}

    # ── Upload to Gemini & run analysis ──────────────────────────────────────
    img_file = upload_to_gemini(str(image_path), mime_type="image/jpeg")
    wait_for_files_active([img_file])

    chat = model.start_chat()
    analysis_prompt = """
        Please analyze this MRI brain scan image and provide your analysis as a JSON object with the following structure. Fill in the values based on your analysis, using null or "N/A" if a field is not applicable. Do not include extra text or code block formatting outside the JSON.

        {
        "tumor_detection": {
            "present": boolean,
            "type": string (one of "glioma", "meningioma", "pituitary", or "none"),
            "confidence_percentage": number (confidence level in percentage for the primary diagnosis, e.g., 85.5, or 0 if N/A),
            "size": string (e.g., "2.5 cm", or "N/A"),
            "location": string (e.g., "frontal lobe", or "N/A"),
            "characteristics": string (brief description or "N/A"),
            "key_features": array of strings (list of key imaging features, e.g., ["Heterogeneous ring enhancement", "Necrotic core"]),
            "distinguishers": array of strings (list of distinguishing factors from other diagnoses, e.g., ["Vs. metastasis: Less vasogenic edema"]),
            "coordinates": {
            "x": number (predicted x coordinate or 0 if N/A),
            "y": number (predicted y coordinate or 0 if N/A),
            "z": number (predicted z coordinate or 0 if N/A)
            }
        },
        "gray_matter": {
            "abnormalities": boolean,
            "regions_affected": string (brief description or "N/A"),
            "severity": string (e.g., "mild", "moderate", "severe", or "N/A")
        },
        "other_abnormalities": string (brief description or "none"),
        "differential_diagnosis": array of objects (list possible alternative diagnoses with confidence percentages, or empty array if not applicable) [
            {
                "type": string (e.g., "glioblastoma"),
                "confidence_percentage": number (confidence level in percentage, e.g., 60.2),
                "key_features": array of strings (list of key imaging features, e.g., ["Heterogeneous ring enhancement", "Necrotic core"]),
                "distinguishers": array of strings (list of distinguishing factors from other diagnoses, e.g., ["Vs. primary tumor: More uniform enhancement"])
            }
        ],
        "follow_up_actions": string (brief recommendation)
        }

        The dimensions of the scan are x=401, y=200, z=300. Be accurate and concise in your analysis.
    """
    raw = chat.send_message([img_file, analysis_prompt]).text.strip()
    clean = re.sub(r"^```(?:json)?\n|\n```$", "", raw)

    try:
        analysis_json = json.loads(clean)
    except json.JSONDecodeError:
        return {"error": "Gemini response is not valid JSON", "raw_response": raw}

    # ── Timestamped folder name ─────────────────────────────────────────────
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder = f"saved/{ts}/"
    json_name = f"context_{ts}.json"
    img_ext = image_path.suffix or ".jpg"
    img_name = f"mri_{ts}{img_ext}"
    sum_name = f"summary_{ts}.txt"

    cli = s3_client()

    # JSON
    cli.put_object(
        Bucket=S3_BUCKET,
        Key=folder + json_name,
        Body=json.dumps(analysis_json, indent=4),
        ContentType="application/json",
    )

    # Image
    with open(image_path, "rb") as f:
        cli.put_object(
            Bucket=S3_BUCKET,
            Key=folder + img_name,
            Body=f,
            ContentType="image/jpeg",
        )

    # Generate templated summary from analysis JSON
    tumor_info = ""
    if analysis_json['tumor_detection']['present']:
        tumor_type = analysis_json['tumor_detection']['type']
        tumor_size = analysis_json['tumor_detection']['size']
        tumor_location = analysis_json['tumor_detection']['location']
        tumor_info = f"A {tumor_type} tumor of size {tumor_size} was detected in the {tumor_location}."
    else:
        tumor_info = "No tumor was detected in the MRI scan."
        
    gray_matter_info = ""
    if analysis_json['gray_matter']['abnormalities']:
        gray_matter_regions = analysis_json['gray_matter']['regions_affected']
        gray_matter_severity = analysis_json['gray_matter']['severity']
        gray_matter_info = f"Gray matter abnormalities were observed in {gray_matter_regions} with {gray_matter_severity} severity."
    else:
        gray_matter_info = "No gray matter abnormalities were observed."
        
    other_abnormalities = analysis_json['other_abnormalities'] if analysis_json['other_abnormalities'] != "none" else "No other abnormalities were noted."
    follow_up = analysis_json['follow_up_actions']
    
    summary = f"{tumor_info} {gray_matter_info} {other_abnormalities}\n\nRecommended follow-up: {follow_up}"
    
    # Extract tags for tumor type and size
    tags = {
        "tumor_type": analysis_json['tumor_detection']['type'] if analysis_json['tumor_detection']['present'] else "none",
        "tumor_size": analysis_json['tumor_detection']['size'] if analysis_json['tumor_detection']['present'] else "N/A"
    }
    
    cli.put_object(
        Bucket=S3_BUCKET,
        Key=folder + sum_name,
        Body=summary,
        ContentType="text/plain",
    )
    
    # Store tags
    tags_name = f"tags_{ts}.json"
    cli.put_object(
        Bucket=S3_BUCKET,
        Key=folder + tags_name,
        Body=json.dumps(tags, indent=4),
        ContentType="application/json",
    )

    return {
        "message": "Files uploaded successfully",
        "timestamp": ts,
        "json_file": folder + json_name,
        "image_file": folder + img_name,
        "image_url": f"http://localhost:5001/image/{ts}/mri_{ts}{img_ext}",
        "summary_file": folder + sum_name,
        "tags_file": folder + tags_name,
    }


# ----------- ROUTES ----------------------------------------------------------

@app.route("/analyze_mri", methods=["POST"])
def analyze_mri():
    if "file" not in request.files or not request.files["file"].filename:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename)
    tmp_path = Path(UPLOAD_FOLDER) / filename
    file.save(tmp_path)

    try:
        result = process_mri_scan(tmp_path)
    finally:
        try:
            tmp_path.unlink()
        except FileNotFoundError:
            pass

    status = 200 if "error" not in result else 500
    return jsonify(result), status


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    prompt = data.get("prompt", "").strip()
    ts = data.get("timestamp")  # may be None

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    analysis = get_analysis_by_timestamp(ts) if ts else get_latest_analysis()
    if not analysis:
        return jsonify({"error": "No analysis context found"}), 404

    context = analysis["context"]
    system_prompt = (
        "You are a medical AI assistant.\n"
        + json.dumps(context, indent=2)
        + f"\nUser Question: {prompt}\n"
        "Answer clearly and concisely, no markdown."
    )

    resp = model.start_chat().send_message(system_prompt)
    return jsonify({"response": resp.text})


@app.route("/history", methods=["GET"])
def history():
    try:
        cli = s3_client()
        objs = cli.list_objects_v2(Bucket=S3_BUCKET, Prefix="saved/")
        if "Contents" not in objs:
            return jsonify([])

        ctx_files = [o for o in objs["Contents"] if "context_" in o["Key"]]
        all_files = objs["Contents"]

        history = []
        for ctx in ctx_files:
            ts = ctx["Key"].split("context_")[1].split(".json")[0]
            img = next(
                (f for f in all_files if f"saved/{ts}/mri_{ts}" in f["Key"]), None
            )
            summ = next(
                (f for f in all_files if f"saved/{ts}/summary_{ts}" in f["Key"]), None
            )
            tags = next(
                (f for f in all_files if f"saved/{ts}/tags_{ts}" in f["Key"]), None
            )
            if not (img and summ):
                continue

            img_url = f"http://localhost:5001/image/{ts}/mri_{ts}.jpg"
            ctx_obj = cli.get_object(Bucket=S3_BUCKET, Key=ctx["Key"])
            ctx_json = json.loads(ctx_obj["Body"].read())

            summ_obj = cli.get_object(Bucket=S3_BUCKET, Key=summ["Key"])
            summ_txt = summ_obj["Body"].read().decode()

            tags_data = {}
            if tags:
                tags_obj = cli.get_object(Bucket=S3_BUCKET, Key=tags["Key"])
                tags_data = json.loads(tags_obj["Body"].read())

            history.append(
                {
                    "timestamp": ts,
                    "mri_url": img_url,
                    "context": ctx_json,
                    "summary": summ_txt,
                    "tags": tags_data,
                }
            )

        history.sort(key=lambda x: x["timestamp"], reverse=True)
        return jsonify(history)
    except Exception as e:
        print("History error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/run-viewer', methods=['POST'])
def run_viewer():
    print("hello")
    data = request.json
    scan_dir = data.get('scanDir', 'scan')  # Default to 'scan' if not provided
    
    # Get the latest analysis to get tumor coordinates
    analysis = get_latest_analysis()
    if not analysis:
        return jsonify({"success": False, "error": "No analysis context found"}), 404
    
    context = analysis['context']
    tumor_coords = None
    if context.get('tumor_detection', {}).get('present', False):
        tumor_coords = context['tumor_detection']['coordinates']
    
    # Convert to absolute path if it's a relative path
    if not os.path.isabs(scan_dir):
        # Define your scans directory relative to your Flask app
        scan_dir = os.path.join(os.path.dirname(__file__), 'scans', scan_dir)
    
    def run_script_async():
        try:
            # Make sure the script path is correct
            script_path = os.path.join(os.path.dirname(__file__), 'viewer.py')
            # Pass tumor coordinates as additional arguments if they exist
            cmd = [sys.executable, script_path, scan_dir]
            if tumor_coords:
                cmd.extend(['--tumor-coords', str(tumor_coords['x']), str(tumor_coords['y']), str(tumor_coords['z'])])
            print(f"Executing command: {' '.join(cmd)}")
            process = subprocess.Popen(cmd)
            # Not waiting for the process to complete
        except Exception as e:
            print(f"Error running viewer: {str(e)}")
    
    # Check if directory exists
    if not os.path.isdir(scan_dir):
        return jsonify({"success": False, "error": f"Scan directory not found: {scan_dir}"}), 404
    
    # Run in a separate thread
    thread = Thread(target=run_script_async)
    thread.daemon = True  # This ensures the thread will die when the main process exits
    thread.start()
    
    return jsonify({"success": True, "message": f"Viewer launched for scan directory: {scan_dir}"})

@app.route("/image/<timestamp>/<filename>")
def serve_image(timestamp, filename):
    """Serve images from S3 through Flask to avoid CORS issues."""
    try:
        cli = s3_client()
        key = f"saved/{timestamp}/{filename}"
        
        # Get the object from S3
        obj = cli.get_object(Bucket=S3_BUCKET, Key=key)
        
        # Create a file-like object from the S3 response
        image_data = obj['Body'].read()
        image_stream = io.BytesIO(image_data)
        image_stream.seek(0)
        
        # Determine content type
        content_type = obj.get('ContentType', 'image/jpeg')
        
        response = send_file(
            image_stream,
            mimetype=content_type,
            as_attachment=False,
            download_name=filename
        )
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        
        return response
    except Exception as e:
        print(f"Error serving image {timestamp}/{filename}: {e}")
        return jsonify({"error": "Image not found"}), 404

@app.route("/similar_cases", methods=["POST"])
def similar_cases():
    """Find similar cases for an uploaded image."""
    try:
        if "file" not in request.files or not request.files["file"].filename:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        filename = secure_filename(file.filename)
        tmp_path = Path(UPLOAD_FOLDER) / filename
        file.save(tmp_path)

        try:
            # Initialize vector search if not already done
            initialize_vector_search()
            
            # Find similar cases using real images
            result = find_similar_cases(tmp_path, top_k=8)
            
            if "error" in result:
                return jsonify(result), 500
            
            # Update image URLs to point to the real image serving endpoint
            for case in result["similar_cases"]:
                case["image_url"] = f"/real_image/{case['filename']}"
            
            return jsonify(result), 200
        finally:
            try:
                tmp_path.unlink()
            except FileNotFoundError:
                pass
    except Exception as e:
        print(f"Error in /similar_cases endpoint: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/real_image/<filename>")
def serve_real_image(filename):
    """Serve real images from the data/Testing directory."""
    try:
        # Find the image in the data/Testing directory
        for tumor_type_dir in REAL_IMAGES_ROOT.iterdir():
            if tumor_type_dir.is_dir():
                img_path = tumor_type_dir / filename
                if img_path.exists():
                    # Read and serve the image
                    with open(img_path, 'rb') as f:
                        image_data = f.read()
                    
                    response = send_file(
                        io.BytesIO(image_data),
                        mimetype='image/jpeg',
                        as_attachment=False,
                        download_name=filename
                    )
                    
                    # Add CORS headers
                    response.headers['Access-Control-Allow-Origin'] = '*'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
                    
                    return response
        
        # If image not found
        return jsonify({"error": "Image not found"}), 404
        
    except Exception as e:
        print(f"Error serving real image {filename}: {e}")
        return jsonify({"error": "Image not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
