# Kannada OCR | ಕನ್ನಡ ಓಸಿಆರ್

A browser-based Optical Character Recognition (OCR) application for Kannada and other Indic languages. Built with Tesseract.js and Vue.js.

## Features

- **Multi-language OCR** - Supports 14 Indian languages
- **PDF Support** - Upload and process multi-page PDF documents
- **Image Support** - Accepts JPG, PNG, GIF, BMP, TIFF formats
- **Drag & Drop** - Drag files directly or paste from clipboard
- **Page Navigation** - Navigate through PDF pages before processing
- **Recognize All Pages** - Batch process all pages in a PDF
- **Real-time Progress** - See OCR progress for each page
- **Text Editor** - Built-in editor with spell checker for proofreading
- **Word Diff** - Track changes made to OCR'd text
- **Unique Words** - Extract and copy unique words from OCR'd text
- **Export Options** - Export results as TXT or DOCX
- **Server Storage** - Optional: Store files and text on server for research
- **Sanchaya Styling** - Modern UI matching [fonts.sanchaya.net](https://fonts.sanchaya.net)

## Supported Languages

| Language | Code | Language | Code |
|----------|------|----------|------|
| Assamese | asm | Bengali | ben |
| Gujarati | guj | Hindi | hin |
| Kannada | kan | Malayalam | mal |
| Marathi | mar | Odia | ori |
| Punjabi | pan | Sanskrit | san |
| Sinhala | sin | Tamil | tam |
| Telugu | tel | Urdu | urd |
| English | eng | Kannada+English | kan+eng |

## Live Demo

- **Website**: [https://ocr.sanchaya.net](https://ocr.sanchaya.net)
- **GitHub Pages**: [https://sanchaya.github.io/ocrsanchaya](https://sanchaya.github.io/ocrsanchaya)

---

## Installation

### Option 1: GitHub Pages (No Server Required)

The simplest setup - all processing happens in the browser.

```bash
# Clone the repository
git clone https://github.com/sanchaya/ocrsanchaya.git
cd ocrsanchaya

# Navigate to the built app
cd ocr-kannada/dist

# Start a local server
python3 -m http.server 8080
```

Open http://localhost:8080 in your browser.

---

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/sanchaya/ocrsanchaya.git
cd ocrsanchaya/ocr-kannada

# Install npm dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

---

### Option 3: Production Build

```bash
cd ocrsanchaya/ocr-kannada

# Install dependencies and build
npm install
npm run build

# The built files will be in ocr-kannada/dist/
# Deploy the dist folder to any static hosting (Netlify, Vercel, etc.)
```

---

### Option 4: Run with Server Storage

This option stores uploaded files and OCR text on a server for research purposes.

#### Prerequisites
- Python 3.11+
- Flask

```bash
# Clone the repository
git clone https://github.com/sanchaya/ocrsanchaya.git
cd ocrsanchaya

# Install Python dependencies
pip install -r requirements.txt

# Create required directories
mkdir -p uploads texts research

# Start the Flask server
python server.py
```

The server will start on http://localhost:5001.

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload image/PDF |
| `/api/save-text` | POST | Save OCR text |
| `/api/ocr-results` | GET | List OCR results |
| `/api/stats` | GET | Storage statistics |
| `/uploads/<filename>` | GET | Serve uploaded files |
| `/texts/<filename>` | GET | Serve text files |

**To connect the frontend to the server:**

Edit `ocr-kannada/src/App.vue` and set the server URL:

```javascript
const SERVER_URL = 'https://ocr-server.sanchaya.net'; // or your server URL
```

Then rebuild: `npm run build` and deploy.

---

### Option 5: Docker (Local)

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Server runs on http://localhost:5001

---

### Option 6: Coolify Deployment

[Coolify](https://coolify.io) is a self-hostable Heroku alternative.

#### Step 1: Create a New Project in Coolify

1. Log in to your Coolify dashboard
2. Create a new project

#### Step 2: Add a Docker Resource

1. Click **Add New Resource** → **Docker**
2. Configure:
   - **Repository**: `https://github.com/sanchaya/ocrsanchaya`
   - **Branch**: `master`
   - **Port**: `5001`

3. Save the resource

#### Step 3: Configure Volumes (Important!)

Add these persistent volumes to preserve data:

| Host Path | Container Path |
|-----------|----------------|
| `/app/uploads` | `/app/uploads` |
| `/app/texts` | `/app/texts` |
| `/app/research` | `/app/research` |

Or use the included `coolify.json` configuration:
- The `coolify.json` file in this repo will auto-configure these settings when you import it.

#### Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete
3. Your OCR server is now running!

#### Updating the Server

Simply push new code to GitHub and redeploy in Coolify:
```bash
git add -A
git commit -m "Update"
git push origin master
```

Then click **Redeploy** in Coolify.

---

## Usage

1. **Upload Image/PDF** - Drag & drop, paste from clipboard, or click to select file
2. **Select Language** - Choose from the dropdown (default: Kannada)
3. **Recognize** - Click "Recognize" for single page, or "Recognize All Pages" for PDFs
4. **Edit Text** - Use the built-in editor to correct OCR errors
5. **Track Changes** - See word diff when editing text
6. **Extract Words** - Click "Unique Words" to get all unique words
7. **Export** - Save as TXT or DOCX file
8. **Server Storage** - If configured, files and text are saved to the server

---

## Project Structure

```
ocrsanchaya/
├── server.py              # Flask server for file storage
├── requirements.txt       # Python dependencies
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Docker Compose config
├── coolify.json          # Coolify configuration
├── README.md              # This file
├── ocr-kannada/
│   ├── src/
│   │   ├── App.vue        # Main Vue component
│   │   └── components/
│   │       └── ImageLoader.vue  # Image/PDF loader
│   ├── public/
│   │   └── CNAME          # Custom domain config
│   └── dist/              # Built production files
└── research/               # OCR results storage (server)
    └── ocr_results.json
```

---

## Environment Variables

When running the server, these directories are created automatically:

- `uploads/` - Stores uploaded images/PDFs
- `texts/` - Stores generated OCR text files
- `research/` - Stores metadata (JSON)

---

## Technologies

- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR engine
- [Vue.js 3](https://vuejs.org/) - Frontend framework
- [TinyMCE](https://www.tiny.cloud/) - Rich text editor
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [Flask](https://flask.palletsprojects.com/) - Python web server
- [Docker](https://www.docker.com/) - Containerization

---

## Credits

- [Swathanthra Malayalam Computing (SMC)](https://smc.org.in) - For the tesseract-ocr-web project
- [Sanchaya](https://sanchaya.net) - For the design system
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) - OCR engine
- [Sanchi Foundation](https://sanchifoundation.org) - For supporting Indic language technology

---

## License

MIT License
