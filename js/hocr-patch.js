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

    window.doClientSideOCR = async function() {
      console.log('Starting client-side HOCR OCR...');
      
      let img = document.querySelector('#selected-image');
      if (!img) img = document.querySelector('.img-container img');
      if (!img) img = document.querySelector('.drop img');
      if (!img) img = document.querySelector('img[id="selected-image"]');
      
      if (!img || !img.src || img.naturalWidth === 0) {
        console.log('No image found to OCR');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      let lang = 'kan';
      const langSelect = document.querySelector('#langsel, .language-select select, select[id="langsel"]');
      if (langSelect) lang = langSelect.value;
      console.log('Using language:', lang);
      
      try {
        await window.__hocrWorker.reinitialize(lang);
      } catch (e) {
        console.log('Reinitializing worker with language:', lang);
        await window.__hocrWorker.terminate();
        window.__hocrWorker = await Tesseract.createWorker(lang);
      }

      console.log('Recognizing text...');
      const result = await window.__hocrWorker.recognize(canvas);
      console.log('Recognition complete');

      const structuredText = hocrToStructuredText(result.data.hocr || '', true);
      const text = structuredText || result.data.text;

      const vueApp = document.querySelector('#app').__vue_app__;
      if (vueApp) {
        const instance = vueApp._instance;
        if (instance && instance.proxy) {
          instance.proxy.text = text;
          instance.proxy.originalText = text;
          console.log('Set text via Vue proxy');
        }
      }

      const textarea = document.querySelector('#editable-text, .tox-edit-area__iframe');
      if (textarea) {
        if (textarea.tagName === 'TEXTAREA') {
          textarea.value = text;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      const editor = window.tinymce?.get?.('0');
      if (editor) {
        editor.setContent(text);
        console.log('Set content in TinyMCE editor');
      }

      console.log('OCR complete! Confidence:', result.data.confidence);
      return text;
    };

    const originalDoOCR = window.doOCR;
    window.doOCR = async function() {
      console.log('doOCR called');
      return window.doClientSideOCR();
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
