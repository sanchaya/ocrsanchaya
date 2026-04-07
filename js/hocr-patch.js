window.initHOCRPatch = async function() {
  if (typeof Tesseract === 'undefined') {
    console.log('Tesseract.js not loaded yet, waiting...');
    return false;
  }

  window.__ocrServerDisabled = true;
  window.__lastOCRResult = null;
  
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('ocr-server.sanchaya.net')) {
      console.log('Server OCR blocked');
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
    console.log('Creating OCR worker...');
    const worker = await Tesseract.createWorker('kan+eng');
    window.__ocrWorker = worker;
    console.log('OCR worker initialized');

    window.__runClientOCR = async function() {
      console.log('Starting client-side OCR...');
      
      let img = document.querySelector('.img-container img');
      if (!img) img = document.querySelector('#selected-image');
      if (!img) img = document.querySelector('.drop img');
      
      if (!img || !img.src || img.naturalWidth === 0 || img.src.includes('Funny-Minion')) {
        alert('Please upload an image first!');
        return null;
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
        await window.__ocrWorker.terminate();
        window.__ocrWorker = await Tesseract.createWorker(lang);
      }

      console.log('Recognizing...');
      const result = await window.__ocrWorker.recognize(canvas);
      
      const hocr = result.data.hocr || '';
      const rawText = result.data.text || '';
      
      const layoutHTML = hocrToLayoutHTML(hocr, imgWidth, imgHeight);
      const structuredText = hocrToStructuredText(hocr, true);
      
      window.__lastOCRResult = {
        hocr,
        rawText,
        layoutHTML,
        structuredText,
        confidence: result.data.confidence
      };
      
      console.log('OCR complete! Text length:', rawText.length);

      const editor = window.tinymce?.get?.('0');
      if (editor) {
        editor.setContent(layoutHTML);
      }

      alert('OCR complete! Use View buttons to see output.');
      return window.__lastOCRResult;
    };

    window.showHOCROutput = function(type) {
      if (!window.__lastOCRResult) {
        alert('No OCR result. Click "Run Client OCR" first!');
        return;
      }
      
      let content = '';
      let title = '';
      
      switch(type) {
        case 'html': content = window.__lastOCRResult.layoutHTML; title = 'HOCR HTML'; break;
        case 'hocr': content = window.__lastOCRResult.hocr; title = 'Raw HOCR'; break;
        case 'text': content = window.__lastOCRResult.structuredText; title = 'Structured Text'; break;
        default: content = window.__lastOCRResult.rawText; title = 'Raw Text';
      }
      
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;padding:20px;';
      modal.innerHTML = `
        <div style="background:#fff;width:95%;height:95%;margin:0 auto;border-radius:8px;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:16px;background:#f8f9fa;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;">${title}</h3>
            <button id="close-modal" style="padding:8px 16px;cursor:pointer;background:#dc3545;color:#fff;border:none;border-radius:4px;">Close</button>
          </div>
          <div style="flex:1;overflow:auto;padding:16px;">
            <textarea style="width:100%;height:100%;font-family:monospace;font-size:12px;border:1px solid #ddd;padding:8px;box-sizing:border-box;white-space:pre-wrap;">${type === 'html' || type === 'hocr' ? content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : content}</textarea>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('#close-modal').onclick = () => modal.remove();
    };

    window.__addHOCRButtons = function() {
      const actions = document.querySelector('.actions');
      if (!actions) {
        setTimeout(window.__addHOCRButtons, 1000);
        return;
      }
      
      if (document.getElementById('run-client-ocr-btn')) return;
      
      const container = document.createElement('div');
      container.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px;padding-top:12px;border-top:1px solid #e0e0e0;';
      container.innerHTML = `
        <button id="run-client-ocr-btn" class="btn-primary" style="background:#28a745;">Run Client OCR</button>
        <button id="view-html-btn" class="btn-secondary">View HTML</button>
        <button id="view-hocr-btn" class="btn-secondary">View HOCR</button>
        <button id="view-text-btn" class="btn-secondary">View Text</button>
      `;
      
      actions.appendChild(container);
      
      container.querySelector('#run-client-ocr-btn').onclick = () => window.__runClientOCR();
      container.querySelector('#view-html-btn').onclick = () => window.showHOCROutput('html');
      container.querySelector('#view-hocr-btn').onclick = () => window.showHOCROutput('hocr');
      container.querySelector('#view-text-btn').onclick = () => window.showHOCROutput('text');
      
      console.log('OCR buttons added');
    };

    window.__addHOCRButtons();

    console.log('HOCR patch ready - click "Run Client OCR" to use');
    return true;
  } catch (err) {
    console.error('Failed:', err);
    return false;
  }
};

let patchInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
  if (patchInitialized) return;
  patchInitialized = true;
  setTimeout(window.initHOCRPatch, 2000);
});
