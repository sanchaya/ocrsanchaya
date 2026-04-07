window.initHOCRPatch = async function() {
  if (typeof Tesseract === 'undefined') {
    console.log('Tesseract.js not loaded yet, waiting...');
    return false;
  }

  window.__ocrServerDisabled = true;
  window.fetch = (function(originalFetch) {
    return function(url, options) {
      if (typeof url === 'string' && url.includes('ocr-server.sanchaya.net')) {
        console.log('Server OCR disabled, using client-side only');
        return Promise.resolve(new Response(JSON.stringify({ status: 'disabled', message: 'Using client-side OCR' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return originalFetch.apply(this, arguments);
    };
  })(window.fetch);

  let attempts = 0;
  while (attempts < 60) {
    if (window.Tesseract && window.Tesseract.createWorker) {
      break;
    }
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }

  try {
    const worker = await Tesseract.createWorker('kan+eng');
    window.__hocrWorker = worker;
    console.log('HOCR worker initialized');

    window.doClientSideOCR = async function(imageElement) {
      console.log('Using client-side HOCR OCR');
      
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0);

      const lang = document.querySelector('#langsel, .language-select select')?.value || 'kan';
      
      try {
        await window.__hocrWorker.reinitialize(lang);
      } catch (e) {
        await window.__hocrWorker.terminate();
        window.__hocrWorker = await Tesseract.createWorker(lang);
      }

      const result = await window.__hocrWorker.recognize(canvas);
      const structuredText = hocrToStructuredText(result.data.hocr || '', true);
      const text = structuredText || result.data.text;

      const textarea = document.querySelector('#editable-text');
      if (textarea) {
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const editor = window.tinymce?.get?.('0');
      if (editor) {
        editor.setContent(text);
      }

      console.log('OCR complete, confidence:', result.data.confidence);
      return text;
    };

    const originalDoOCR = window.doOCR;
    window.doOCR = async function() {
      const img = document.querySelector('#selected-image, .drop img, .img-container img');
      if (img && img.src && !img.src.includes('Funny-Minion') && img.naturalWidth > 0) {
        return window.doClientSideOCR(img);
      }
      if (originalDoOCR) {
        return originalDoOCR.apply(this, arguments);
      }
    };

    console.log('HOCR patch applied successfully - client-side OCR enabled');
    return true;
  } catch (err) {
    console.error('Failed to initialize HOCR worker:', err);
    return false;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.initHOCRPatch();
  }, 2000);
});
