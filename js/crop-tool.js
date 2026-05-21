/**
 * Image Cropping and OCR Text Extraction Tool
 * Allows users to select regions from images and copy corresponding OCR text
 * 
 * Features:
 * - Drag-to-select rectangles on image
 * - Extract OCR text from selected regions
 * - Copy/append extracted text to textarea
 */

class CropTool {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.img = null;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.selections = [];
    this.currentSelection = null;
    this.cropModeActive = false;
    this.ocrResults = null;
    this.imageScale = 1;
    
    this.init();
  }

  init() {
    this.canvas = document.getElementById('crop-canvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    const cropModeBtn = document.getElementById('crop-mode-btn');
    const cropClearBtn = document.getElementById('crop-clear-btn');
    const selectedImage = document.getElementById('selected-image');
    const cropControls = document.getElementById('crop-controls');

    if (cropModeBtn) {
      cropModeBtn.addEventListener('click', () => this.toggleCropMode());
    }
    if (cropClearBtn) {
      cropClearBtn.addEventListener('click', () => this.clearSelections());
    }
    if (selectedImage) {
      selectedImage.addEventListener('load', () => this.onImageLoad());
    }
  }

  onImageLoad() {
    const img = document.getElementById('selected-image');
    if (!img.src || img.src.includes('data:image')) {
      this.setupCanvas(img);
    }
  }

  setupCanvas(img) {
    this.img = img;
    const rect = img.getBoundingClientRect();
    
    this.canvas.width = img.naturalWidth || img.width;
    this.canvas.height = img.naturalHeight || img.height;
    
    this.imageScale = rect.width / this.canvas.width;
    
    // Position canvas over image
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = rect.top + 'px';
    this.canvas.style.left = rect.left + 'px';
    this.canvas.style.cursor = 'crosshair';
    
    // Setup event listeners
    this.canvas.addEventListener('mousedown', (e) => this.startSelection(e));
    this.canvas.addEventListener('mousemove', (e) => this.drawSelection(e));
    this.canvas.addEventListener('mouseup', (e) => this.endSelection(e));
    this.canvas.addEventListener('mouseleave', () => this.cancelSelection());
    
    this.drawImageOnCanvas();
  }

  drawImageOnCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
    
    // Draw existing selections
    this.selections.forEach(sel => this.drawRect(sel, 'rgba(67, 97, 238, 0.3)'));
  }

  toggleCropMode() {
    this.cropModeActive = !this.cropModeActive;
    this.canvas.style.display = this.cropModeActive ? 'block' : 'none';
    
    const btn = document.getElementById('crop-mode-btn');
    const cropControls = document.getElementById('crop-controls');
    
    if (btn) {
      btn.textContent = this.cropModeActive ? 'Crop Mode (Active)' : 'Crop Mode';
      btn.classList.toggle('active', this.cropModeActive);
    }
    
    // Ensure crop controls are visible when crop mode is active
    if (cropControls && this.ocrResults) {
      cropControls.style.display = 'block';
    }
    
    if (!this.cropModeActive) {
      this.clearSelections();
    }
  }

  startSelection(e) {
    if (!this.cropModeActive) return;
    
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = Math.round((e.clientX - rect.left) / this.imageScale);
    this.startY = Math.round((e.clientY - rect.top) / this.imageScale);
  }

  drawSelection(e) {
    if (!this.isDrawing || !this.cropModeActive) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.currentX = Math.round((e.clientX - rect.left) / this.imageScale);
    this.currentY = Math.round((e.clientY - rect.top) / this.imageScale);
    
    // Redraw everything
    this.drawImageOnCanvas();
    
    // Draw current selection (preview)
    this.ctx.strokeStyle = '#4361ee';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    const w = this.currentX - this.startX;
    const h = this.currentY - this.startY;
    this.ctx.strokeRect(this.startX, this.startY, w, h);
    this.ctx.setLineDash([]);
  }

  endSelection(e) {
    if (!this.isDrawing || !this.cropModeActive) return;
    
    this.isDrawing = false;
    
    const w = this.currentX - this.startX;
    const h = this.currentY - this.startY;
    
    // Minimum selection size
    if (Math.abs(w) > 10 && Math.abs(h) > 10) {
      this.currentSelection = {
        x: Math.min(this.startX, this.currentX),
        y: Math.min(this.startY, this.currentY),
        width: Math.abs(w),
        height: Math.abs(h),
        timestamp: Date.now()
      };
      
      this.selections.push(this.currentSelection);
      
      // Show copy button
      this.showCopyButton(this.currentSelection);
      
      this.drawImageOnCanvas();
    }
  }

  cancelSelection() {
    this.isDrawing = false;
    if (this.cropModeActive) {
      this.drawImageOnCanvas();
    }
  }

  drawRect(sel, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
    this.ctx.strokeStyle = '#4361ee';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
  }

  showCopyButton(selection) {
    const existingBtn = document.getElementById('selection-copy-btn-' + selection.timestamp);
    if (existingBtn) return;
    
    const container = document.querySelector('.image-container');
    const btn = document.createElement('button');
    btn.id = 'selection-copy-btn-' + selection.timestamp;
    btn.className = 'btn btn-sm btn-info selection-copy-btn';
    btn.textContent = 'Copy Selected Text';
    btn.style.cssText = `
      position: absolute;
      top: ${selection.y * this.imageScale + 10}px;
      left: ${selection.x * this.imageScale + 10}px;
      z-index: 10;
    `;
    btn.addEventListener('click', () => this.extractAndCopyText(selection));
    
    container.appendChild(btn);
  }

  extractAndCopyText(selection) {
    const extractedText = this.getTextFromRegion(selection);
    
    if (!extractedText) {
      alert('No OCR text found in selected region');
      return;
    }
    
    const textarea = document.getElementById('editable-text');
    if (textarea) {
      const currentText = textarea.value;
      textarea.value = currentText ? currentText + '\n' + extractedText : extractedText;
      textarea.focus();
      
      // Show success message
      alert('Text copied to textarea:\n\n' + extractedText.substring(0, 50) + '...');
    }
  }

  getTextFromRegion(selection) {
    // This function will be called after OCR results are available
    // It extracts text that falls within the selected region
    
    if (!this.ocrResults) {
      return null;
    }
    
    const selectedLines = [];
    
    if (this.ocrResults.data && this.ocrResults.data.lines) {
      this.ocrResults.data.lines.forEach(line => {
        if (this.isLineInRegion(line.bbox, selection)) {
          selectedLines.push(line.text);
        }
      });
    } else if (this.ocrResults.data && this.ocrResults.data.words) {
      // Fallback to word-level extraction
      let currentLineText = '';
      let currentLineY = null;
      
      this.ocrResults.data.words.forEach(word => {
        if (this.isPointInRegion(word.bbox, selection)) {
          if (currentLineY === null) {
            currentLineY = word.bbox.y0;
          }
          
          // Check if we're on a new line
          if (Math.abs(word.bbox.y0 - currentLineY) > 5) {
            if (currentLineText) selectedLines.push(currentLineText);
            currentLineText = word.text;
            currentLineY = word.bbox.y0;
          } else {
            currentLineText += ' ' + word.text;
          }
        }
      });
      
      if (currentLineText) selectedLines.push(currentLineText);
    }
    
    return selectedLines.join('\n').trim();
  }

  isLineInRegion(bbox, selection) {
    return bbox.x0 < selection.x + selection.width &&
           bbox.x1 > selection.x &&
           bbox.y0 < selection.y + selection.height &&
           bbox.y1 > selection.y;
  }

  isPointInRegion(bbox, selection) {
    const centerX = (bbox.x0 + bbox.x1) / 2;
    const centerY = (bbox.y0 + bbox.y1) / 2;
    
    return centerX >= selection.x &&
           centerX <= selection.x + selection.width &&
           centerY >= selection.y &&
           centerY <= selection.y + selection.height;
  }

  clearSelections() {
    this.selections = [];
    this.currentSelection = null;
    
    // Remove copy buttons
    document.querySelectorAll('.selection-copy-btn').forEach(btn => btn.remove());
    
    if (this.cropModeActive) {
      this.drawImageOnCanvas();
    }
  }

  setOCRResults(results) {
    this.ocrResults = results;
  }
}

// Initialize crop tool when document is ready
let cropTool = null;
document.addEventListener('DOMContentLoaded', () => {
  cropTool = new CropTool();
});
