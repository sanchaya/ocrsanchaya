/**
 * Comprehensive Test Suite for CropTool
 * Tests all crop functionality, OCR text extraction, and UI interactions
 */

const assert = require('assert');

// Mock DOM elements for testing
function createMockDOM() {
  const canvas = document.createElement('canvas');
  canvas.id = 'crop-canvas';
  document.body.appendChild(canvas);
  
  const image = document.createElement('img');
  image.id = 'selected-image';
  image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  document.body.appendChild(image);
  
  const cropModeBtn = document.createElement('button');
  cropModeBtn.id = 'crop-mode-btn';
  cropModeBtn.textContent = 'Crop Mode';
  document.body.appendChild(cropModeBtn);
  
  const cropClearBtn = document.createElement('button');
  cropClearBtn.id = 'crop-clear-btn';
  cropClearBtn.textContent = 'Clear';
  document.body.appendChild(cropClearBtn);
  
  const cropControls = document.createElement('div');
  cropControls.id = 'crop-controls';
  document.body.appendChild(cropControls);
  
  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  document.body.appendChild(imageContainer);
  
  const textarea = document.createElement('textarea');
  textarea.id = 'editable-text';
  document.body.appendChild(textarea);
  
  return { canvas, image, cropModeBtn, cropClearBtn, cropControls, imageContainer, textarea };
}

function cleanupDOM() {
  document.body.innerHTML = '';
}

