/**
 * Image Cropping and OCR Text Extraction Tool
 * Allows users to select regions from images and copy corresponding OCR text
 * 
 * Features:
 * - Drag-to-select rectangles on image
 * - Extract OCR text from selected regions
 * - Copy/append extracted text to textarea
 * - Undo/Redo functionality with keyboard shortcuts
 * - Optimized for performance with large images
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
    
    // Undo/Redo history
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 20;
    
    // Performance optimization
    this.drawRequestId = null;
    this.lastDrawTime = 0;
    this.minDrawInterval = 16; // ~60fps
    this.cachedImageCanvas = null;
    
    this.init();
  }

  init() {
    this.canvas = document.getElementById('crop-canvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    const cropModeBtn = document.getElementById('crop-mode-btn');
    const cropClearBtn = document.getElementById('crop-clear-btn');
    const undoBtn = document.getElementById('crop-undo-btn');
    const redoBtn = document.getElementById('crop-redo-btn');
    const selectedImage = document.getElementById('selected-image');
    const cropControls = document.getElementById('crop-controls');

    if (cropModeBtn) {
      cropModeBtn.addEventListener('click', () => this.toggleCropMode());
    }
    if (cropClearBtn) {
      cropClearBtn.addEventListener('click', () => this.clearSelections());
    }
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.redo());
    }
    if (selectedImage) {
      selectedImage.addEventListener('load', () => this.onImageLoad());
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
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
    // Cancel any pending draw request
    if (this.drawRequestId) {
      cancelAnimationFrame(this.drawRequestId);
    }
    
    // Use RequestAnimationFrame for smooth drawing
    this.drawRequestId = requestAnimationFrame(() => {
      const now = Date.now();
      
      // Throttle draws to ~60fps
      if (now - this.lastDrawTime < this.minDrawInterval) {
        this.drawRequestId = requestAnimationFrame(() => this.drawImageOnCanvasNow());
        return;
      }
      
      this.drawImageOnCanvasNow();
      this.lastDrawTime = now;
    });
  }
  
  drawImageOnCanvasNow() {
    if (!this.ctx || !this.img) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw image
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
    
    // Throttled redraw
    const now = Date.now();
    if (now - this.lastDrawTime >= this.minDrawInterval) {
      this.redrawWithPreview();
      this.lastDrawTime = now;
    }
  }
  
  redrawWithPreview() {
    if (!this.ctx) return;
    
    // Redraw everything
    this.drawImageOnCanvasNow();
    
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
      this.saveToHistory();
      
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
    
    // Optimize by using Set for faster lookups if available
    if (this.ocrResults.data && this.ocrResults.data.lines) {
      // Filter lines more efficiently
      const selectedLineIndices = [];
      
      for (let i = 0; i < this.ocrResults.data.lines.length; i++) {
        const line = this.ocrResults.data.lines[i];
        if (this.isLineInRegion(line.bbox, selection)) {
          selectedLineIndices.push(i);
          selectedLines.push(line.text);
        }
      }
      
      // If too many lines selected, warn for memory
      if (selectedLineIndices.length > 1000) {
        console.warn(`Warning: Large selection with ${selectedLineIndices.length} lines. Performance may be affected.`);
      }
    } else if (this.ocrResults.data && this.ocrResults.data.words) {
      // Fallback to word-level extraction with optimization
      let currentLineText = '';
      let currentLineY = null;
      
      // Pre-filter words to reduce iteration
      const relevantWords = this.ocrResults.data.words.filter(word => 
        this.isPointInRegion(word.bbox, selection)
      );
      
      relevantWords.forEach(word => {
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
    this.saveToHistory();
    
    // Remove copy buttons
    this.clearCopyButtons();
    
    if (this.cropModeActive) {
      this.drawImageOnCanvas();
    }
  }
  
  clearCopyButtons() {
    document.querySelectorAll('.selection-copy-btn').forEach(btn => btn.remove());
  }

  // ============================================================================
  // UNDO/REDO FUNCTIONALITY
  // ============================================================================
  
  saveToHistory() {
    // Remove any redo history if we make a new action
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add new state
    this.history.push(JSON.parse(JSON.stringify(this.selections)));
    this.historyIndex++;
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
    
    this.updateHistoryButtons();
  }
  
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.selections = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.clearCopyButtons();
      this.drawImageOnCanvas();
      this.updateHistoryButtons();
      this.showNotification('Undo: Removed selection');
    }
  }
  
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.selections = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.clearCopyButtons();
      this.drawImageOnCanvas();
      this.updateHistoryButtons();
      this.showNotification('Redo: Restored selection');
    }
  }
  
  updateHistoryButtons() {
    const undoBtn = document.getElementById('crop-undo-btn');
    const redoBtn = document.getElementById('crop-redo-btn');
    
    if (undoBtn) {
      undoBtn.disabled = this.historyIndex <= 0;
      undoBtn.style.opacity = this.historyIndex <= 0 ? '0.5' : '1';
    }
    if (redoBtn) {
      redoBtn.disabled = this.historyIndex >= this.history.length - 1;
      redoBtn.style.opacity = this.historyIndex >= this.history.length - 1 ? '0.5' : '1';
    }
  }
  
  handleKeyboardShortcuts(e) {
    if (!this.cropModeActive) return;
    
    // Cmd/Ctrl + Z for undo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    }
    // Cmd/Ctrl + Shift + Z for redo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      this.redo();
    }
    // Escape to exit crop mode
    if (e.key === 'Escape') {
      this.toggleCropMode();
    }
  }
  
  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4361ee;
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      animation: slideIn 0.3s ease-in-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2000);
  }

  // ============================================================================
  // MEMORY & PERFORMANCE MANAGEMENT
  // ============================================================================
  
  cleanup() {
    // Cancel any pending animation frames
    if (this.drawRequestId) {
      cancelAnimationFrame(this.drawRequestId);
      this.drawRequestId = null;
    }
    
    // Clear cached data
    this.selections = [];
    this.history = [];
    this.ocrResults = null;
    this.cachedImageCanvas = null;
    
    // Disable crop mode
    if (this.cropModeActive) {
      this.toggleCropMode();
    }
  }
  
  getMemoryStats() {
    return {
      selectionsCount: this.selections.length,
      historySize: this.history.length,
      maxHistorySize: this.maxHistorySize,
      hasOCRData: this.ocrResults !== null,
      estimatedMemory: {
        selections: this.selections.length * 64, // ~64 bytes per selection
        history: this.history.length * this.selections.length * 64,
        ocrData: this.ocrResults ? 'data loaded' : '0 bytes'
      }
    };
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
