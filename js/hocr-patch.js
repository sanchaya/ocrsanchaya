window.initHOCRPatch = async function() {
  console.log('HOCR patch starting...');
  
  if (typeof Tesseract === 'undefined') {
    console.log('ERROR: Tesseract.js not loaded!');
    return false;
  }
  console.log('Tesseract.js loaded');

  window.__ocrServerDisabled = true;
  window.__lastOCRResult = null;
  
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

  console.log('Creating OCR worker...');
  try {
    const worker = await Tesseract.createWorker('kan+eng');
    window.__ocrWorker = worker;
    console.log('OCR worker ready!');
  } catch (err) {
    console.error('Failed to create worker:', err);
    return false;
  }

  window.__runClientOCR = async function() {
    console.log('__runClientOCR called');
    
    const img = document.querySelector('.img-container img') || 
                document.querySelector('#selected-image') ||
                document.querySelector('.drop img');
    
    console.log('Image element:', img);
    
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
    if (langSelect) lang = langSelect.value;
    console.log('Language:', lang);
    
    if (!window.__ocrWorker) {
      console.log('Worker is null, recreating...');
      window.__ocrWorker = await Tesseract.createWorker(lang);
    }
    
    try {
      await window.__ocrWorker.reinitialize(lang);
    } catch (e) {
      await window.__ocrWorker.terminate();
      window.__ocrWorker = await Tesseract.createWorker(lang);
    }

    console.log('Running OCR...');
    const result = await window.__ocrWorker.recognize(canvas);
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
  };

  window.showHOCROutput = function(type) {
    console.log('showHOCROutput:', type, 'Result:', window.__lastOCRResult ? 'exists' : 'null');
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
    modal.innerHTML = `
      <div style="background:#fff;width:90%;height:85%;border-radius:8px;display:flex;flex-direction:column;overflow:hidden;">
        <div style="padding:12px 16px;background:#eee;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
          <strong>${title}</strong>
          <button onclick="this.closest('#hocr-modal').remove()" style="padding:6px 12px;cursor:pointer;">X</button>
        </div>
        <textarea style="flex:1;width:100%;font-family:monospace;font-size:11px;border:none;padding:12px;resize:none;box-sizing:border-box;">${type === 'html' || type === 'hocr' ? content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : content}</textarea>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window.__addButtons = function() {
    console.log('Looking for .actions...');
    const actions = document.querySelector('.actions');
    console.log('Found:', actions ? 'yes' : 'no');
    
    if (!actions) {
      setTimeout(window.__addButtons, 1000);
      return;
    }
    
    if (document.getElementById('ocr-btn-container')) {
      console.log('Buttons already added');
      return;
    }
    
    const div = document.createElement('div');
    div.id = 'ocr-btn-container';
    div.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:10px;padding-top:10px;border-top:1px solid #ddd;';
    div.innerHTML = `
      <button onclick="window.__runClientOCR()" style="padding:8px 14px;background:#28a745;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Run Client OCR</button>
      <button onclick="window.showHOCROutput('html')" style="padding:8px 14px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;">View HTML</button>
      <button onclick="window.showHOCROutput('hocr')" style="padding:8px 14px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;">View HOCR</button>
      <button onclick="window.showHOCROutput('text')" style="padding:8px 14px;background:#4361ee;color:#fff;border:none;border-radius:6px;cursor:pointer;">View Text</button>
    `;
    actions.appendChild(div);
    console.log('Buttons added!');
  };

  window.__addButtons();
  console.log('HOCR ready!');
  return true;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(window.initHOCRPatch, 2000));
} else {
  setTimeout(window.initHOCRPatch, 2000);
}