// Test Suite
describe('CropTool', function() {
  
  describe('Initialization', function() {
    
    it('should initialize with correct default values', function() {
      createMockDOM();
      const tool = new CropTool();
      
      assert.strictEqual(tool.cropModeActive, false);
      assert.strictEqual(tool.isDrawing, false);
      assert.deepStrictEqual(tool.selections, []);
      assert.strictEqual(tool.currentSelection, null);
      assert.strictEqual(tool.ocrResults, null);
      assert.strictEqual(tool.imageScale, 1);
      
      cleanupDOM();
    });
    
    it('should find canvas element', function() {
      const dom = createMockDOM();
      const tool = new CropTool();
      
      assert.strictEqual(tool.canvas, dom.canvas);
      assert.notStrictEqual(tool.ctx, null);
      
      cleanupDOM();
    });
    
    it('should attach event listeners to buttons', function() {
      createMockDOM();
      const tool = new CropTool();
      const btn = document.getElementById('crop-mode-btn');
      
      assert(btn.onclick !== null || btn.hasAttribute('data-onclick'));
      
      cleanupDOM();
    });
  });
  
  describe('Crop Mode Toggle', function() {
    
    it('should toggle crop mode on/off', function() {
      createMockDOM();
      const tool = new CropTool();
      
      assert.strictEqual(tool.cropModeActive, false);
      
      tool.toggleCropMode();
      assert.strictEqual(tool.cropModeActive, true);
      
      tool.toggleCropMode();
      assert.strictEqual(tool.cropModeActive, false);
      
      cleanupDOM();
    });
    
    it('should update button text when toggling', function() {
      createMockDOM();
      const tool = new CropTool();
      const btn = document.getElementById('crop-mode-btn');
      
      tool.toggleCropMode();
      assert(btn.textContent.includes('Active'));
      
      tool.toggleCropMode();
      assert(!btn.textContent.includes('Active'));
      
      cleanupDOM();
    });
    
    it('should hide canvas when crop mode is disabled', function() {
      createMockDOM();
      const tool = new CropTool();
      
      tool.toggleCropMode();
      assert.strictEqual(tool.canvas.style.display, 'block');
      
      tool.toggleCropMode();
      assert.strictEqual(tool.canvas.style.display, 'none');
      
      cleanupDOM();
    });
    
    it('should clear selections when exiting crop mode', function() {
      createMockDOM();
      const tool = new CropTool();
      tool.selections = [{x: 10, y: 10, width: 50, height: 50}];
      
      tool.toggleCropMode();
      tool.toggleCropMode();
      
      assert.deepStrictEqual(tool.selections, []);
      
      cleanupDOM();
    });
  });
  
  describe('Selection Drawing', function() {
    
    it('should start selection and record coordinates', function() {
      createMockDOM();
      const tool = new CropTool();
      tool.toggleCropMode();
      
      const mockEvent = {
        clientX: 100,
        clientY: 100,
        preventDefault: () => {}
      };
      
      const rect = tool.canvas.getBoundingClientRect();
      Object.defineProperty(tool.canvas, 'getBoundingClientRect', {
        value: () => rect
      });
      
      tool.startSelection(mockEvent);
      assert.strictEqual(tool.isDrawing, true);
      
      cleanupDOM();
    });
    
    it('should not start selection when crop mode is inactive', function() {
      createMockDOM();
      const tool = new CropTool();
      
      const mockEvent = {
        clientX: 100,
        clientY: 100
      };
      
      tool.startSelection(mockEvent);
      assert.strictEqual(tool.isDrawing, false);
      
      cleanupDOM();
    });
    
    it('should create valid selection with minimum size', function() {
      createMockDOM();
      const tool = new CropTool();
      tool.toggleCropMode();
      
      // Simulate a large selection
      tool.startX = 10;
      tool.startY = 10;
      tool.currentX = 100;
      tool.currentY = 100;
      tool.isDrawing = true;
      tool.cropModeActive = true;
      
      const mockEvent = {};
      tool.endSelection(mockEvent);
      
      assert.strictEqual(tool.selections.length, 1);
      const selection = tool.selections[0];
      assert.strictEqual(selection.x, 10);
      assert.strictEqual(selection.y, 10);
      assert.strictEqual(selection.width, 90);
      assert.strictEqual(selection.height, 90);
      
      cleanupDOM();
    });
    
    it('should reject selection smaller than minimum size', function() {
      createMockDOM();
      const tool = new CropTool();
      tool.toggleCropMode();
      
      // Simulate a tiny selection
      tool.startX = 10;
      tool.startY = 10;
      tool.currentX = 15;
      tool.currentY = 15;
      tool.isDrawing = true;
      tool.cropModeActive = true;
      
      const mockEvent = {};
      tool.endSelection(mockEvent);
      
      assert.strictEqual(tool.selections.length, 0);
      
      cleanupDOM();
    });
    
    it('should handle negative selection (drag up/left)', function() {
      createMockDOM();
      const tool = new CropTool();
      tool.toggleCropMode();
      
      // Simulate dragging from bottom-right to top-left
      tool.startX = 100;
      tool.startY = 100;
      tool.currentX = 10;
      tool.currentY = 10;
      tool.isDrawing = true;
      tool.cropModeActive = true;
      
      const mockEvent = {};
      tool.endSelection(mockEvent);
      
      assert.strictEqual(tool.selections.length, 1);
      const selection = tool.selections[0];
      assert.strictEqual(selection.x, 10);
      assert.strictEqual(selection.y, 10);
      assert.strictEqual(selection.width, 90);
      assert.strictEqual(selection.height, 90);
      
      cleanupDOM();
    });
  });
  
  describe('OCR Text Extraction', function() {
    
    it('should set OCR results', function() {
      createMockDOM();
      const tool = new CropTool();
      
      const mockResults = {
        data: {
          words: [
            {text: 'Hello', bbox: {x0: 10, y0: 10, x1: 50, y1: 30}},
            {text: 'World', bbox: {x0: 60, y0: 10, x1: 100, y1: 30}}
          ]
        }
      };
      
      tool.setOCRResults(mockResults);
      assert.strictEqual(tool.ocrResults, mockResults);
      
      cleanupDOM();
    });
    
    it('should extract text from region using words', function() {
      createMockDOM();
      const tool = new CropTool();
      
      const mockResults = {
        data: {
          words: [
            {text: 'Hello', bbox: {x0: 10, y0: 10, x1: 50, y1: 30}},
            {text: 'World', bbox: {x0: 60, y0: 10, x1: 100, y1: 30}},
            {text: 'Outside', bbox: {x0: 200, y0: 200, x1: 250, y1: 220}}
          ]
        }
      };
      
      tool.setOCRResults(mockResults);
      
      const selection = {x: 0, y: 0, width: 150, height: 50};
      const text = tool.getTextFromRegion(selection);
      
      assert(text.includes('Hello'));
      assert(text.includes('World'));
      assert(!text.includes('Outside'));
      
      cleanupDOM();
    });
    
    it('should extract text from region using lines', function() {
      createMockDOM();
      const tool = new CropTool();
      
      const mockResults = {
        data: {
          lines: [
            {text: 'Hello World', bbox: {x0: 10, y0: 10, x1: 100, y1: 30}},
            {text: 'Outside', bbox: {x0: 200, y0: 200, x1: 250, y1: 220}}
          ]
        }
      };
      
      tool.setOCRResults(mockResults);
      
      const selection = {x: 0, y: 0, width: 150, height: 50};
      const text = tool.getTextFromRegion(selection);
      
      assert.strictEqual(text, 'Hello World');
      
      cleanupDOM();
    });
    
    it('should return null when no OCR results available', function() {
      createMockDOM();
      const tool = new CropTool();
      
      const selection = {x: 0, y: 0, width: 100, height: 100};
      const text = tool.getTextFromRegion(selection);
      
      assert.strictEqual(text, null);
      
      cleanupDOM();
    });
    
    it('should detect point in region correctly', function() {
      createMockDOM();
      const tool = new CropTool();
      
      const selection = {x: 10, y: 10, width: 100, height: 100};
      
      // Point in region
      const bbox1 = {x0: 30, y0: 30, x1: 50, y1: 50};
      assert(tool.isPointInRegion(bbox1, selection));
      
      // Point outside region
      const bbox2 = {x0: 200, y0: 200, x1: 250, y1: 250};
      assert(!tool.isPointInRegion(bbox2, selection));
      
      // Point on edge
      const bbox3 = {x0: 10, y0: 10, x1: 30, y1: 30};
      assert(tool.isPointInRegion(bbox3, selection));
      
      cleanupDOM();
    });
    
    it('should detect line in region correctly', function() {
      createMockDOM();
      const tool = new CropTool();
      
      const selection = {x: 10, y: 10, width: 100, height: 100};
      
      // Line in region
      const bbox1 = {x0: 20, y0: 20, x1: 80, y1: 40};
      assert(tool.isLineInRegion(bbox1, selection));
      
      // Line outside region
      const bbox2 = {x0: 200, y0: 200, x1: 250, y1: 220};
      assert(!tool.isLineInRegion(bbox2, selection));
      
      // Line partially in region
      const bbox3 = {x0: 50, y0: 50, x1: 150, y1: 70};
      assert(tool.isLineInRegion(bbox3, selection));
      
      cleanupDOM();
    });
  });
  
  describe('Selection Management', function() {
    
    it('should clear all selections', function() {
      createMockDOM();
      const tool = new CropTool();
      
      tool.selections = [
        {x: 10, y: 10, width: 50, height: 50},
        {x: 100, y: 100, width: 50, height: 50}
      ];
      tool.currentSelection = tool.selections[0];
      
      tool.clearSelections();
      
      assert.deepStrictEqual(tool.selections, []);
      assert.strictEqual(tool.currentSelection, null);
      
      cleanupDOM();
    });
    
    it('should remove copy buttons when clearing selections', function() {
      createMockDOM();
      const tool = new CropTool();
      
      // Manually create a copy button
      const btn = document.createElement('button');
      btn.className = 'selection-copy-btn';
      document.body.appendChild(btn);
      
      assert.strictEqual(document.querySelectorAll('.selection-copy-btn').length, 1);
      
      tool.clearSelections();
      
      assert.strictEqual(document.querySelectorAll('.selection-copy-btn').length, 0);
      
      cleanupDOM();
    });
    
    it('should maintain multiple selections', function() {
      createMockDOM();
      const tool = new CropTool();
      
      const sel1 = {x: 10, y: 10, width: 50, height: 50};
      const sel2 = {x: 100, y: 100, width: 50, height: 50};
      
      tool.selections.push(sel1);
      tool.selections.push(sel2);
      
      assert.strictEqual(tool.selections.length, 2);
      assert.strictEqual(tool.selections[0], sel1);
      assert.strictEqual(tool.selections[1], sel2);
      
      cleanupDOM();
    });
  });
  
  describe('Edge Cases', function() {
    
    it('should handle missing DOM elements gracefully', function() {
      // Don't create DOM elements
      const tool = new CropTool();
      
      assert.strictEqual(tool.canvas, null);
      
      cleanupDOM();
    });
    
    it('should handle image load events', function() {
      createMockDOM();
      const tool = new CropTool();
      const img = document.getElementById('selected-image');
      
      const event = new Event('load');
      img.dispatchEvent(event);
      
      // Should not throw
      cleanupDOM();
    });
    
    it('should handle text extraction with empty results', function() {
      createMockDOM();
      const tool = new CropTool();
      
      tool.setOCRResults({data: {words: []}});
      
      const selection = {x: 0, y: 0, width: 100, height: 100};
      const text = tool.getTextFromRegion(selection);
      
      assert.strictEqual(text, '');
      
      cleanupDOM();
    });
    
    it('should cancel selection when mouse leaves canvas', function() {
      createMockDOM();
      const tool = new CropTool();
      tool.toggleCropMode();
      
      tool.isDrawing = true;
      tool.cancelSelection();
      
      assert.strictEqual(tool.isDrawing, false);
      
      cleanupDOM();
    });
  });
  
  describe('Integration', function() {
    
    it('should complete full crop workflow', function() {
      createMockDOM();
      const tool = new CropTool();
      
      // 1. Set OCR results
      const mockResults = {
        data: {
          words: [
            {text: 'Sample', bbox: {x0: 20, y0: 20, x1: 80, y1: 40}},
            {text: 'Text', bbox: {x0: 90, y0: 20, x1: 130, y1: 40}}
          ]
        }
      };
      tool.setOCRResults(mockResults);
      
      // 2. Enable crop mode
      tool.toggleCropMode();
      assert.strictEqual(tool.cropModeActive, true);
      
      // 3. Create selection
      tool.startX = 10;
      tool.startY = 10;
      tool.currentX = 150;
      tool.currentY = 50;
      tool.isDrawing = true;
      tool.endSelection({});
      
      assert.strictEqual(tool.selections.length, 1);
      
      // 4. Extract text
      const text = tool.getTextFromRegion(tool.selections[0]);
      assert(text.includes('Sample'));
      assert(text.includes('Text'));
      
      cleanupDOM();
    });
  });
});

// Run tests if in Node environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { describe, it, assert };
}
