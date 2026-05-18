<template>
  <header>
    <div class="header-content">
      <div class="logo-section">
        <img src="/img/sanchaya-logo.png" alt="Sanchaya" class="header-logo">
        <div class="title-section">
          <h1>ಕನ್ನಡ ಓಸಿಆರ್ | Kannada OCR</h1>
          <span class="subtitle">Optical Character Recognition</span>
        </div>
      </div>
      <nav class="header-nav">
        <a href="https://sanchaya.org" target="_blank" class="nav-link">ಸಂಚಯ</a>
        <a href="https://fonts.sanchaya.net" target="_blank" class="nav-link">ಫಾಂಟ್ಸ್ ಸಂಚಯ</a>
        <a href="https://digital.sanchaya.net" target="_blank" class="nav-link">ಡಿಜಿಟಲ್ ಸಂಚಯ</a>
        <a href="https://vachana.sanchaya.net" target="_blank" class="nav-link">ವಚನ ಸಂಚಯ</a>
        <a href="#" @click.prevent="showUserGuide = !showUserGuide" class="nav-link help-link">ಸಹಾಯ | Help</a>
      </nav>
    </div>
  </header>
  <main class="container">
<div class="img-container">
        <ImageLoader @pdf-loaded="handlePdfLoaded" @file-loaded="handleFileLoaded" @page-changed="handlePageChanged" />
      </div>
    <div class="actions">
      <progress v-if="showProgress" :value="progress" />
      <div class="status" v-if="showProgress">{{ status }} ({{ currentPage }}/{{ totalPages }} pages)</div>
      <div class="controls-row">
        <div class="language-select">
          <label>Engine:</label>
          <select v-model="ocrEngine">
            <option value="tesseract">Tesseract.js</option>
          </select>
        </div>
        <div class="language-select">
          <label>Language:</label>
          <select v-model="language">
            <option value="asm">Assamese</option>
            <option value="ben">Bengali</option>
            <option value="guj">Gujarati</option>
            <option value="hin">Hindi</option>
            <option value="kan">Kannada</option>
            <option value="mal">Malayalam</option>
            <option value="mar">Marathi</option>
            <option value="ori">Odia</option>
            <option value="pan">Punjabi</option>
            <option value="san">Sanskrit</option>
            <option value="sin">Sinhala</option>
            <option value="tam">Tamil</option>
            <option value="tel">Telugu</option>
            <option value="urd">Urdu</option>
            <option value="eng">English</option>
            <option value="kan+eng">Kannada + English</option>
          </select>
        </div>
      </div>
      <div class="engine-info" v-if="ocrEngineInfo">{{ ocrEngineInfo }}</div>
      <div class="button-group">
        <button @click="doOCR" class="btn-primary" :disabled="isEngineLoading">
          <span v-if="isEngineLoading">Loading Engine...</span>
          <span v-else>Recognize</span>
        </button>
        <button @click="doOCRAllPages" :disabled="totalPages <= 1 || isEngineLoading" class="btn-primary">Recognize All Pages</button>
        <button @click="extractUniqueWords" class="btn-secondary">Unique Words</button>
        <button @click="exportTxt" class="btn-export">Export TXT</button>
        <button @click="exportDocx" class="btn-export">Export DOCX</button>
      </div>
      <div class="view-mode-bar" v-if="pageData.length > 1 || (totalPages > 1 && viewMode === 'page')">
        <div class="view-mode-tabs">
          <button :class="['tab-btn', { active: viewMode === 'page' }]" @click="switchToPageView">
            Page View
          </button>
          <button :class="['tab-btn', { active: viewMode === 'combined' }]" @click="switchToCombinedView">
            Combined View
          </button>
        </div>
        <span v-if="viewMode === 'page' && displayPageNum > 0" class="page-indicator">
          Editing Page {{ displayPageNum }} of {{ totalPages || pageData.length }}
        </span>
      </div>
      <div class="export-row" v-if="pageData.length > 0">
        <button @click="exportHocr" class="btn-export-sm">Export hOCR</button>
        <button @click="exportHtmlLayout" class="btn-export-sm">Export HTML</button>
        <button @click="exportTsv" class="btn-export-sm">Export TSV</button>
        <button @click="viewOcrFormat('hocr')" class="btn-export-sm">View hOCR</button>
        <button @click="viewOcrFormat('html')" class="btn-export-sm">View HTML</button>
        <button @click="viewOcrFormat('tsv')" class="btn-export-sm">View TSV</button>
      </div>
    </div>
    <div class="text-container">
      <editor
        tinymce-script-src="/js/tinymce/tinymce.min.js"
        v-model="text"
        :init="editorConfig"
        @input="onTextChange"
      ></editor>
    </div>
    <div v-if="showDiff" class="diff-container">
      <div class="diff-header">
        <h3>Word Changes</h3>
        <button @click="showDiff = false" class="close-btn">&times;</button>
      </div>
      <div class="diff-content">
        <div v-if="addedWords.length > 0" class="diff-section">
          <h4>Added ({{ addedWords.length }})</h4>
          <div class="diff-words added">{{ addedWords.join(', ') }}</div>
        </div>
        <div v-if="removedWords.length > 0" class="diff-section">
          <h4>Removed ({{ removedWords.length }})</h4>
          <div class="diff-words removed">{{ removedWords.join(', ') }}</div>
        </div>
        <div v-if="addedWords.length === 0 && removedWords.length === 0" class="no-changes">
          No changes detected
        </div>
      </div>
    </div>
    <div v-if="showUniqueWords" class="unique-words-container">
      <div class="unique-header">
        <h3>Unique Words ({{ uniqueWordCount }})</h3>
        <button @click="showUniqueWords = false" class="close-btn">&times;</button>
      </div>
      <div class="unique-content">
        <textarea v-model="uniqueWordsText" class="unique-textarea" readonly></textarea>
        <button @click="copyUniqueWords" class="btn-secondary">Copy to Clipboard</button>
      </div>
    </div>
    <div v-if="showUserGuide" class="ocr-viewer-overlay" @click.self="showUserGuide = false">
      <div class="ocr-viewer-modal">
        <div class="ocr-viewer-header">
          <strong>Usage Guide | ಬಳಕೆ ಮಾರ್ಗದರ್ಶಿ</strong>
          <button @click="showUserGuide = false" class="close-btn">&times;</button>
        </div>
        <div class="user-guide-content">
          <h3>Kannada OCR — How to Use | ಬಳಕೆ ಮಾರ್ಗದರ್ಶಿ</h3>

          <h4>1. Upload an Image or PDF</h4>
          <p>Drag & drop a file onto the left panel, click <strong>Choose file</strong>, or paste an image from clipboard. Supported formats: JPG, PNG, GIF, BMP, TIFF, PDF.</p>

          <h4>2. Select Language</h4>
          <p>Choose the document language from the dropdown. Default is <strong>Kannada + English</strong> for mixed-script documents. 14+ Indian languages supported.</p>

          <h4>3. Recognize Text</h4>
          <p>Click <strong>Recognize</strong> to OCR the current image. For multi-page PDFs, click <strong>Recognize All Pages</strong> — page 1 appears in the editor immediately while remaining pages process in the background. Progress is shown in real-time.</p>

          <h4>4. Navigate Pages (PDFs)</h4>
          <p>Use <strong>← Prev</strong> and <strong>Next →</strong> buttons below the image to switch pages. The editor automatically shows the OCR text for the current page.</p>

          <h4>5. Edit & Proofread</h4>
          <p>Use the built-in TinyMCE editor to correct OCR errors. <strong>Original bold, italic, and font sizes from the document are preserved</strong>. The spell checker (Kannada and English) highlights misspelled words. Changes are tracked in the <strong>Word Changes</strong> panel below the editor.</p>

          <h4>6. View Modes</h4>
          <p><strong>Page View</strong> — Edit each page's text individually. Switch pages to see and edit each one.<br>
          <strong>Combined View</strong> — See all pages concatenated with page separators.</p>

          <h4>7. Export</h4>
          <p>Export your OCR results in multiple formats:</p>
          <ul>
            <li><strong>TXT</strong> — Plain text</li>
            <li><strong>DOCX</strong> — Word document</li>
            <li><strong>hOCR</strong> — OCR metadata with bounding boxes</li>
            <li><strong>HTML</strong> — Formatted HTML layout with styling preserved</li>
            <li><strong>TSV</strong> — Tab-separated values</li>
          </ul>
          <p>Use <strong>View hOCR / HTML / TSV</strong> buttons to inspect raw data in a full-screen viewer.</p>

          <h4>8. Extract Unique Words</h4>
          <p>Click <strong>Unique Words</strong> to extract all unique words from the recognized text, sorted alphabetically. Copy to clipboard with one click.</p>

          <h4>9. Tips & Notes</h4>
          <ul>
            <li><strong>Language combo:</strong> For mixed Kannada+English documents, use <code>kan+eng</code> (the default).</li>
            <li><strong>Styling:</strong> Bold, italic, and font-size differences are detected by Tesseract.js and preserved in the editor. Editing a page removes the original styling since your corrections replace the OCR output.</li>
            <li><strong>Page 1 speed:</strong> In multi-page PDFs, page 1 appears as soon as its OCR completes. You can start proofreading while other pages are still being processed.</li>
            <li><strong>All processing is client-side:</strong> OCR runs entirely in your browser via Tesseract.js (WebAssembly). Nothing is uploaded to any server unless server storage is explicitly configured.</li>
          </ul>

          <hr>
          <p>OCR is powered by <a href="https://tesseract.projectnaptha.com/" target="_blank">Tesseract.js</a> — all processing happens in your browser. Nothing is uploaded to any server unless you configure server storage.</p>
          <p>Part of the <a href="https://sanchaya.org" target="_blank">ಸಂಚಯ</a> project by <a href="https://sanchifoundation.org" target="_blank">ಸಂಚಿ ಫೌಂಡೇಶನ್</a>.</p>
        </div>
      </div>
    </div>
    <div v-if="showOcrViewer" class="ocr-viewer-overlay" @click.self="showOcrViewer = false">
      <div class="ocr-viewer-modal">
        <div class="ocr-viewer-header">
          <strong>{{ ocrViewerTitle }}</strong>
          <button @click="showOcrViewer = false" class="close-btn">&times;</button>
        </div>
        <textarea class="ocr-viewer-textarea" readonly :value="ocrViewerContent"></textarea>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, ref, nextTick } from "vue";
