window.initHOCRPatch = async function() {
  console.log('HOCR patch starting...');
  
  if (typeof Tesseract === 'undefined') {
    console.log('ERROR: Tesseract.js not loaded!');
    return false;
  }
  console.log('Tesseract.js loaded');

  window.__ocrServerDisabled = true;
  window.__lastOCRResult = null;
  window.__ocrWorker = null;
  
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('ocr-server.sanchaya.net')) {
      console.log('Server blocked');
      return Promise.resolve(new Response(JSON.stringify({ status: 'disabled' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    return originalFetch.apply(this, arguments);
  };

  async function getOrCreateWorker(lang) {
    if (window.__ocrWorker) {
      try {
        await window.__ocrWorker.terminate();
      } catch (e) {}
      window.__ocrWorker = null;
    }
    console.log('Creating new worker for:', lang);
    const worker = await Tesseract.createWorker(lang);
    window.__ocrWorker = worker;
    console.log('Worker created');
    return worker;
  }

  window.__runClientOCR = async function() {
    console.log('__runClientOCR called');
    
    const img = document.querySelector('.img-container img') || 
                document.querySelector('#selected-image') ||
                document.querySelector('.drop img');
    
    if (!img || !img.src || img.naturalWidth === 0) {
      alert('Please upload an image first!');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let lang = 'kan+eng';
    const langSelect = document.querySelector('.language-select select');
    if (langSelect && langSelect.value) {
      lang = langSelect.value;
    }
    if (lang === 'tesseract' || !lang) lang = 'kan+eng';
    console.log('Language:', lang);
    
    try {
      const worker = await getOrCreateWorker(lang);
      console.log('Running OCR...');
      const result = await worker.recognize(canvas);
      console.log('OCR done!');
      
      const hocr = result.data.hocr || '';
      const rawText = result.data.text || '';
      const layoutHTML = hocrToLayoutHTML(hocr, img.naturalWidth, img.naturalHeight);
      const structuredText = hocrToStructuredText(hocr, true);
      
      window.__lastOCRResult = { hocr, rawText, layoutHTML, structuredText, confidence: result.data.confidence };
      console.log('Result saved. Length:', rawText.length);

      const editor = window.tinymce?.get?.('0');
      if (editor) {
        editor.setContent(layoutHTML);
      }
      
      alert('OCR complete! Use View buttons.');
      return window.__lastOCRResult;
    } catch (err) {
      console.error('OCR Error:', err);
      alert('OCR failed: ' + err.message);
      return null;
    }
  };

  window.showHOCROutput = function(type) {
    if (!window.__lastOCRResult) {
      alert('Run OCR first!');
      return;
    }
    
    let content = '', title = '';
    switch(type) {
      case 'html': content = window.__lastOCRResult.layoutHTML; title = 'HTML'; break;
      case 'hocr': content = window.__lastOCRResult.hocr; title = 'HOCR'; break;
      case 'text': content = window.__lastOCRResult.structuredText; title = 'Text'; break;
      default: content = window.__lastOCRResult.rawText; title = 'Raw';
    }
    
    const modal = document.createElement('div');
    modal.id = 'hocr-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:#fff;width:90%;height:85%;border-radius:8px;display:flex;flex-direction:column;overflow:hidden;"><div style="padding:12px 16px;background:#eee;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;"><strong>' + title + '</strong><button onclick="this.closest(\'#hocr-modal\').remove()" style="padding:6px 12px;cursor:pointer;">X</button></div><textarea style="flex:1;width:100%;font-family:monospace;font-size:11px;border:none;padding:12px;resize:none;box-sizing:border-box;">' + (type === 'html' || type === 'hocr' ? content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : content) + '</textarea></div>';
    document.body.appendChild(modal);
  };

  function addButtons() {
    const actions = document.querySelector('.actions');
    if (!actions) {
      setTimeout(addButtons, 1000);
      return;
    }
    
    if (document.getElementById('ocr-btn-container')) {
      return;
    }
    
    const div = document.createElement('div');
    div.id = 'ocr-btn-container';
    div.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:10px;padding-top:10px;border-top:1px solid #ddd;';
    div.innerHTML = '<button onclick="window.__runClientOCR()" style="padding:8px 14px;background:#28a745;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Run Client OCR</button><button onclick="window.showHOCROutput(\'html\')" style="padding:8px 14px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;">View HTML</button><button onclick="window.showHOCROutput(\'hocr\')" style="padding:8px 14px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;">View HOCR</button><button onclick="window.showHOCROutput(\'text\')" style="padding:8px 14px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;">View Text</button>';
    actions.appendChild(div);
    console.log('Buttons added!');
  }

  addButtons();
  console.log('HOCR ready!');
  return true;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(window.initHOCRPatch, 2000));
} else {
  setTimeout(window.initHOCRPatch, 2000);
}
