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
    console.log('Creating HOCR worker...');
    const worker = await Tesseract.createWorker('kan+eng');
    window.__hocrWorker = worker;
    console.log('HOCR worker initialized');

    window.__performClientOCR = async function() {
      console.log('Starting client-side HOCR OCR...');
      
      let img = document.querySelector('.img-container img');
      if (!img) img = document.querySelector('#selected-image');
      if (!img) img = document.querySelector('.drop img');
      
      if (!img || !img.src || img.naturalWidth === 0 || img.src.includes('Funny-Minion')) {
        console.log('No valid image found');
        return '';
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      let lang = 'kan';
      const langSelect = document.querySelector('.language-select select');
      if (langSelect) lang = langSelect.value;
      console.log('Using language:', lang);
      
      try {
        await window.__hocrWorker.reinitialize(lang);
      } catch (e) {
        console.log('Reinitializing worker with:', lang);
        await window.__hocrWorker.terminate();
        window.__hocrWorker = await Tesseract.createWorker(lang);
      }

      console.log('Recognizing text...');
      const result = await window.__hocrWorker.recognize(canvas);
      
      const hocr = result.data.hocr || '';
      const rawText = result.data.text || '';
      const structuredText = hocrToStructuredText(hocr, true);
      const text = structuredText || rawText;

      const editor = window.tinymce?.get?.('0');
      if (editor) {
        editor.setContent(text);
        console.log('OCR complete! Set in TinyMCE. Confidence:', result.data.confidence);
      }

      return text;
    };

    const originalDoOCR = window.doOCR;
    window.doOCR = async function() {
      const result = await window.__performClientOCR();
      if (!result && originalDoOCR) {
        return originalDoOCR.apply(this, arguments);
      }
      return result;
    };

    console.log('HOCR patch applied - client-side OCR enabled');
    return true;
  } catch (err) {
    console.error('Failed to initialize HOCR worker:', err);
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