import ImageLoader from "./components/ImageLoader.vue";
import Tesseract from "tesseract.js";
import axios from "axios";
import Editor from "@tinymce/tinymce-vue";

interface PageData {
  text: string;
  hocr: string;
  tsv: string;
  styledHtml: string;
}

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const generateStyledHtml = (result: any): string => {
  const paras: any[] = result.data.paragraphs || [];
  if (paras.length === 0) return '';

  const baseText = paras.map((p: any) => p.text.trim()).filter(Boolean).join('\n\n');
  if (!baseText) return '';

  const html = textToHtml('\n' + baseText + '\n');

  const words: any[] = result.data.words || [];
  const styled = words.filter((w: any) => w.text && (w.bold || w.italic || (w.font_size && w.font_size > 0 && w.font_size !== 11)));
  if (styled.length === 0) return html;

  let resultHtml = '';
  let htmlPos = 0;
  let wordIdx = 0;

  while (wordIdx < styled.length && htmlPos < html.length) {
    const w = styled[wordIdx];
    const idx = html.indexOf(w.text, htmlPos);
    if (idx === -1) { wordIdx++; continue; }

    resultHtml += html.slice(htmlPos, idx);

    let replacement = w.text;
    if (w.bold) replacement = `<strong>${replacement}</strong>`;
    if (w.italic) replacement = `<em>${replacement}</em>`;
    if (w.font_size && w.font_size > 0 && w.font_size !== 11) {
      replacement = `<span style="font-size:${Math.round(w.font_size)}px">${replacement}</span>`;
    }
    resultHtml += replacement;
    htmlPos = idx + w.text.length;
    wordIdx++;
  }

  resultHtml += html.slice(htmlPos);
  return resultHtml;
};

