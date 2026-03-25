#!/usr/bin/env python3
"""
Simple Flask server for storing OCR results.
Stores OCR output and corrected text for research purposes.
Optional: Chandra OCR support (requires chandra-ocr package)
"""

import os
import json
import uuid
import tempfile
import subprocess
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Research folder path
RESEARCH_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'research')
OCR_RESULTS_FILE = os.path.join(RESEARCH_DIR, 'ocr_results.json')
CORRECTED_WORDS_FILE = os.path.join(RESEARCH_DIR, 'corrected_words.json')

# Check if Chandra is available
CHANDRA_AVAILABLE = False
try:
    import chandra
    CHANDRA_AVAILABLE = True
except ImportError:
    print("Chandra not installed. Install with: pip install chandra-ocr")
    CHANDRA_AVAILABLE = False

# Create research directory if not exists
os.makedirs(RESEARCH_DIR, exist_ok=True)

# Initialize files if not exist
if not os.path.exists(OCR_RESULTS_FILE):
    with open(OCR_RESULTS_FILE, 'w') as f:
        json.dump([], f)

if not os.path.exists(CORRECTED_WORDS_FILE):
    with open(CORRECTED_WORDS_FILE, 'w') as f:
        json.dump([], f)


def get_client_ip():
    """Get client IP address."""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr or 'unknown'


def load_json_file(filepath):
    """Load JSON data from file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_json_file(filepath, data):
    """Save JSON data to file."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.route('/api/save-ocr', methods=['POST'])
