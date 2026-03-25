# Kannada OCR | ಕನ್ನಡ ಓಸಿಆರ್

A browser-based Optical Character Recognition (OCR) application for Kannada and other Indic languages. Built with Tesseract.js and Vue.js, inspired by [SMC tesseract-ocr-web](https://gitlab.com/smc/tesseract-ocr-web).

## Features

- **Multi-language OCR** - Supports Kannada, English, Hindi, Sanskrit, Tamil, Telugu
- **PDF Support** - Upload and process multi-page PDF documents
- **Image Support** - Accepts JPG, PNG, GIF, BMP, TIFF formats
- **Drag & Drop** - Drag files directly or paste from clipboard
- **Page Navigation** - Navigate through PDF pages before processing
- **Recognize All Pages** - Batch process all pages in a PDF
- **Real-time Progress** - See OCR progress for each page
- **Text Editor** - Built-in editor with spell checker for proofreading
- **Word Diff** - Track changes made to OCR'd text (added/removed words)
- **Unique Words** - Extract and copy unique words from OCR'd text
- **Export Options** - Export results as TXT or DOCX
- **Privacy First** - All processing happens in your browser, no data sent to servers
- **Sanchaya Styling** - Modern UI matching [fonts.sanchaya.net](https://fonts.sanchaya.net)

## Supported Languages

- Kannada (ಕನ್ನಡ)
- Kannada + English + Devanagari
- English
- Hindi (ದೇವನಾಗರಿ)
- Sanskrit (ಸಂಸ್ಕೃತ)
- Tamil (தமிழ்)
- Telugu (తెలుగు)

## Installation

### Option 1: Run Built Version (Frontend Only)

```bash
# Clone the repository
git clone https://github.com/sanchaya/ocrsanchaya.git
cd ocrsanchaya

# Navigate to the built app
cd ocr-kannada/dist

# Start a local server (Python)
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

### Option 2: Run with Research Server (Stores OCR Results)

This option saves OCR results to a `research/` folder for analysis.

```bash
# Clone the repository
git clone https://github.com/sanchaya/ocrsanchaya.git
cd ocrsanchaya

# Install Python dependencies
pip3 install flask flask-cors requests

# Start the Flask server (runs on port 5001)
python3 server.py

# In another terminal, start the frontend
cd ocr-kannada/dist
python3 -m http.server 8080
```

- App: http://localhost:8080
- API: http://localhost:5001

### Option 3: Development Mode

```bash
# Clone the repository
git clone https://github.com/sanchaya/ocrsanchaya.git
cd ocrsanchaya/ocr-kannada

# Install dependencies
npm install

# Start development server
npm run dev
```

Then open http://localhost:5173 in your browser.

### Option 4: Build for Production

```bash
cd ocrsanchaya/ocr-kannada

# Install dependencies
npm install

# Build for production
npm run build

# The built files will be in ocr-kannada/dist/
```

## Usage

1. **Upload Image/PDF** - Drag & drop, paste from clipboard, or click to select file
2. **Select Language** - Choose from the dropdown (default: Kannada)
3. **Recognize** - Click "Recognize" for single page, or "Recognize All Pages" for PDFs
4. **Edit Text** - Use the built-in editor to correct OCR errors
5. **Track Changes** - See word diff when editing text
6. **Extract Words** - Click "Unique Words" to get all unique words
7. **Export** - Save as TXT or DOCX file

## Research Data

When running with the Flask server (Option 2), OCR results are stored in the `research/` folder:

- **ocr_results.json** - Stores all OCR outputs with:
  - Timestamp
  - IP address (for research analytics)
  - Language and engine used
  - Text content and word count

- **corrected_words.json** - Stores user corrections:
  - Added/removed words
  - Original and corrected text
  - IP address

View stats: http://localhost:5001/api/stats

- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR engine
- [Vue.js 3](https://vuejs.org/) - Frontend framework
- [TinyMCE](https://www.tiny.cloud/) - Rich text editor
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [SMC tesseract-ocr-web](https://gitlab.com/smc/tesseract-ocr-web) - Inspiration

## Credits

- [Swathanthra Malayalam Computing (SMC)](https://smc.org.in) - For the tesseract-ocr-web project
- [Sanchaya](https://sanchaya.net) - For the design system
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) - OCR engine

## License

MIT License
