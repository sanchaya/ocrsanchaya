# OCR Sanchaya — Codebase Documentation

> A browser-based Optical Character Recognition (OCR) application for Kannada and 14+ Indic languages. Built with Tesseract.js and Vue.js 3.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Frontend: Vue.js App (`ocr-kannada/`)](#3-frontend-vuejs-app-ocr-kannada)
4. [Frontend: Static HTML App (`index.html`)](#4-frontend-static-html-app-indexhtml)
5. [Backend: Flask Server (`server.py`)](#5-backend-flask-server-serverpy)
6. [Deployment & Operations](#6-deployment--operations)
7. [API Reference](#7-api-reference)
8. [Data Flow](#8-data-flow)
9. [Contributing & Development](#9-contributing--development)

---

## 1. Architecture Overview

The project contains **two independent frontends** sharing a common backend:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (2 variants)                    │
│                                                                 │
│  ┌──────────────────────────┐   ┌────────────────────────────┐  │
│  │   Static HTML App        │   │   Vue 3 SPA (ocr-kannada/) │  │
│  │   index.html + JS        │   │   Vite + TinyMCE + TS      │  │
│  │   (simple, no build)     │   │   (full-featured editor)   │  │
│  └──────────┬───────────────┘   └──────────────┬─────────────┘  │
│             │                                   │               │
│             └─────────── Tesseract.js ──────────┘               │
│                       (OCR in browser)                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (Flask, port 5001)                     │
│                                                                 │
│  /api/upload     →  Stores images/PDFs                          │
│  /api/save-text  →  Stores OCR text results                     │
│  /api/stats      →  Storage statistics                          │
│  /api/engines    →  Available OCR engines                       │
└─────────────────────────────────────────────────────────────────┘
```

**Key principle**: All OCR processing runs **client-side** in the browser via Tesseract.js (WebAssembly). The server is purely for optional storage of uploads and results for research purposes.

---

## 2. Project Structure

```
ocrsanchaya/
│
├── server.py                 # Flask backend (port 5001)
├── requirements.txt          # Python deps: Flask, Flask-CORS
├── Dockerfile                # Docker image (python:3.11-slim)
├── docker-compose.yml        # Compose with persistent volumes
├── coolify.json              # Coolify deployment config
├── deploy.sh                 # GitHub Pages deploy script
├── DOCUMENTATION.md          # This document
├── docs/index.html           # HTML version of documentation
│
├── index.html                # Static HTML frontend (simple)
├── js/                       # JS for static frontend
│   ├── tesseract.min.js      # Tesseract.js library
│   ├── tesseract-core.wasm.js# WASM core for modern browsers
│   ├── tesseract-core.asm.js # ASM.js fallback for Edge
│   └── tesseract-ocr.js      # OCR logic, PDF processing, export
│
├── style/
│   └── ocr.css               # Styles for static frontend
│
├── images/                   # Default images for demo
│   ├── sanchaya-logo.png
│   ├── sanchaya.png
│   └── kan-ocr-test.png
│
├── uploads/                  # Uploaded files (server storage)
├── texts/                    # OCR text output (server storage)
├── research/                 # Research metadata
│   ├── ocr_results.json      # OCR results log
│   └── corrected_words.json  # Manually corrected words
│
├── ocr-kannada/              # Vue 3 SPA frontend
│   ├── package.json          # npm deps
│   ├── vite.config.js        # Vite config (port 3000)
│   ├── tsconfig.json         # TypeScript config
│   ├── index.html            # SPA entry point
│   ├── src/
│   │   ├── main.js           # Vue app bootstrap
│   │   ├── App.vue           # Root component (full app)
│   │   └── components/
│   │       └── ImageLoader.vue # Image/PDF drag-drop & render
│   ├── public/
│   │   ├── CNAME             # Custom domain: ocr.sanchaya.net
│   │   ├── favicon.ico
│   │   ├── robots.txt
│   │   ├── _redirects        # SPA redirect rules
│   │   ├── img/
│   │   └── js/tinymce/       # TinyMCE rich text editor
│   └── dist/                 # Production build output
│
└── README.md                 # Existing README
```

---

## 3. Frontend: Vue.js App (`ocr-kannada/`)

### 3.1 Overview

A full-featured Single Page Application (SPA) built with **Vue 3** + **Vite** + **TypeScript**. It includes a rich text editor (TinyMCE) with Kannada spellcheck, PDF page navigation, word diff tracking, unique word extraction, per-page editing with page-linked editor, multi-format export (TXT, DOCX, hOCR, HTML layout, TSV), **word-level styled HTML preservation** (bold, italic, font size from Tesseract.js word data), and a built-in usage guide modal.

### 3.2 Key Files

| File | Purpose |
|------|---------|
| `src/main.js` | Creates and mounts the Vue 3 app |
| `src/App.vue` | Root component — template, logic, and styles |
| `src/components/ImageLoader.vue` | File loading via drag-drop, paste, or file picker |
| `public/js/tinymce/` | Bundled TinyMCE editor resources |

### 3.3 `src/main.js`

```js
import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
```

Minimal bootstrap — mounts the App component into `<div id="app">`.

### 3.4 `src/App.vue`

The main application component contains:

**Template sections**:
- **Header**: Logo, title, navigation links to Sanchaya properties
- **Image area**: `<ImageLoader>` component for file input
- **Controls**: Language selector (16 languages), OCR engine selector, progress bar
- **Action buttons**: Recognize, Recognize All Pages, Unique Words, Export TXT, Export DOCX, Export hOCR, Export HTML Layout, Export TSV
- **hOCR/HTML/TSV export & viewer row**: Export any format, or view raw data in a full-screen modal with monospace dark-theme display
- **View mode bar**: Page View / Combined View tabs with page indicator for multi-page PDFs
- **Text editor**: TinyMCE rich text editor with Kannada spellchecker integration
- **Diff panel**: Shows added/removed words when the user edits OCR output
- **Unique words panel**: Extract and copy unique words from OCR text
- **OCR viewer modal**: Full-screen overlay for viewing hOCR, HTML, and TSV content

**Script logic**:
- **`PageData` interface**: Per-page storage of `{ text, hocr, tsv, styledHtml }` from Tesseract.js
- **`textToHtml()`**: Converts plain text (with `\n\n` paragraph breaks and `\n` line breaks) to HTML with `<p>` and `<br>` tags for proper rendering. Joins lines within paragraphs with `<br>` for natural text flow, and joins paragraphs with `<p><br></p><p><br></p>` for visual spacing between blocks
- **`escapeHtml(text)`**: Escapes HTML special characters (`&`, `<`, `>`, `"`, `'`) for safe insertion into HTML context; used by `generateStyledHtml`
- **`generateStyledHtml(result)`**: Iterates over `result.data.words` from Tesseract.js, applies inline styling (`<strong>` for bold, `<em>` for italic, `<span style="font-size:Xpx">` for non-default font sizes), wraps each paragraph in `<p>` with `<br>`-separated lines. Returns styled HTML string for the editor
- **`setEditorContent(html)`**: Sets the TinyMCE editor content with retry polling (up to 30 attempts at 150ms intervals) to handle cases where the editor hasn't finished initializing before OCR completes. Called instead of the old one-shot `updateEditor`
- **`getStyledHtml(idx)`**: Returns `pageData[idx].styledHtml` (styled HTML with bold/italic/font-size from OCR) if available; falls back to `textToHtml()` with proper paragraph/line breaks. Central accessor used by page navigation, view mode switches, and OCR completion
- **`extractPageData(result)`**: Extracts plain text from `result.data.paragraphs`, copies hOCR/TSV, returns a `PageData` object
- **`doOCR()`**: Single-page OCR, stores full `PageData` in `pageData[0]`, sets editor content via `setEditorContent`
- **`doOCRAllPages()`**: Batch OCR for multi-page PDFs. Each page is processed in sequence; as soon as page 1 completes, its text appears in the editor while remaining pages continue processing in the background. Each page's full result (text/hocr/tsv/styledHtml) is stored in `pageData[]`
- **`handlePageChanged()`**: When user navigates pages in ImageLoader, editor shows that page's OCR text with proper paragraph breaks
- **`switchToPageView()` / `switchToCombinedView()`**: Toggle between per-page editing and combined view
- **`onTextChange()`**: Saves edits back to the correct `pageData[].text` when in page view mode; clears `pageData[].styledHtml` since the user's manual edit invalidates the original OCR styling; strips HTML for clean plain-text storage
- **`getPlainText()`**: Returns current plain-text content regardless of view mode (strips HTML if needed)
- **`exportTxt()` / `exportDocx()` / `exportHocr()` / `exportHtmlLayout()` / `exportTsv()`**: Client-side download for all formats. HTML layout uses `styledHtml` when available for richer output
- **`viewOcrFormat()`**: Opens full-screen modal for hOCR/HTML/TSV content
- **`getCombinedHocr()` / `getCombinedHtmlLayout()` / `getCombinedTsv()`**: Merges per-page data with page separator comments

**Tesseract.js integration**:
```js
const result = await Tesseract.recognize(imgSrc, languageCode, { logger });
// result.data: { text, hocr, html, tsv, paragraphs, words, lines, blocks, ... }
```

**Server integration**:
```js
const SERVER_URL = 'https://ocr-server.sanchaya.net'; // set to null to disable
```

### 3.5 `src/components/ImageLoader.vue`

Handles all file input methods:
- Drag & drop, file picker, clipboard paste
- PDF processing via pdfjsLib — renders each page to canvas at 1.5x scale
- Emits `pdf-loaded`, `page-ready`, `file-loaded`, `page-changed`

### 3.6 Supported Languages

| Language | Code | Language | Code |
|----------|------|----------|------|
| Assamese | `asm` | Bengali | `ben` |
| Gujarati | `guj` | Hindi | `hin` |
| Kannada | `kan` | Malayalam | `mal` |
| Marathi | `mar` | Odia | `ori` |
| Punjabi | `pan` | Sanskrit | `san` |
| Sinhala | `sin` | Tamil | `tam` |
| Telugu | `tel` | Urdu | `urd` |
| English | `eng` | Kannada+English | `kan+eng` |

### 3.7 Running the Vue App

```bash
cd ocr-kannada
npm install
npm run dev     # Dev server on http://localhost:3000
npm run build   # Production build → dist/
npm run serve   # Preview production build
```

---

## 4. Frontend: Static HTML App (`index.html`)

### 4.1 Overview

A simpler, no-build-required frontend using jQuery, Bootstrap 4, and Font Awesome. Served by the Flask server at `http://localhost:5001/`.

The static app's OCR export features (hOCR parsing, script detection, `hocrToLayoutHTML`, `hocrToStructuredText`) are now available in the Vue 3 SPA as native export formats — the Vue app captures `hocr`, `html`, and `tsv` directly from Tesseract.js recognition results and stores them per-page in `PageData`.

### 4.2 Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main HTML page with layout, controls, and editor |
| `js/tesseract.min.js` | Tesseract.js library |
| `js/tesseract-core.wasm.js` | WebAssembly core for modern browsers |
| `js/tesseract-core.asm.js` | ASM.js fallback for Edge/older browsers |
| `js/tesseract-ocr.js` | OCR logic, PDF processing, export functions |
| `style/ocr.css` | Styling matching the Sanchaya design system |

### 4.3 `js/tesseract-ocr.js`

- File selection and image/PDF handling
- `processPDF(file)`: Renders each PDF page to canvas, runs Tesseract.js OCR on each
- `recognizeFile(file)`: Creates TesseractWorker with WASM or ASM.js core
- `progressUpdate(packet)`: Real-time OCR progress in the `#log` div
- Export: TXT and DOCX download

---

## 5. Backend: Flask Server (`server.py`)

### 5.1 Overview

Lightweight Flask server (251 lines) providing optional storage for uploaded files and OCR results. Serves static frontend and API.

### 5.2 Dependencies

```
Flask==3.0.0
Flask-CORS==4.0.0
```

### 5.3 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Serve static frontend |
| `POST` | `/api/upload` | Upload an image/PDF file |
| `POST` | `/api/save-text` | Save OCR text result |
| `GET` | `/api/ocr-results` | List last 50 OCR results |
| `GET` | `/api/ocr-results/<id>` | Get specific OCR result |
| `GET` | `/api/stats` | Get storage statistics |
| `GET` | `/api/engines` | List available OCR engines |
| `GET` | `/uploads/<filename>` | Serve uploaded files |
| `GET` | `/texts/<filename>` | Serve text files |

### 5.4 Running

```bash
pip install -r requirements.txt
python server.py  # → http://localhost:5001
```

---

## 6. Deployment & Operations

### 6.1 Docker

```bash
docker-compose up -d  # → http://localhost:5001
```

### 6.2 Coolify

`coolify.json` auto-configures port 5001, persistent volumes, and production environment.

### 6.3 GitHub Pages

```bash
./deploy.sh  # Builds & deploys ocr-kannada/dist to gh-pages branch
```

### 6.4 GitLab CI

`.gitlab-ci.yml` builds on push to `master` and deploys to GitLab Pages.

---

## 7. API Reference

### `POST /api/upload`

Upload a file. Accepts `multipart/form-data` with field `file`.

```json
{ "success": true, "file_id": "20260518_183022_a1b2c3d4.png", "file_path": "/uploads/...", "size": 123456 }
```

### `POST /api/save-text`

Save OCR text. Accepts JSON body `{ text, language, engine, file_id }`.

```json
{ "success": true, "text_id": "uuid", "text_file": "/texts/uuid.txt" }
```

### `GET /api/ocr-results`

```json
{ "total": 42, "results": [ { "id": "...", "timestamp": "...", ... } ] }
```

### `GET /api/stats`

```json
{ "total_ocr_results": 42, "unique_ips": 5, "languages": { "kan": 25 }, ... }
```

### `GET /api/engines`

```json
{ "engines": [{ "id": "tesseract", "name": "Tesseract.js", "type": "client-side" }] }
```

---

## 8. Data Flow

### 8.1 OCR Recognition Flow

```
Image/PDF → ImageLoader (render to canvas) → Tesseract.js (browser OCR)
→ extractPageData + generateStyledHtml → PageData stored ({ text, hocr, tsv, styledHtml } per page)
→ Displayed in TinyMCE editor via setEditorContent() (page-linked or combined view)
→ Optional: saved to Flask server
```

**Per-page PageData storage**: When `doOCRAllPages()` processes a multi-page PDF, each page's full recognition result is stored in `pageData: PageData[]`. Each entry includes `text` (plain), `hocr` (hOCR XML), `tsv` (tab-separated), and `styledHtml` (rich HTML with bold/italic/font-size from OCR word data). This enables individual page editing, per-format export, and the view-mode toggle between page and combined display.

### 8.2 PDF Processing

PDF → pdfjsLib getDocument → each page rendered to canvas at 1.5x → pageImages[] → OCR each → pageData[]

### 8.3 Word Diff

User edits → `onTextChange()` compares original vs current word sets → shows added (green) and removed (red) words → updates pageData in page mode

---

## 9. Text Formatting & Styled Text Preservation

### 9.1 Line and Paragraph Breaks

OCR output is converted to HTML with two levels of breaks:

**Line breaks (within paragraphs):**
- OCR lines (separated by `\n`) are joined with `<br>` for natural text flow
- Lines display on separate rows but without extra vertical spacing
- Example: "First line<br>Second line" renders as continuous paragraph

**Paragraph breaks (between paragraphs):**
- Paragraph separators (separated by `\n\n`) are joined with `<p><br></p><p><br></p>` 
- Creates visual spacing (two empty lines) between logical sections
- Helps distinguish different topics or sections in the document

**Implementation:**
```js
textToHtml(text) {
  return text
    .split(/\n\n+/)                                          // Split by paragraph breaks
    .map(p => p.split('\n').filter(...).join('<br>'))      // Lines: join with <br>
    .map(p => `<p>${p}</p>`)                               // Wrap each paragraph in <p>
    .join('\n<p><br></p>\n<p><br></p>\n');               // Join paragraphs with visual spacing
}
```

### 9.2 Styled Text Preservation

**What gets preserved:**
- **Bold text** — Detected by Tesseract word-level `bold` flag → wrapped in `<strong>` tags
- **Italic text** — Detected by Tesseract word-level `italic` flag → wrapped in `<em>` tags  
- **Font sizes** — Non-default sizes (not 11px) → wrapped in `<span style="font-size:Xpx">` tags

**Where styling appears:**
- **Editor display** — `styledHtml` shows formatting inline for visual reference during editing
- **HTML export** — Generated with `<strong>`, `<em>`, and `<span style="...">` tags
- **TXT/DOCX export** — Plain text (formatting lost, but text content preserved)
- **Manual edits** — When user edits text in the editor, styling is cleared (`styledHtml` invalidated) since the user's changes make the OCR styling unreliable

**Generation flow:**
```
OCR result → generateStyledHtml()
  ├─ Extract paragraphs from result.data.paragraphs
  ├─ Build base HTML with textToHtml() (proper breaks)
  ├─ Filter result.data.words for styled entries (bold || italic || font_size)
  └─ Wrap styled words sequentially with <strong>/<em>/<span> tags
  → Returns styled HTML with preserved formatting and proper breaks
```

---

## 9. Contributing & Development

### 10.1 Prerequisites
- Node.js 16+
- Python 3.9+

### 10.2 Tech Stack
| Technology | Purpose |
|-----------|---------|
| Tesseract.js | Client-side OCR via WebAssembly |
| Vue 3 + Vite | Frontend framework + build tool |
| TinyMCE | Rich text editor with spellcheck |
| PDF.js | PDF rendering in browser |
| Flask | Python web server (storage API) |

### 10.3 Design Decisions
1. **Client-side OCR** — Zero server load, offline-capable after language data download
2. **Two frontends** — Static HTML (no build) vs Vue 3 SPA (rich editor)
3. **Optional server** — Backend is optional; frontends work standalone
4. **Multi-format export** — TXT, DOCX, hOCR, HTML layout (with styled HTML), TSV from Tesseract.js results
5. **Default language: `kan+eng`** — Kannada + English selected by default for mixed-script documents
6. **Styled editor content** — Word-level bold, italic, and font-size from Tesseract.js preserved as HTML tags in TinyMCE; invalidated on user edit
7. **Poll-based editor readiness** — `setEditorContent()` polls TinyMCE up to 30 times to handle race condition where OCR completes before editor initialization

---

## Appendix: File Reference

| File Path | Lines | Language | Purpose |
|-----------|-------|----------|---------|
| `server.py` | 251 | Python | Flask API + static file server |
| `index.html` | 65 | HTML | Static frontend entry point |
| `js/tesseract-ocr.js` | 236 | JS | Static frontend OCR logic |
| `style/ocr.css` | 429 | CSS | Static frontend styles |
| `ocr-kannada/src/App.vue` | ~1184 | Vue/TS | Vue app root component |
| `ocr-kannada/src/components/ImageLoader.vue` | 340 | Vue/TS | File loading component |
| `ocr-kannada/src/main.js` | 4 | JS | Vue app bootstrap |
| `ocr-kannada/vite.config.js` | 9 | JS | Vite configuration |
| `ocr-kannada/package.json` | 22 | JSON | npm dependencies |
| `Dockerfile` | 17 | Dockerfile | Container definition |
| `docker-compose.yml` | 23 | YAML | Multi-container setup |
