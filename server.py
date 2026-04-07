#!/usr/bin/env python3
import os
import uuid
import json
import base64
import tempfile
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pytesseract
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

STORAGE_DIR = Path(__file__).parent / "storage"
STORAGE_DIR.mkdir(exist_ok=True)

OCR_ENGINES = {
    'tesseract': 'tesseract',
    'easyocr': 'easyocr'
}

LANGUAGE_CODES = {
    'kan': 'kan',
    'eng': 'eng',
    'hin': 'hin',
    'san': 'san',
    'tam': 'tam',
    'tel': 'tel',
    'kan+eng+hin': 'kan+eng+hin',
    'asm': 'asm',
    'ben': 'ben',
    'mal': 'mal'
}

SCRIPT_PATTERNS = {
    'kannada': r'[\u0C80-\u0CFF]',
    'devanagari': r'[\u0900-\u097F]',
    'tamil': r'[\u0B80-\u0BFF]',
    'telugu': r'[\u0C00-\u0C7F]',
    'malayalam': r'[\u0D00-\u0D7F]',
    'english': r'[a-zA-Z]'
}

def detect_scripts(text):
    import re
    detected = []
    for script, pattern in SCRIPT_PATTERNS.items():
        if re.search(pattern, text):
            detected.append(script)
    return detected if detected else ['unknown']

def parse_hocr_bbox(title):
    import re
    match = re.search(r'bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)', title)
    if match:
        return {
            'left': int(match.group(1)),
            'top': int(match.group(2)),
            'right': int(match.group(3)),
            'bottom': int(match.group(4))
        }
    return None

def hocr_to_structured_text(hocr_text, preserve_formatting=True):
    import re
    from html.parser import HTMLParser
    
    lines = []
    current_block = []
    block_info = {}
    
    line_pattern = re.compile(r'<span class=["\']ocr_line["\'][^>]*title="([^"]*)"[^>]*>(.*?)</span>', re.DOTALL)
    word_pattern = re.compile(r'<span class=["\']ocrx_word["\'][^>]*title="([^"]*)"[^>]*>([^<]*)</span>', re.DOTALL)
    
    for line_match in line_pattern.finditer(hocr_text):
        line_title = line_match.group(1)
        line_content = line_match.group(2)
        bbox = parse_hocr_bbox(line_title)
        
        words = []
        for word_match in word_pattern.finditer(line_content):
            word_title = word_match.group(1)
            word_text = word_match.group(2).strip()
            word_bbox = parse_hocr_bbox(word_title)
            if word_text:
                words.append({
                    'text': word_text,
                    'bbox': word_bbox,
                    'scripts': detect_scripts(word_text)
                })
        
        line_text = ' '.join([w['text'] for w in words])
        if line_text.strip():
            lines.append({
                'text': line_text,
                'bbox': bbox,
                'words': words,
                'scripts': detect_scripts(line_text)
            })
    
    if not preserve_formatting:
        return '\n'.join([line['text'] for line in lines])
    
    result = []
    last_scripts = None
    
    for line in lines:
        current_scripts = line['scripts']
        
        if last_scripts and set(last_scripts) != set(current_scripts):
            result.append(f'\n[Scripts: {", ".join(current_scripts)}]\n')
        
        if 'kannada' in current_scripts and 'english' in current_scripts:
            mixed_line = []
            for word in line['words']:
                if 'kannada' in word['scripts']:
                    mixed_line.append(f'<span class="kannada">{word["text"]}</span>')
                elif 'english' in word['scripts']:
                    mixed_line.append(f'<span class="english">{word["text"]}</span>')
                else:
                    mixed_line.append(word['text'])
            result.append(' '.join(mixed_line))
        else:
            result.append(line['text'])
        
        last_scripts = current_scripts
    
    return '\n'.join(result)