const textToHtml = (text: string): string => {
  if (!text) return '';
  return text
    .split(/\n\n+/)
    .map(p => p.split('\n').filter(l => l.trim()).join('<br>'))
    .filter(p => p.trim())
    .map(p => `<p>${p}</p>`)
    .join('\n<p><br></p>\n<p><br></p>\n');
};

const extractPageData = (result: any): PageData => {
  const paragraphs = (result.data.paragraphs || []).map((p: any) => p.text.trim()).filter((t: string) => t.length > 0);
  return {
    text: paragraphs.join('\n\n'),
    hocr: result.data.hocr || '',
    tsv: result.data.tsv || '',
    styledHtml: '',
  };
};

const languageMap: Record<string, Record<string, string>> = {
  tesseract: {
    asm: 'asm', ben: 'ben', guj: 'guj', hin: 'hin', kan: 'kan', mal: 'mal', mar: 'mar', ori: 'ori', pan: 'pan', san: 'san', sin: 'sin', tam: 'tam', tel: 'tel', urd: 'urd', eng: 'eng', 'kan+eng': 'kan+eng'
  }
};

const engineInfo: Record<string, string> = {
  tesseract: 'Tesseract.js - Browser-based, ~4MB download, 100+ languages'
};

let tesseractWorker: any = null;

