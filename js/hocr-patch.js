window.initHOCRPatch = async function() {
  if (typeof Tesseract === 'undefined') {
    console.log('Tesseract.js not loaded yet, waiting...');
    return false;
  }

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

    window.__originalDoOCR = window.doOCR;

    window.doOCR = async function() {
      const img = document.querySelector('#selected-image, .drop img, .img-container img');
      if (!img || !img.src || img.src.includes('Funny-Minion')) {
        if (window.__originalDoOCR) {
          return window.__originalDoOCR.apply(this, arguments);
        }
        return;
      }

      console.log('Using client-side HOCR OCR');
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const lang = window.__ocrLang || 'kan';
      
      if (window.__hocrWorker) {
        try {
          await window.__hocrWorker.reinitialize(lang);
        } catch (e) {
          await window.__hocrWorker.terminate();
          window.__hocrWorker = await Tesseract.createWorker(lang);
        }
      } else {
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

    console.log('HOCR patch applied successfully');
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
