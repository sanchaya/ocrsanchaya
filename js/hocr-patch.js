window.initHOCRPatch = async function() {
  if (typeof Tesseract === 'undefined') {
    console.log('Tesseract.js not loaded yet, waiting...');
    return false;
  }

  window.__ocrServerDisabled = true;
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('ocr-server.sanchaya.net')) {
      console.log('Server OCR blocked, using client-side only');
      return Promise.resolve(new Response(JSON.stringify({ status: 'disabled' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    return originalFetch.apply(this, arguments);
  };

  let attempts = 0;
  while (attempts < 60) {
    if (window.Tesseract && window.Tesseract.createWorker) {
      break;
    }
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }

  try {
    console.log('Creating OCR worker with HOCR support...');
    const worker = await Tesseract.createWorker('kan+eng');
    window.__ocrWorker = worker;
    console.log('OCR worker initialized with HOCR');

    window.__performClientOCR = async function() {
      console.log('Starting OCR with layout preservation...');
      
      let img = document.querySelector('.img-container img');
      if (!img) img = document.querySelector('#selected-image');
      if (!img) img = document.querySelector('.drop img');
      
      if (!img || !img.src || img.naturalWidth === 0 || img.src.includes('Funny-Minion')) {
        console.log('No valid image found');
        return '';
      }

      const canvas = document.createElement('canvas');
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      let lang = 'kan+eng';
      const langSelect = document.querySelector('.language-select select');
      if (langSelect) lang = langSelect.value;
      console.log('Using language:', lang);
      
      try {
        await window.__ocrWorker.reinitialize(lang);
      } catch (e) {
        console.log('Reinitializing worker with:', lang);
        await window.__ocrWorker.terminate();
        window.__ocrWorker = await Tesseract.createWorker(lang);
      }

      console.log('Recognizing text with HOCR...');
      const result = await window.__ocrWorker.recognize(canvas);
      
      const hocr = result.data.hocr || '';
      const rawText = result.data.text || '';
      
      const layoutHTML = hocrToLayoutHTML(hocr, imgWidth, imgHeight);
      const structuredText = hocrToStructuredText(hocr, true);
      
      console.log('OCR complete! Raw text length:', rawText.length, 'Confidence:', result.data.confidence);

      const editor = window.tinymce?.get?.('0');
      if (editor) {
        editor.setContent(layoutHTML);
        console.log('Layout HTML set in TinyMCE editor');
      }

      return { rawText, structuredText, layoutHTML, confidence: result.data.confidence };
    };

    const originalDoOCR = window.doOCR;
    window.doOCR = async function() {
      const result = await window.__performClientOCR();
      if (!result && originalDoOCR) {
        return originalDoOCR.apply(this, arguments);
      }
      return result;
    };

    console.log('HOCR patch applied - layout-preserving OCR enabled');
    return true;
  } catch (err) {
    console.error('Failed to initialize OCR worker:', err);
    return false;
  }
};

let patchInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
  if (patchInitialized) return;
  patchInitialized = true;
  setTimeout(() => {
    window.initHOCRPatch();
  }, 2000);
});