const loadTesseractWorker = async (lang: string) => {
  if (tesseractWorker) return tesseractWorker;
  state.isEngineLoading = true;
  state.status = 'Loading Tesseract engine...';
  try {
    const { createWorker } = Tesseract;
    tesseractWorker = await createWorker(languageMap['tesseract'][lang] || 'eng');
    return tesseractWorker;
  } catch (e) {
    console.error('Tesseract worker error:', e);
    throw e;
  } finally {
    state.isEngineLoading = false;
  }
};

const recognizeWithTesseract = async (imgSrc: string, lang: string, logger: (m: any) => void): Promise<PageData> => {
  const result = await Tesseract.recognize(imgSrc, languageMap.tesseract[lang] || lang, { logger });
  const pd = extractPageData(result);
  pd.styledHtml = generateStyledHtml(result);
  return pd;
};

const doOCRWithEngine = async (imgSrc: string, lang: string, engine: string, onProgress: (m: any) => void): Promise<PageData> => {
  return await recognizeWithTesseract(imgSrc, lang, onProgress);
};

async function spellcheck(method, text, success, failure) {
  if (method === "spellcheck") {
    const language = "kn";
    const api = `https://spell.toolforge.org/spellcheck/${language}`;
    axios
      .post(api, {
        text: text,
      })
      .then((response) => {
        const results = response.data;
        const misspellings = {};
        for (let i = 0; i < results.length; i++) {
          if (!results[i].spellcheck) {
            misspellings[results[i].word] = results[i].suggestions;
          }
        }
        success({ words: misspellings, dictionary: [] });
      })
      .catch((error) => {
        failure("Spellcheck error:" + error);
      });
  } else if (method === "addToDictionary") {
    success();
  }
}