def perform_ocr(image_data, language='kan', output_format='text', engine='tesseract'):
    try:
        img = Image.open(io.BytesIO(image_data))
        
        if img.mode not in ('L', 'RGB'):
            img = img.convert('RGB')
        
        lang_code = LANGUAGE_CODES.get(language, 'kan')
        
        if output_format == 'hocr':
            text = pytesseract.image_to_pdf_or_hocr(img, lang_code, extension='hocr')
            structured = hocr_to_structured_text(text.decode('utf-8'), True)
            return {
                'text': structured,
                'raw_text': text.decode('utf-8'),
                'hocr': text.decode('utf-8'),
                'scripts': detect_scripts(structured),
                'format': 'hocr'
            }
        else:
            text = pytesseract.image_to_string(img, lang=lang_code)
            return {
                'text': text,
                'scripts': detect_scripts(text),
                'format': 'text'
            }
            
    except Exception as e:
        return {'error': str(e)}

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'engines': list(OCR_ENGINES.keys()),
        'languages': list(LANGUAGE_CODES.keys())
    })

@app.route('/api/ocr', methods=['POST'])
def ocr():
    if 'image' not in request.files and 'image' not in request.form:
        return jsonify({'error': 'No image provided'}), 400
    
    try:
        language = request.form.get('language', 'kan')
        output_format = request.form.get('format', 'text')
        engine = request.form.get('engine', 'tesseract')
        
        if 'image' in request.files:
            image_file = request.files['image']
            image_data = image_file.read()
        else:
            image_data = base64.b64decode(request.form['image'])
        
        result = perform_ocr(image_data, language, output_format, engine)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix.lower()
    
    storage_path = STORAGE_DIR / file_id
    storage_path.mkdir(exist_ok=True)
    
    file_path = storage_path / f'original{file_ext}'
    file.save(file_path)
    
    metadata = {
        'file_id': file_id,
        'original_filename': file.filename,
        'stored_path': str(file_path),
        'upload_time': datetime.now().isoformat()
    }
    
    with open(storage_path / 'metadata.json', 'w') as f:
        json.dump(metadata, f)
    
    return jsonify({
        'file_id': file_id,
        'status': 'uploaded'
    })

@app.route('/api/save-text', methods=['POST'])
def save_text():
    data = request.get_json()
    file_id = data.get('file_id')
    text = data.get('text', '')
    language = data.get('language', 'kan')
    engine = data.get('engine', 'tesseract')
    
    if not file_id:
        file_id = str(uuid.uuid4())
        storage_path = STORAGE_DIR / file_id
        storage_path.mkdir(exist_ok=True)
    else:
        storage_path = STORAGE_DIR / file_id
        if not storage_path.exists():
            storage_path.mkdir(exist_ok=True)
    
    result_data = {
        'file_id': file_id,
        'text': text,
        'language': language,
        'engine': engine,
        'save_time': datetime.now().isoformat()
    }
    
    with open(storage_path / 'result.json', 'w') as f:
        json.dump(result_data, f, ensure_ascii=False)
    
    return jsonify({'status': 'saved', 'file_id': file_id})

@app.route('/api/get-text/<file_id>', methods=['GET'])
def get_text(file_id):
    storage_path = STORAGE_DIR / file_id
    result_path = storage_path / 'result.json'
    
    if not result_path.exists():
        return jsonify({'error': 'Text not found'}), 404
    
    with open(result_path, 'r') as f:
        result_data = json.load(f)
    
    return jsonify(result_data)

@app.route('/api/file/<file_id>', methods=['GET'])
def get_file(file_id):
    storage_path = STORAGE_DIR / file_id
    metadata_path = storage_path / 'metadata.json'
    
    if not metadata_path.exists():
        return jsonify({'error': 'File not found'}), 404
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    original_path = Path(metadata['stored_path'])
    if not original_path.exists():
        return jsonify({'error': 'Original file not found'}), 404
    
    return send_from_directory(original_path.parent, original_path.name)

@app.route('/api/files', methods=['GET'])
def list_files():
    files = []
    for item in STORAGE_DIR.iterdir():
        if item.is_dir():
            metadata_path = item / 'metadata.json'
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    files.append(json.load(f))
    
    files.sort(key=lambda x: x.get('upload_time', ''), reverse=True)
    return jsonify({'files': files[:100]})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
