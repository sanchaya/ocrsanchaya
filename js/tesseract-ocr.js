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

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function parseHOCR(hocrText, imageWidth, imageHeight) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(hocrText, 'text/html');
  const lines = [];
  const paragraphs = [];
  
  doc.querySelectorAll('.ocr_par').forEach(par => {
    const parBbox = par.getAttribute('title')?.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    const parLines = [];
    
    par.querySelectorAll('.ocr_line').forEach(line => {
      const words = [];
      let lineText = '';
      
      line.querySelectorAll('.ocrx_word').forEach(word => {
        const text = word.textContent.trim();
        if (!text) return;
        
        const title = word.getAttribute('title') || '';
        const bboxMatch = title.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
        const baselineMatch = title.match(/baseline\s+([\d.-]+)\s+([\d.-]+)/);
        const fontMatch = title.match(/x_font\s+([^;]+)/);
        const x_sizeMatch = title.match(/x_size\s+([\d.]+)/);
        
        if (bboxMatch) {
          words.push({
            text,
            x: parseInt(bboxMatch[1]),
            y: parseInt(bboxMatch[2]),
            width: parseInt(bboxMatch[3]) - parseInt(bboxMatch[1]),
            height: parseInt(bboxMatch[4]) - parseInt(bboxMatch[2]),
            baseline: baselineMatch ? parseFloat(baselineMatch[1]) : 0,
            font: fontMatch ? fontMatch[1].trim() : '',
            fontSize: x_sizeMatch ? parseFloat(x_sizeMatch[1]) : 0,
            scripts: detectScript(text)
          });
          lineText += text + ' ';
        }
      });
      
      if (words.length > 0) {
        const lineBbox = line.getAttribute('title')?.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
        if (lineBbox) {
          parLines.push({
            text: lineText.trim(),
            words,
            x: parseInt(lineBbox[1]),
            y: parseInt(lineBbox[2]),
            width: parseInt(lineBbox[3]) - parseInt(lineBbox[1]),
            height: parseInt(lineBbox[4]) - parseInt(lineBbox[2])
          });
        }
      }
    });
    
    if (parLines.length > 0) {
      paragraphs.push(parLines);
    }
  });
  
  if (paragraphs.length === 0) {
    doc.querySelectorAll('.ocr_line').forEach(line => {
      const words = [];
      let lineText = '';
      
      line.querySelectorAll('.ocrx_word').forEach(word => {
        const text = word.textContent.trim();
        if (!text) return;
        
        const title = word.getAttribute('title') || '';
        const bboxMatch = title.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
        
        if (bboxMatch) {
          words.push({
            text,
            x: parseInt(bboxMatch[1]),
            y: parseInt(bboxMatch[2]),
            width: parseInt(bboxMatch[3]) - parseInt(bboxMatch[1]),
            height: parseInt(bboxMatch[4]) - parseInt(bboxMatch[2]),
            scripts: detectScript(text)
          });
          lineText += text + ' ';
        }
      });
      
      if (words.length > 0) {
        const lineBbox = line.getAttribute('title')?.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
        if (lineBbox) {
          lines.push({
            text: lineText.trim(),
            words,
            x: parseInt(lineBbox[1]),
            y: parseInt(lineBbox[2]),
            width: parseInt(lineBbox[3]) - parseInt(lineBbox[1]),
            height: parseInt(lineBbox[4]) - parseInt(lineBbox[2])
          });
        }
      }
    });
  }
  
  return {
    paragraphs,
    lines: paragraphs.length === 0 ? lines : [],
    imageWidth,
    imageHeight
  };
}

function hocrToLayoutHTML(hocrText, imageWidth, imageHeight) {
  const parsed = parseHOCR(hocrText, imageWidth, imageHeight);
  const containerWidth = imageWidth || 800;
  const containerHeight = imageHeight || 1000;
  
  let html = `<div class="ocr-output" style="position: relative; width: ${containerWidth}px; min-height: ${containerHeight}px; font-family: 'Noto Sans', sans-serif;">`;
  
  if (parsed.paragraphs.length > 0) {
    parsed.paragraphs.forEach((parLines, pIdx) => {
      html += `<p class="ocr-paragraph" style="margin: 0; padding: 2px 0;">`;
      parLines.forEach((line, lIdx) => {
        html += `<span class="ocr-line" style="position: absolute; left: ${line.x}px; top: ${line.y}px; white-space: nowrap;">`;
        line.words.forEach((word, wIdx) => {
          const isKannada = word.scripts.includes('kannada');
          const isDevanagari = word.scripts.includes('devanagari');
          const fontStyle = isKannada || isDevanagari ? 'font-family: "Noto Sans Kannada", "Noto Sans", sans-serif;' : '';
          html += `<span class="ocr-word" style="position: absolute; left: ${word.x - line.x}px; top: ${word.y - line.y}px; ${fontStyle}">${escapeHtml(word.text)}</span>`;
        });
        html += `</span>`;
      });
      html += `</p>`;
    });
  } else if (parsed.lines.length > 0) {
    parsed.lines.forEach((line, idx) => {
      html += `<span class="ocr-line" style="position: absolute; left: ${line.x}px; top: ${line.y}px; white-space: nowrap;">`;
      line.words.forEach((word, wIdx) => {
        const isKannada = word.scripts.includes('kannada');
        const isDevanagari = word.scripts.includes('devanagari');
        const fontStyle = isKannada || isDevanagari ? 'font-family: "Noto Sans Kannada", "Noto Sans", sans-serif;' : '';
        html += `<span class="ocr-word" style="position: absolute; left: ${word.x - line.x}px; top: ${word.y - line.y}px; ${fontStyle}">${escapeHtml(word.text)}</span>`;
      });
      html += `</span>`;
    });
  }
  
  html += '</div>';
  return html;
}

function hocrToStructuredText(hocrText, preserveFormatting = true) {
  const parsed = parseHOCR(hocrText, 0, 0);
  
  if (!preserveFormatting) {
    const allLines = parsed.paragraphs.flat().length > 0 ? parsed.paragraphs.flat() : parsed.lines;
    return allLines.map(l => l.text).join('\n');
  }
  
  let result = '';
  
  if (parsed.paragraphs.length > 0) {
    parsed.paragraphs.forEach((par, pIdx) => {
      par.forEach((line, lIdx) => {
        const lineText = line.words.map(w => w.text).join(' ');
        result += lineText + '\n';
      });
      result += '\n';
    });
  } else {
    parsed.lines.forEach(line => {
      const lineText = line.words.map(w => w.text).join(' ');
      result += lineText + '\n';
    });
  }
  
  return result.trim();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.hocrToLayoutHTML = hocrToLayoutHTML;
window.hocrToStructuredText = hocrToStructuredText;
window.parseHOCR = parseHOCR;
window.detectScript = detectScript;

window.__hocrReady = true;
console.log('HOCR module loaded with layout preservation');