export default defineComponent({
  name: "App",
  data: () => ({}),
  components: {
    ImageLoader,
    Editor,
  },
  setup() {
    const state = reactive({
      progress: 0,
      status: "",
      showProgress: false,
      text: "",
      originalText: "",
      language: "kan+eng",
      ocrEngine: "tesseract",
      isEngineLoading: false,
      ocrEngineInfo: "",
      totalPages: 0,
      currentPage: 0,
      showDiff: false,
      addedWords: [] as string[],
      removedWords: [] as string[],
      showUniqueWords: false,
      uniqueWordsText: "",
      uniqueWordCount: 0,
      currentFile: null as File | null,
      currentFileId: null as string | null,
      pageData: [] as PageData[],
      viewMode: "page" as "page" | "combined",
      displayPageNum: 0,
      showUserGuide: false,
      showOcrViewer: false,
      ocrViewerTitle: "",
      ocrViewerContent: "",
      editorConfig: {
        height: 600,
        menubar: true,
        toolbar_mode: "sliding",
        toolbar_sticky: true,
        mobile: {
          menubar: true,
        },
        plugins: [
          "advlist autolink lists link image charmap print preview anchor",
          "searchreplace visualblocks code fullscreen",
          "insertdatetime media table paste code help wordcount spellchecker",
        ],
        spellchecker_languages: "Kannada=kn,English=en",
        toolbar:
          "spellchecker| undo  redo | formatselect | fontselect | bold italic underline strikethrough codeformat | backcolor forecolor | alignleft aligncenter  alignright alignjustify | bullist numlist outdent indent | removeformat| help",
        spellchecker_callback: spellcheck,
        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }',
        setup: (editor: any) => {
          editor.on('input', () => {
            state.text = editor.getContent({ format: 'text' });
            onTextChange();
          });
          editor.on('paste', () => {
            setTimeout(() => {
              state.text = editor.getContent({ format: 'text' });
              onTextChange();
            }, 100);
          });
        }
      },
    });

    const SERVER_URL = 'https://ocr-server.sanchaya.net'; // Set your server URL here

    const uploadFileToServer = async (file: File): Promise<string | null> => {
      if (!SERVER_URL) return null;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${SERVER_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        return result.file_id || null;
      } catch (e) {
        console.log('Could not upload file to server:', e);
        return null;
      }
    };

    const saveOCRToServer = async (text: string, language: string, engine: string, fileId?: string) => {
      if (!SERVER_URL) return;
      try {
        const response = await fetch(`${SERVER_URL}/api/save-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language, engine, file_id: fileId || '' })
        });
        const result = await response.json();
        console.log('OCR saved to server:', result);
      } catch (e) {
        console.log('Could not save to server:', e);
      }
    };

    const saveCorrectedToServer = async (originalText: string, correctedText: string) => {
      if (!SERVER_URL) return;
      try {
        const response = await fetch(`${SERVER_URL}/api/save-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: correctedText, 
            language: 'corrected', 
            engine: 'manual',
            original_text: originalText 
          })
        });
        const result = await response.json();
        console.log('Corrected text saved:', result);
      } catch (e) {
        console.log('Could not save corrected text:', e);
      }
    };

    const setEditorContent = (html: string) => {
      const trySet = (): boolean => {
        const editor = (window as any).tinymce?.get?.('0');
        if (editor) {
          editor.setContent(html);
          return true;
        }
        return false;
      };
      if (!trySet()) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (trySet() || attempts > 30) clearInterval(interval);
        }, 150);
      }
    };

    const doOCR = async () => {
      const img = document.getElementById("ocr-img") as HTMLImageElement;
      if (img && img.src) {
        state.showProgress = true;
        state.status = "Processing...";
        state.ocrEngineInfo = engineInfo[state.ocrEngine] || '';

        try {
          const page = await doOCRWithEngine(img.src, state.language, state.ocrEngine, (m) => {
            console.log(m);
            state.progress = m.progress || 0;
            state.status = m.status || "Processing...";
          });

          state.pageData = [page];
          state.displayPageNum = 1;
          state.viewMode = 'page';
          state.originalText = page.text;

          saveOCRToServer(page.text, state.language, state.ocrEngine, state.currentFileId || undefined);
          state.text = (page.styledHtml && page.styledHtml.trim().length > 0) ? page.styledHtml : textToHtml('\n' + page.text + '\n');
          nextTick(() => setEditorContent(state.text));
        } catch (e: any) {
          console.error(e);
          state.text = "Error during OCR: " + e.message || e;
        }
        state.showProgress = false;
      }
    };

    const doOCRAllPages = async () => {
      const imageLoader = document.querySelector('.img-container');
      if (!imageLoader) return;

      const pageImages = (window as any).__pageImages || [];
      if (pageImages.length === 0) {
        alert("No PDF loaded or PDF has only one page");
        return;
      }

      state.showProgress = true;
      state.ocrEngineInfo = engineInfo[state.ocrEngine] || '';
      state.pageData = [];

      for (let i = 0; i < pageImages.length; i++) {
        state.currentPage = i + 1;
        state.totalPages = pageImages.length;
        state.status = `Processing page ${i + 1} of ${pageImages.length}...`;

        try {
          const page = await doOCRWithEngine(pageImages[i], state.language, state.ocrEngine, (m) => {
            state.progress = m.progress || 0;
          });

          state.pageData[i] = page;

          if (i === 0) {
            state.viewMode = 'page';
            state.displayPageNum = 1;
            state.originalText = page.text;
            state.text = (page.styledHtml && page.styledHtml.trim().length > 0) ? page.styledHtml : textToHtml('\n' + page.text + '\n');
            nextTick(() => setEditorContent(state.text));
          }
        } catch (e: any) {
          console.error("Error on page", i + 1, e);
          state.pageData[i] = { text: '\n[Error on page ' + (i + 1) + ']\n', hocr: '', tsv: '', styledHtml: '' };
        }
      }

      state.showProgress = false;
      state.status = "Done!";
      state.totalPages = pageImages.length;

      const fullText = state.pageData.map((p, i) =>
        `--- Page ${i + 1} of ${pageImages.length} ---\n\n${p.text.trim()}\n\n`
      ).join('');
      saveOCRToServer(fullText, state.language, state.ocrEngine, state.currentFileId || undefined);

      if (state.displayPageNum > 0 && state.pageData[state.displayPageNum - 1]) {
        const pi = state.displayPageNum - 1;
        state.originalText = state.pageData[pi].text;
        state.text = getStyledHtml(pi);
        nextTick(() => setEditorContent(state.text));
      }
    };

    const getStyledHtml = (idx: number): string => {
      const pd = state.pageData[idx];
      if (!pd) return '';
      if (pd.styledHtml && pd.styledHtml.trim().length > 0) return pd.styledHtml;
      return textToHtml('\n' + pd.text + '\n');
    };

    const handlePageChanged = (pageNum: number) => {
      state.displayPageNum = pageNum;
      if (state.viewMode === 'page') {
        const pd = state.pageData[pageNum - 1];
        if (pd !== undefined) {
          state.originalText = pd.text;
          state.text = getStyledHtml(pageNum - 1);
          nextTick(() => setEditorContent(state.text));
        } else {
          state.text = '';
          nextTick(() => setEditorContent(''));
        }
      }
    };

    const switchToPageView = () => {
      state.viewMode = 'page';
      if (state.displayPageNum > 0 && state.pageData[state.displayPageNum - 1] !== undefined) {
        const pi = state.displayPageNum - 1;
        const pageText = state.pageData[pi].text;
        state.originalText = pageText;
        state.text = getStyledHtml(pi);
        nextTick(() => setEditorContent(state.text));
      } else if (state.pageData.length > 0) {
        state.displayPageNum = 1;
        const pageText = state.pageData[0].text;
        state.originalText = pageText;
        state.text = getStyledHtml(0);
        nextTick(() => setEditorContent(state.text));
      }
    };

    const switchToCombinedView = () => {
      state.viewMode = 'combined';
      const total = state.pageData.length || state.totalPages;
      const combined = state.pageData.map((p, i) =>
        `--- Page ${i + 1} of ${total} ---\n\n${p.text.trim()}\n\n`
      ).join('');
      state.originalText = combined;
      state.text = textToHtml(combined);
      nextTick(() => setEditorContent(state.text));
    };

    const handlePdfLoaded = (info: { totalPages: number; pageImages: string[] }) => {
      console.log("PDF loaded, total pages:", info.totalPages);
      state.totalPages = info.totalPages;
      state.pageData = [];
      state.displayPageNum = 1;
      state.viewMode = 'page';
      (window as any).__pageImages = info.pageImages;
    };

    const handleFileLoaded = async (file: File) => {
      state.currentFile = file;
      state.pageData = [];
      state.displayPageNum = 0;
      if (SERVER_URL) {
        state.status = "Uploading file...";
        state.currentFileId = await uploadFileToServer(file);
        console.log("File uploaded, ID:", state.currentFileId);
        state.status = "";
      }
    };

    const getCombinedText = () => {
      if (state.pageData.length >= 1) {
        const total = state.pageData.length;
        if (total > 1) {
          return state.pageData.map((p, i) =>
            `--- Page ${i + 1} of ${total} ---\n\n${p.text.trim()}\n\n`
          ).join('');
        }
        return state.pageData[0].text;
      }
      return state.text.replace(/<[^>]+>/g, '');
    };

    const getCombinedHocr = () => {
      if (state.pageData.length === 0) return state.pageData[0]?.hocr || '';
      return state.pageData.map((p, i) =>
        `<!-- Page ${i + 1} of ${state.pageData.length} -->\n${p.hocr}`
      ).join('\n\n');
    };

    const getCombinedHtmlLayout = () => {
      if (state.pageData.length === 0) return '';
      const pages = state.pageData.map((p, i) => {
        const body = p.styledHtml || textToHtml(p.text);
        return `<!-- Page ${i + 1} of ${state.pageData.length} -->\n${body}`;
      }).join('\n\n');
      return `<!DOCTYPE html><html lang="kn"><head><meta charset="utf-8"><title>OCR Result</title></head><body>${pages}</body></html>`;
    };

    const getCombinedTsv = () => {
      if (state.pageData.length === 0) return state.pageData[0]?.tsv || '';
      return state.pageData.map((p, i) =>
        `# Page ${i + 1} of ${state.pageData.length}\n${p.tsv}`
      ).join('\n\n');
    };

    const downloadFile = (content: string, filename: string, mime: string) => {
      if (!content) { alert("No data to export!"); return; }
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const exportTxt = () => {
      const exportContent = getCombinedText();
      if (!exportContent) {
        alert("No text to export!");
        return;
      }
      const blob = new Blob([exportContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ocr-result.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const exportDocx = () => {
      const exportContent = getCombinedText();
      if (!exportContent) {
        alert("No text to export!");
        return;
      }
      const docText = exportContent.replace(/\n/g, "\r\n");
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>OCR Result</title></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + docText.replace(/\n/g, "<br>") + footer;
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const a = document.createElement("a");
      a.href = source;
      a.download = "ocr-result.doc";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    const exportHocr = () => {
      const content = getCombinedHocr();
      downloadFile(content, 'ocr-result.hocr', 'text/html');
    };

    const exportHtmlLayout = () => {
      const content = getCombinedHtmlLayout();
      downloadFile(content, 'ocr-result.html', 'text/html');
    };

    const exportTsv = () => {
      const content = getCombinedTsv();
      downloadFile(content, 'ocr-result.tsv', 'text/tab-separated-values');
    };

    const viewOcrFormat = (type: 'hocr' | 'html' | 'tsv') => {
      let content = '';
      let title = '';
      if (type === 'hocr') { content = getCombinedHocr(); title = 'hOCR'; }
      else if (type === 'html') { content = getCombinedHtmlLayout(); title = 'HTML Layout'; }
      else if (type === 'tsv') { content = getCombinedTsv(); title = 'TSV'; }
      if (!content) { alert("No data to view! Run OCR first."); return; }
      state.ocrViewerTitle = title;
      state.ocrViewerContent = content;
      state.showOcrViewer = true;
    };

    const extractUniqueWords = () => {
      const plainText = getPlainText();
      if (!plainText) {
        alert("No text to extract words from!");
        return;
      }
      const words = plainText.split(/[\s\n\r,.:;!?()""''「」『』]+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);
      const uniqueWords = [...new Set(words)].sort();
      state.uniqueWordsText = uniqueWords.join('\n');
      state.uniqueWordCount = uniqueWords.length;
      state.showUniqueWords = true;
    };

    const copyUniqueWords = () => {
      navigator.clipboard.writeText(state.uniqueWordsText).then(() => {
        alert("Copied to clipboard!");
      });
    };

    const getPlainText = (): string => {
      if (state.viewMode === 'page' && state.displayPageNum > 0 && state.pageData[state.displayPageNum - 1]) {
        return state.pageData[state.displayPageNum - 1].text;
      }
      if (state.viewMode === 'combined') {
        const total = state.pageData.length || state.totalPages;
        return state.pageData.map((p, i) =>
          `--- Page ${i + 1} of ${total} ---\n\n${p.text.trim()}\n\n`
        ).join('');
      }
      return state.text
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    };

    const onTextChange = () => {
      const plainText = state.text
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (state.viewMode === 'page' && state.displayPageNum > 0 && state.pageData[state.displayPageNum - 1]) {
        const pi = state.displayPageNum - 1;
        state.pageData[pi].text = plainText;
        state.pageData[pi].styledHtml = '';
      }

      const originalWords = state.originalText.split(/[\s\n\r,.:;!?()""''「」『』]+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);
      const currentWords = plainText.split(/[\s\n\r,.:;!?()""''「」『』]+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);
      
      const originalSet = new Set(originalWords);
      const currentSet = new Set(currentWords);
      
      state.addedWords = [...currentSet].filter(w => !originalSet.has(w));
      state.removedWords = [...originalSet].filter(w => !currentSet.has(w));
      
      if (state.addedWords.length > 0 || state.removedWords.length > 0) {
        state.showDiff = true;
        saveCorrectedToServer(state.originalText, plainText);
      }
    };

    const setOriginalText = () => {
      state.originalText = state.text;
    };

    return { ...toRefs(state), doOCR, doOCRAllPages, exportTxt, exportDocx, exportHocr, exportHtmlLayout, exportTsv, viewOcrFormat, handlePdfLoaded, handleFileLoaded, handlePageChanged, switchToPageView, switchToCombinedView, extractUniqueWords, copyUniqueWords, onTextChange, setOriginalText };
  },
});
</script>

<style>


:root {
  --first-color: #1a1a2e;
  --second-color: #16213e;
  --third-color: #ffffff;
  --text-color1: #1a1a2e;
  --text-color2: #ffffff;
  --text-color3: #4361ee;
  --hover-color: rgba(67, 97, 238, 0.08);
  --active-color: rgba(67, 97, 238, 0.15);
  --span-color: #4a4a68;
  --text-background: #f8f9fa;
  --border-color: #e0e0e0;
  --primary-gradient: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
  --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  --card-shadow-hover: 0 8px 30px rgba(67, 97, 238, 0.15);
}

* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: var(--third-color);
  color: var(--text-color1);
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-color1);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: var(--third-color);
  border-bottom: 1px solid var(--border-color);
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.header-nav {
  display: flex;
  gap: 16px;
}

.nav-link {
  padding: 8px 16px;
  color: var(--text-color1);
  text-decoration: none;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background: var(--hover-color);
  color: var(--text-color3);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-logo {
  width: auto;
  height: 40px;
  border-radius: 8px;
  object-fit: contain;
}

.title-section {
  display: flex;
  flex-direction: column;
}

.subtitle {
  font-size: 12px;
  color: var(--span-color);
  margin-top: 2px;
}

header h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color1);
  margin: 0;
  line-height: 1.2;
}

