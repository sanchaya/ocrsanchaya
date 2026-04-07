const SCRIPT_PATTERNS = {
  kannada: /[\u0C80-\u0CFF]/,
  devanagari: /[\u0900-\u097F]/,
  tamil: /[\u0B80-\u0BFF]/,
  telugu: /[\u0C00-\u0C7F]/,
  malayalam: /[\u0D00-\u0D7F]/,
  english: /[a-zA-Z]/
};

function detectScript(text) {
  const scripts = [];
  for (const [script, pattern] of Object.entries(SCRIPT_PATTERNS)) {
    if (pattern.test(text)) {
      scripts.push(script);
    }
  }
  return scripts.length > 0 ? scripts : ['unknown'];
}

function parseHOCR(hocrText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(hocrText, 'text/html');
  const lines = [];
  let currentBlock = null;
  
  doc.querySelectorAll('.ocr_line').forEach(line => {
    const words = [];
    let lineText = '';
    let lineStyles = {
      bold: false,
      italic: false,
      fontSize: null
    };
    
    line.querySelectorAll('.ocrx_word').forEach(word => {
      const text = word.textContent.trim();
      if (!text) return;
      
      const title = word.getAttribute('title') || '';
      const fontMatch = title.match(/x_font\s+(\d+)/);
      const baselineMatch = title.match(/baseline\s+([\d.-]+)\s+([\d.-]+)/);
      
      words.push({
        text,
        x: parseInt(fontMatch?.[1] || 0),
        baseline: baselineMatch ? parseFloat(baselineMatch[1]) : 0,
        scripts: detectScript(text)
      });
      
      lineText += text + ' ';
    });
    
    lineText = lineText.trim();
    if (!lineText) return;
    
    const bboxMatch = line.getAttribute('title')?.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (bboxMatch) {
      lines.push({
        text: lineText,
        top: parseInt(bboxMatch[2]),
        bottom: parseInt(bboxMatch[4]),
        words: words,
        scripts: detectScript(lineText),
        isBold: lineStyles.bold,
        isItalic: lineStyles.italic
      });
    }
  });
  
  return lines;
}

function hocrToStructuredText(hocrText, preserveFormatting = true) {
  const lines = parseHOCR(hocrText);
  
  if (!preserveFormatting) {
    return lines.map(l => l.text).join('\n');
  }
  
  let result = '';
  let lastScript = null;
  
  lines.forEach((line, index) => {
    const currentScripts = line.scripts;
    
    if (lastScript && !arraysEqual(lastScript, currentScripts)) {
      result += `\n[Scripts: ${currentScripts.join(', ')}]\n`;
    }
    
    if (line.scripts.includes('kannada') && line.scripts.includes('english')) {
      result += line.words.map(w => {
        if (w.scripts.includes('kannada')) {
          return `<span class="kannada">${w.text}</span>`;
        } else {
          return `<span class="english">${w.text}</span>`;
        }
      }).join(' ') + '\n';
    } else {
      result += line.text + '\n';
    }
    
    lastScript = currentScripts;
  });
  
  return result;
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function performOCRClientSide(imageData, language = 'kan', progressCallback = null) {
  if (typeof Tesseract === 'undefined') {
    throw new Error('Tesseract.js not loaded. Please include tesseract.min.js');
  }
  
  const result = await Tesseract.recognize(imageData, language, {
    logger: m => {
      if (progressCallback && m.status === 'recognizing text') {
        progressCallback({ progress: m.progress * 100, status: m.status });
      }
    }
  });
  
  return {
    text: result.data.text,
    hocr: result.data.hocr,
    structuredText: hocrToStructuredText(result.data.hocr, true),
    lines: parseHOCR(result.data.hocr),
    scripts: detectScript(result.data.text),
    confidence: result.data.confidence
  };
}

async function performOCRWithHOCR(imageData, language = 'kan', progressCallback = null) {
  try {
    const ocrResult = await performOCRClientSide(imageData, language, progressCallback);
    return {
      success: true,
      text: ocrResult.structuredText || ocrResult.text,
      rawText: ocrResult.text,
      scripts: ocrResult.scripts,
      confidence: ocrResult.confidence,
      lines: ocrResult.lines,
      isClientSide: true
    };
  } catch (error) {
    console.error('Client-side OCR failed:', error);
    throw error;
  }
}

window.performOCRWithHOCR = performOCRWithHOCR;
window.hocrToStructuredText = hocrToStructuredText;
window.parseHOCR = parseHOCR;
window.detectScript = detectScript;

window.initClientOCR = async function() {
  if (typeof Tesseract === 'undefined') {
    console.error('Tesseract.js not loaded');
    return false;
  }
  
  try {
    const worker = await Tesseract.createWorker('kan');
    window.__ocrWorker = worker;
    console.log('Client-side OCR worker initialized');
    return true;
  } catch (err) {
    console.error('Failed to initialize OCR worker:', err);
    return false;
  }
};

window.doClientOCR = async function(imageData, language = 'kan', progressCallback) {
  if (!window.__ocrWorker) {
    await window.initClientOCR();
  }
  
  if (!window.__ocrWorker) {
    throw new Error('OCR worker not available');
  }
  
  const result = await window.__ocrWorker.recognize(imageData);
  
  if (progressCallback) {
    progressCallback({ progress: 100, status: 'complete' });
  }
  
  const structuredText = hocrToStructuredText(result.data.hocr || '', true);
  const scripts = detectScript(result.data.text);
  
  return {
    text: structuredText || result.data.text,
    rawText: result.data.text,
    hocr: result.data.hocr,
    scripts: scripts,
    confidence: result.data.confidence
  };
};

window.__hocrReady = true;
console.log('HOCR module loaded. Call window.doClientOCR(imageData, language) for structured OCR output.');
