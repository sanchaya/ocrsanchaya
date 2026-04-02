#!/usr/bin/env python3
"""
Flask server for storing OCR files and results.
Stores uploaded images/PDFs and generated text for research purposes.
"""

import os
import json
import uuid
import hashlib
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
TEXT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'texts')
RESEARCH_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'research')
OCR_RESULTS_FILE = os.path.join(RESEARCH_DIR, 'ocr_results.json')

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TEXT_FOLDER, exist_ok=True)
os.makedirs(RESEARCH_DIR, exist_ok=True)

# Initialize files
if not os.path.exists(OCR_RESULTS_FILE):
    with open(OCR_RESULTS_FILE, 'w') as f:
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


def get_file_extension(filename):
    """Get file extension from filename."""
    return os.path.splitext(filename)[1].lower()


def generate_unique_filename(original_filename):
    """Generate unique filename using timestamp and hash."""
    ext = get_file_extension(original_filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    short_hash = hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:8]
    return f"{timestamp}_{short_hash}{ext}"


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload image/PDF file to server."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        # Generate unique filename
        unique_filename = generate_unique_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        # Save file
        file.save(file_path)
        
        file_size = os.path.getsize(file_path)
        
        return jsonify({
            'success': True,
            'file_id': unique_filename,
            'original_filename': file.filename,
            'file_path': f'/uploads/{unique_filename}',
            'size': file_size,
            'message': 'File uploaded successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/uploads/<filename>')
def serve_uploaded_file(filename):
    """Serve uploaded files."""
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route('/api/save-text', methods=['POST'])
def save_text():
    """Save OCR text to server."""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        ocr_text = data.get('text', '')
        language = data.get('language', 'unknown')
        engine = data.get('engine', 'tesseract')
        file_id = data.get('file_id', '')
        
        # Generate unique ID for text file
        text_id = str(uuid.uuid4())
        text_filename = f"{text_id}.txt"
        text_path = os.path.join(TEXT_FOLDER, text_filename)
        
        # Save text to file
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(ocr_text)
        
        client_ip = get_client_ip()
        user_agent = request.headers.get('User-Agent', 'unknown')
        
        entry = {
            'id': text_id,
            'timestamp': datetime.now().isoformat(),
            'ip': client_ip,
            'user_agent': user_agent,
            'language': language,
            'engine': engine,
            'file_id': file_id,
            'text_file': text_filename,
            'text': ocr_text[:500],  # Store first 500 chars in JSON
            'text_length': len(ocr_text),
            'word_count': len(ocr_text.split()) if ocr_text else 0
        }
        
        # Load existing results
        results = load_json_file(OCR_RESULTS_FILE)
        results.append(entry)
        
        # Keep only last 1000 entries
        if len(results) > 1000:
            results = results[-1000:]
        
        save_json_file(OCR_RESULTS_FILE, results)
        
        return jsonify({
            'success': True,
            'text_id': text_id,
            'text_file': f'/texts/{text_filename}',
            'message': 'Text saved successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/texts/<filename>')
def serve_text_file(filename):
    """Serve text files."""
    return send_from_directory(TEXT_FOLDER, filename, mimetype='text/plain')


@app.route('/api/ocr-results', methods=['GET'])
def get_ocr_results():
    """Get list of OCR results."""
    try:
        results = load_json_file(OCR_RESULTS_FILE)
        return jsonify({
            'total': len(results),
            'results': results[-50:]  # Last 50 results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ocr-results/<result_id>', methods=['GET'])
def get_ocr_result(result_id):
    """Get specific OCR result."""
    try:
        results = load_json_file(OCR_RESULTS_FILE)
        for result in results:
            if result.get('id') == result_id:
                return jsonify(result)
        return jsonify({'error': 'Result not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about stored OCR results."""
    try:
        results = load_json_file(OCR_RESULTS_FILE)
        
        total = len(results)
        unique_ips = set(entry.get('ip') for entry in results if entry.get('ip'))
        
        # Language distribution
        languages = {}
        for entry in results:
            lang = entry.get('language', 'unknown')
            languages[lang] = languages.get(lang, 0) + 1
        
        return jsonify({
            'total_ocr_results': total,
            'unique_ips': len(unique_ips),
            'total_uploads': len([r for r in results if r.get('file_id')]),
            'languages': languages,
            'storage': {
                'uploads': len(os.listdir(UPLOAD_FOLDER)) if os.path.exists(UPLOAD_FOLDER) else 0,
                'texts': len(os.listdir(TEXT_FOLDER)) if os.path.exists(TEXT_FOLDER) else 0
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/engines', methods=['GET'])
def get_engines():
    """Get available OCR engines."""
    return jsonify({
        'engines': [
            {'id': 'tesseract', 'name': 'Tesseract.js', 'type': 'client-side', 'status': 'available'},
        ],
        'server_storage': 'available'
    })


if __name__ == '__main__':
    print(f"Starting OCR Server...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Text folder: {TEXT_FOLDER}")
    print(f"Research directory: {RESEARCH_DIR}")
    app.run(host='0.0.0.0', port=5001, debug=True)