main {
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  padding: 20px;
  margin: 0 auto;
  max-width: 1600px;
  width: 100%;
  gap: 20px;
}

.img-container {
  flex: 1;
  min-width: 45%;
  background: var(--third-color);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
  overflow: hidden;
  min-height: 70vh;
}

.text-container {
  flex: 1;
  min-width: 45%;
  background: var(--third-color);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
  overflow: hidden;
  min-height: 70vh;
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--third-color);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
}

.actions progress {
  height: 8px;
  width: 100%;
  border-radius: 4px;
}

.actions progress::-webkit-progress-bar {
  background-color: var(--text-background);
  border-radius: 4px;
}

.actions progress::-webkit-progress-value {
  background: var(--primary-gradient);
  border-radius: 4px;
}

.status {
  font-size: 14px;
  color: var(--span-color);
}

.controls-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.language-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.language-select label {
  font-size: 12px;
  font-weight: 600;
  color: var(--span-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.language-select select {
  padding: 12px 20px;
  border: 1px solid var(--border-color);
  border-radius: 24px;
  font-size: 14px;
  background: var(--third-color);
  color: var(--text-color1);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
}

.language-select select:focus {
  outline: none;
  border-color: var(--text-color3);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.button-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-primary {
  background: var(--primary-gradient);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(67, 97, 238, 0.3);
}

.btn-export:hover {
  background: var(--text-color3);
  color: white;
}

.engine-info {
  font-size: 12px;
  color: var(--span-color);
  padding: 8px 16px;
  background: var(--text-background);
  border-radius: 8px;
  text-align: center;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-export {
  background: var(--third-color);
  border: 1px solid var(--text-color3);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-export:hover {
  background: var(--text-color3);
  color: white;
}

footer {
  background: var(--third-color);
  border-top: 1px solid var(--border-color);
  padding: 20px;
  text-align: center;
}

footer p {
  margin: 0;
  color: var(--span-color);
  font-size: 13px;
}

footer a {
  color: var(--text-color3);
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}

.btn-secondary {
  background: var(--third-color);
  border: 1px solid var(--text-color3);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--text-color3);
  color: white;
}

.diff-container,
.unique-words-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px;
  max-height: 400px;
  background: var(--third-color);
  border-radius: 16px;
  box-shadow: var(--card-shadow-hover);
  border: 1px solid var(--border-color);
  z-index: 1000;
  overflow: hidden;
}

.diff-header,
.unique-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--text-background);
}

.diff-header h3,
.unique-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color1);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--span-color);
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-color1);
}

