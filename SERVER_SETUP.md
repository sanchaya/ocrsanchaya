# OCR Server Setup Guide

This document provides instructions for setting up and deploying the OCR server for the Sanchaya Kannada OCR system.

## Prerequisites

- Python 3.9+
- Tesseract OCR engine
- Ubuntu 20.04+ / Debian / macOS

## System Dependencies

### Ubuntu/Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Tesseract OCR and language data
sudo apt install -y tesseract-ocr
sudo apt install -y tesseract-ocr-kan  # Kannada
sudo apt install -y tesseract-ocr-eng   # English
sudo apt install -y tesseract-ocr-hin  # Hindi
sudo apt install -y tesseract-ocr-san  # Sanskrit
sudo apt install -y tesseract-ocr-tam  # Tamil
sudo apt install -y tesseract-ocr-tel  # Telugu

# Install additional dependencies
sudo apt install -y libpq-dev poppler-utils
```

### macOS

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Tesseract with language data
brew install tesseract
brew install tesseract-lang

# Verify installation
tesseract --version
```

### Verify Tesseract Installation

```bash
# List installed languages
tesseract --list-langs

# Should include: kan, eng, hin, san, tam, tel
```

## Application Setup

### 1. Clone/Create the server directory

```bash
mkdir -p ocr-server
cd ocr-server
```

### 2. Create virtual environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Test the server locally

```bash
# Run the development server
python server.py

# Server will start on http://localhost:5000
```

### 5. Verify server is running

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-07T...",
  "engines": ["tesseract"],
  "languages": ["kan", "eng", "hin", "san", "tam", "tel"]
}
```

## Deployment Options

### Option 1: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-kan \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

# Create storage directory
RUN mkdir -p /app/storage

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "2", "server:app"]
```

Build and run:
```bash
docker build -t ocr-server .
docker run -d -p 5000:5000 --name ocr-server \
  -v ocr-storage:/app/storage \
  ocr-server
```

### Option 2: Coolify Deployment

1. Create a new application in Coolify
2. Connect your Git repository
3. Set build pack to Docker
4. Add environment variables:
   ```
   PORT=5000
   FLASK_DEBUG=false
   ```
5. Deploy

### Option 3: Traditional Server with Gunicorn

```bash
# Install nginx
sudo apt install -y nginx

# Create systemd service
sudo nano /etc/systemd/system/ocr-server.service
```

Contents of `ocr-server.service`:
```ini
[Unit]
Description=OCR Server
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/ocr-server
Environment="PATH=/var/www/ocr-server/venv/bin"
ExecStart=/var/www/ocr-server/venv/bin/gunicorn \
    --workers 4 \
    --threads 2 \
    --bind unix:/var/www/ocr-server/ocr-server.sock \
    server:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Setup commands:
```bash
# Copy application
sudo cp -r /path/to/ocr-server /var/www/
sudo chown -R www-data:www-data /var/www/ocr-server

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ocr-server
sudo systemctl start ocr-server

# Configure nginx
sudo nano /etc/nginx/sites-available/ocr-server
```

Nginx config:
```nginx
server {
    listen 80;
    server_name ocr-server.example.com;

    location / {
        include proxy_params;
        proxy_pass http://unix:/var/www/ocr-server/ocr-server.sock;
    }

    location /api/ {
        proxy_pass http://unix:/var/www/ocr-server/ocr-server.sock;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ocr-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ocr-server.example.com
```

## API Endpoints

### Health Check
```
GET /api/health
```

### OCR Processing
```
POST /api/ocr
Content-Type: multipart/form-data

Parameters:
- image: Image file (required)
- language: Language code (default: kan)
- format: Output format - 'text' or 'hocr' (default: text)
- engine: OCR engine (default: tesseract)

Response:
{
  "text": "Recognized text...",
  "scripts": ["kannada", "english"],
  "hocr": "<?xml version=\"1.0\"...>",
  "raw_text": "...",
  "format": "hocr"
}
```

### File Upload
```
POST /api/upload
Content-Type: multipart/form-data

Parameters:
- file: File to upload

Response:
{
  "file_id": "uuid",
  "status": "uploaded"
}
```

### Save OCR Result
```
POST /api/save-text
Content-Type: application/json

{
  "file_id": "uuid",
  "text": "OCR result...",
  "language": "kan",
  "engine": "tesseract"
}

Response:
{
  "status": "saved",
  "file_id": "uuid"
}
```

## Troubleshooting

### Tesseract not found
```bash
# Check if tesseract is installed
which tesseract
tesseract --version

# If not found, reinstall
sudo apt reinstall tesseract-ocr
```

### Permission errors
```bash
# Fix storage directory permissions
sudo chown -R www-data:www-data /var/www/ocr-server/storage
sudo chmod -R 755 /var/www/ocr-server/storage
```

### Memory issues with large images
Edit `server.py` and add image resizing before OCR:
```python
def perform_ocr(image_data, language='kan', output_format='text', engine='tesseract'):
    img = Image.open(io.BytesIO(image_data))
    
    # Resize if too large
    max_size = (4000, 4000)
    if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
```

### Language not found
```bash
# List available languages
tesseract --list-langs

# Install missing language
sudo apt install tesseract-ocr-<lang_code>

# Common language codes:
# kan - Kannada
# eng - English
# hin - Hindi
# san - Sanskrit
# tam - Tamil
# tel - Telugu
# ben - Bengali
# mal - Malayalam
# asm - Assamese
```

## Monitoring

### View logs with systemd
```bash
sudo journalctl -u ocr-server -f
```

### Check server status
```bash
sudo systemctl status ocr-server
```

### View application logs
```bash
tail -f /var/www/ocr-server/storage/logs/access.log
```