def save_ocr():
    """Save OCR result to research folder."""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        ocr_text = data.get('text', '')
        language = data.get('language', 'unknown')
        engine = data.get('engine', 'tesseract')
        
        client_ip = get_client_ip()
        user_agent = request.headers.get('User-Agent', 'unknown')
        
        entry = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'ip': client_ip,
            'user_agent': user_agent,
            'language': language,
            'engine': engine,
            'text': ocr_text,
            'text_length': len(ocr_text),
            'word_count': len(ocr_text.split()) if ocr_text else 0
        }
        
        # Load existing results
        results = load_json_file(OCR_RESULTS_FILE)
        results.append(entry)
        
        # Keep only last 1000 entries to prevent file from growing too large
        if len(results) > 1000:
            results = results[-1000:]
        
        save_json_file(OCR_RESULTS_FILE, results)
        
        return jsonify({
            'success': True, 
            'id': entry['id'],
            'message': 'OCR result saved successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/save-corrected', methods=['POST'])
def save_corrected():
    """Save corrected words to research folder."""
    try:
        data = request.get_json()
        
        if not data or 'originalText' not in data or 'correctedText' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        original_text = data.get('originalText', '')
        corrected_text = data.get('correctedText', '')
        
        client_ip = get_client_ip()
        user_agent = request.headers.get('User-Agent', 'unknown')
        
        # Find differences (corrected words)
        original_words = set(original_text.lower().split())
        corrected_words = set(corrected_text.lower().split())
        
        added_words = corrected_words - original_words
        removed_words = original_words - corrected_words
        
        entry = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'ip': client_ip,
            'user_agent': user_agent,
            'original_length': len(original_text),
            'corrected_length': len(corrected_text),
            'original_word_count': len(original_words),
            'corrected_word_count': len(corrected_words),
            'added_words': list(added_words),
            'removed_words': list(removed_words),
            'original_text': original_text[:500] if original_text else '',  # Store first 500 chars
            'corrected_text': corrected_text[:500] if corrected_text else ''
        }
        
        # Load existing corrected words
        corrected_words_list = load_json_file(CORRECTED_WORDS_FILE)
        corrected_words_list.append(entry)
        
        # Keep only last 1000 entries
        if len(corrected_words_list) > 1000:
            corrected_words_list = corrected_words_list[-1000:]
        
        save_json_file(CORRECTED_WORDS_FILE, corrected_words_list)
        
        return jsonify({
            'success': True, 
            'id': entry['id'],
            'message': 'Corrected words saved successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about stored OCR results."""
    try:
        ocr_results = load_json_file(OCR_RESULTS_FILE)
        corrected = load_json_file(CORRECTED_WORDS_FILE)
        
        total_ocr = len(ocr_results)
        total_corrected = len(corrected)
        
        # Get unique IPs
        unique_ips = set(entry.get('ip') for entry in ocr_results if entry.get('ip'))
        
        return jsonify({
            'total_ocr_results': total_ocr,
            'total_corrected': total_corrected,
            'unique_ips': len(unique_ips),
            'recent_results': ocr_results[-10:] if ocr_results else []
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/research/')
def research_index():
    """Serve research folder index."""
    return send_from_directory(RESEARCH_DIR, 'ocr_results.json')


@app.route('/api/ocr-chandra', methods=['POST'])
def ocr_chandra():
    """OCR using Chandra (server-side). Requires chandra-ocr package."""
    if not CHANDRA_AVAILABLE:
        return jsonify({
            'error': 'Chandra not installed. Install with: pip install chandra-ocr[hf]',
            'available': False
        }), 500
    
    try:
        data = request.get_json()
        
        if not data or 'imageUrl' not in data:
            return jsonify({'error': 'No image URL provided'}), 400
        
        image_url = data.get('imageUrl')
        language = data.get('language', 'kan')
        
        client_ip = get_client_ip()
        
        # Download the image
        import requests
        print(f"Downloading image from: {image_url}")
        response = requests.get(image_url)
        if response.status_code != 200:
            return jsonify({'error': f'Failed to download image: {response.status_code}'}), 400
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name
        
        try:
            # Run Chandra OCR using subprocess
            import subprocess
            
            output_dir = tempfile.mkdtemp()
            
            result = subprocess.run(
                ['chandra', tmp_path, output_dir, '--method', 'hf'],
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            print(f"Chandra stdout: {result.stdout}")
            print(f"Chandra stderr: {result.stderr}")
            
            if result.returncode != 0:
                return jsonify({
                    'error': f'Chandra OCR failed: {result.stderr}',
                    'stdout': result.stdout
                }), 500
            
            # Read the output
            output_file = os.path.join(output_dir, os.path.basename(tmp_path) + '.md')
            if os.path.exists(output_file):
                with open(output_file, 'r', encoding='utf-8') as f:
                    result_text = f.read()
            else:
                # Try to find any .md file
                md_files = [f for f in os.listdir(output_dir) if f.endswith('.md')]
                if md_files:
                    with open(os.path.join(output_file, md_files[0]), 'r', encoding='utf-8') as f:
                        result_text = f.read()
                else:
                    result_text = "[No text extracted]"
            
            # Cleanup
            import shutil
            shutil.rmtree(output_dir, ignore_errors=True)
            
            return jsonify({
                'success': True,
                'text': result_text,
                'engine': 'chandra',
                'language': language
            })
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Chandra OCR timed out (5 min limit)'}), 500
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/engines', methods=['GET'])
def get_engines():
    """Get available OCR engines."""
    return jsonify({
        'engines': [
            {'id': 'tesseract', 'name': 'Tesseract.js', 'type': 'client-side', 'status': 'available'},
            {'id': 'chandra', 'name': 'Chandra OCR 2', 'type': 'server-side', 'status': 'available' if CHANDRA_AVAILABLE else 'not_installed'},
        ],
        'chandra_available': CHANDRA_AVAILABLE
    })


if __name__ == '__main__':
    print(f"Starting OCR Research Server...")
    print(f"Research directory: {RESEARCH_DIR}")
    print(f"Chandra available: {CHANDRA_AVAILABLE}")
    print(f"OCR results file: {OCR_RESULTS_FILE}")
    print(f"Corrected words file: {CORRECTED_WORDS_FILE}")
    app.run(host='0.0.0.0', port=5001, debug=True)