.diff-content,
.unique-content {
  padding: 16px;
  max-height: 320px;
  overflow-y: auto;
}

.diff-section {
  margin-bottom: 16px;
}

.diff-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--span-color);
}

.diff-words {
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.diff-words.added {
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid #28a745;
  color: #155724;
}

.diff-words.removed {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  color: #721c24;
}

.no-changes {
  text-align: center;
  color: var(--span-color);
  padding: 20px;
}

.unique-textarea {
  width: 100%;
  height: 250px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 12px;
}

.unique-content .btn-secondary {
  width: 100%;
}

.view-mode-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.view-mode-tabs {
  display: flex;
  gap: 4px;
  background: var(--text-background);
  padding: 4px;
  border-radius: 12px;
}

.tab-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--span-color);
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: var(--third-color);
  color: var(--text-color3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-btn:hover:not(.active) {
  color: var(--text-color1);
}

.page-indicator {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color3);
  background: rgba(67, 97, 238, 0.1);
  padding: 6px 16px;
  border-radius: 20px;
}

.export-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-export-sm {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: var(--third-color);
  color: var(--span-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-export-sm:hover {
  border-color: var(--text-color3);
  color: var(--text-color3);
  background: rgba(67, 97, 238, 0.05);
}

.ocr-viewer-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 10000;
  display: flex; align-items: center; justify-content: center;
}

.ocr-viewer-modal {
  background: var(--third-color); width: 90%; height: 85%;
  border-radius: 12px; display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
}

.ocr-viewer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; border-bottom: 1px solid var(--border-color);
  background: var(--text-background);
}

.ocr-viewer-header strong { font-size: 15px; color: var(--text-color1); }

.ocr-viewer-textarea {
  flex: 1; width: 100%; padding: 16px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px; border: none; resize: none;
  background: #1a1a2e; color: #e0e0e0;
  line-height: 1.5;
}

.ocr-viewer-textarea:focus { outline: none; }

@media (max-width: 1024px) {
  main {
    flex-direction: column;
  }
  
  .img-container,
  .text-container {
    min-height: 50vh;
  }
  
  .button-group {
    flex-wrap: wrap;
  }
}
</style>
