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
      
      window.__lastOCRResult = {
        hocr,
        rawText,
        layoutHTML,
        structuredText,
        confidence: result.data.confidence
      };
      
      console.log('OCR complete! Raw text length:', rawText.length, 'Confidence:', result.data.confidence);

      const editor = window.tinymce?.get?.('0');
      if (editor) {
        editor.setContent(layoutHTML);
        console.log('Layout HTML set in TinyMCE editor');
      }

      return window.__lastOCRResult;
    };

    window.showHOCROutput = function(type) {
      if (!window.__lastOCRResult) {
        console.log('No OCR result available. Run OCR first.');
        alert('No OCR result available. Run OCR first.');
        return;
      }
      
      let content = '';
      let title = '';
      
      switch(type) {
        case 'html':
          content = window.__lastOCRResult.layoutHTML;
          title = 'HOCR HTML Output';
          break;
        case 'hocr':
          content = window.__lastOCRResult.hocr;
          title = 'Raw HOCR Output';
          break;
        case 'text':
          content = window.__lastOCRResult.structuredText;
          title = 'Structured Text Output';
          break;
        case 'raw':
          content = window.__lastOCRResult.rawText;
          title = 'Raw Text Output';
          break;
        default:
          content = window.__lastOCRResult.layoutHTML;
          title = 'HOCR HTML Output';
      }
      
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#fff;width:90%;height:90%;border-radius:8px;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:16px;background:#f8f9fa;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;">${title}</h3>
            <div>
              <button id="copy-hocr-btn" style="padding:8px 16px;margin-right:8px;cursor:pointer;">Copy</button>
              <button id="close-hocr-btn" style="padding:8px 16px;cursor:pointer;background:#dc3545;color:#fff;border:none;border-radius:4px;">Close</button>
            </div>
          </div>
          <div style="flex:1;overflow:auto;padding:16px;">
            <textarea id="hocr-content-display" style="width:100%;height:100%;font-family:monospace;font-size:12px;border:1px solid #ddd;padding:8px;box-sizing:border-box;">${type === 'html' || type === 'hocr' ? content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : content}</textarea>
          </div>
        </div>
      `;
      modal.className = 'hocr-modal';
      document.body.appendChild(modal);
      
      modal.querySelector('#close-hocr-btn').onclick = () => modal.remove();
      modal.querySelector('#copy-hocr-btn').onclick = () => {
        const ta = document.getElementById('hocr-content-display');
        if (ta) {
          navigator.clipboard.writeText(ta.value).then(() => {
            alert('Copied to clipboard!');
          });
        }
      };
    };

    window.__addHOCRButtons = function() {
      const buttonGroup = document.querySelector('.actions');
      if (!buttonGroup) {
        console.log('Button group not found, retrying...');
        setTimeout(window.__addHOCRButtons, 1000);
        return;
      }
      
      if (document.getElementById('hocr-html-btn')) {
        console.log('HOCR buttons already added');
        return;
      }
      
      const btnContainer = document.createElement('div');
      btnContainer.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px;';
      btnContainer.innerHTML = `
        <button id="hocr-html-btn" class="btn-secondary" style="padding:10px 16px;font-size:13px;">View HTML</button>
        <button id="hocr-raw-btn" class="btn-secondary" style="padding:10px 16px;font-size:13px;">View HOCR</button>
        <button id="hocr-text-btn" class="btn-secondary" style="padding:10px 16px;font-size:13px;">View Text</button>
      `;
      
      btnContainer.querySelector('#hocr-html-btn').onclick = () => window.showHOCROutput('html');
      btnContainer.querySelector('#hocr-raw-btn').onclick = () => window.showHOCROutput('hocr');
      btnContainer.querySelector('#hocr-text-btn').onclick = () => window.showHOCROutput('text');
      
      buttonGroup.appendChild(btnContainer);
      
      console.log('HOCR view buttons added successfully');
    };

    const originalDoOCR = window.doOCR;
    window.doOCR = async function() {
      const result = await window.__performClientOCR();
      if (!result && originalDoOCR) {
        return originalDoOCR.apply(this, arguments);
      }
      window.__addHOCRButtons();
      return result;
    };

    window.__addHOCRButtons();

    console.log('HOCR patch applied - layout-preserving OCR enabled with view options');
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
