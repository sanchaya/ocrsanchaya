# Kannada OCR — Vue 3 Frontend

A browser-based OCR application for Kannada and 14+ Indic languages. Part of the [OCR Sanchaya](https://ocr.sanchaya.net) project.

## Features

- Tesseract.js (WebAssembly) — all processing in browser
- TinyMCE rich text editor with Kannada spellchecker
- Styled HTML preservation — bold, italic, font sizes from OCR word data
- PDF support with per-page editing
- Multi-format export: TXT, DOCX, hOCR, HTML layout, TSV
- Page View / Combined View toggle
- Word diff tracking and unique word extraction

## Development

```
npm install
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build → dist/
```

## Default Language

The language selector defaults to `kan+eng` (Kannada + English). Change in `src/App.vue` (`state.language`).

## Note

This is the Vue 3 SPA frontend of a larger project. The parent directory contains the Flask server (optional) and static HTML frontend.
