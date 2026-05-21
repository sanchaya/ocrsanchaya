#!/usr/bin/env node
/**
 * Standalone Test Runner for CropTool
 * Runs tests without external dependencies
 */

// Simple assertion library
const assert = {
  strictEqual: function(actual, expected) {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}`);
    }
  },
  deepStrictEqual: function(actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  ok: function(value) {
    if (!value) {
      throw new Error('Assertion failed');
    }
  }
};

// Simple mock document and window
const mockDocument = {
  body: { innerHTML: '', appendChild: function() {} },
  createElement: function(tag) {
    return {
      id: '',
      className: '',
      textContent: '',
      style: {},
      addEventListener: function() {},
      onclick: null,
      hasAttribute: function() { return false; },
      dispatchEvent: function() {},
      getBoundingClientRect: function() { return {top: 0, left: 0, width: 100, height: 100}; },
      tagName: tag
    };
  },
  getElementById: function(id) {
    return this.createElement('div');
  },
  querySelector: function() { return this.createElement('div'); },
  querySelectorAll: function() { return []; },
  addEventListener: function() {}
};

const mockCanvas = {
  id: 'crop-canvas',
  getContext: function() {
    return {
      drawImage: function() {},
      clearRect: function() {},
      fillRect: function() {},
      strokeRect: function() {},
      setLineDash: function() {},
      stroke: function() {},
      fill: function() {}
    };
  },
  addEventListener: function() {},
  getBoundingClientRect: function() { return {top: 0, left: 0, width: 100, height: 100}; },
  style: {}
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let currentSuite = '';
let testResults = [];

function describe(suiteName, callback) {
  currentSuite = suiteName;
  console.log(`\n📋 ${suiteName}`);
  callback();
}

function it(testName, callback) {
  totalTests++;
  try {
    callback();
    passedTests++;
    testResults.push({ suite: currentSuite, name: testName, status: 'PASS' });
    console.log(`  ✅ ${testName}`);
  } catch (error) {
    failedTests++;
    testResults.push({ suite: currentSuite, name: testName, status: 'FAIL', error: error.message });
    console.log(`  ❌ ${testName}`);
    console.log(`     Error: ${error.message}`);
  }
}

// Mock CropTool for testing
class CropTool {
  constructor() {
    this.canvas = mockCanvas;
    this.ctx = this.canvas.getContext('2d');
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
  }

  toggleCropMode() {
    this.cropModeActive = !this.cropModeActive;
  }

  startSelection(e) {
    if (!this.cropModeActive) return;
    this.isDrawing = true;
  }

  endSelection(e) {
    if (!this.isDrawing || !this.cropModeActive) return;
    this.isDrawing = false;
    
    const w = this.currentX - this.startX;
    const h = this.currentY - this.startY;
    
    if (Math.abs(w) > 10 && Math.abs(h) > 10) {
      this.currentSelection = {
        x: Math.min(this.startX, this.currentX),
        y: Math.min(this.startY, this.currentY),
        width: Math.abs(w),
        height: Math.abs(h),
        timestamp: Date.now()
      };
      this.selections.push(this.currentSelection);
    }
  }

  cancelSelection() {
    this.isDrawing = false;
  }

  clearSelections() {
    this.selections = [];
    this.currentSelection = null;
  }

  setOCRResults(results) {
    this.ocrResults = results;
  }

  getTextFromRegion(selection) {
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
      let currentLineText = '';
      let currentLineY = null;
      
      this.ocrResults.data.words.forEach(word => {
        if (this.isPointInRegion(word.bbox, selection)) {
          if (currentLineY === null) {
            currentLineY = word.bbox.y0;
          }
          
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
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('CropTool - Initialization', () => {
  it('should initialize with correct default values', () => {
    const tool = new CropTool();
    
    assert.strictEqual(tool.cropModeActive, false);
    assert.strictEqual(tool.isDrawing, false);
    assert.deepStrictEqual(tool.selections, []);
    assert.strictEqual(tool.currentSelection, null);
    assert.strictEqual(tool.ocrResults, null);
    assert.strictEqual(tool.imageScale, 1);
  });
});

describe('CropTool - Crop Mode Toggle', () => {
  it('should toggle crop mode on/off', () => {
    const tool = new CropTool();
    
    assert.strictEqual(tool.cropModeActive, false);
    
    tool.toggleCropMode();
    assert.strictEqual(tool.cropModeActive, true);
    
    tool.toggleCropMode();
    assert.strictEqual(tool.cropModeActive, false);
  });
});

describe('CropTool - Selection Drawing', () => {
  it('should create valid selection with minimum size', () => {
    const tool = new CropTool();
    tool.toggleCropMode();
    
    tool.startX = 10;
    tool.startY = 10;
    tool.currentX = 100;
    tool.currentY = 100;
    tool.isDrawing = true;
    
    tool.endSelection({});
    
    assert.strictEqual(tool.selections.length, 1);
    const selection = tool.selections[0];
    assert.strictEqual(selection.x, 10);
    assert.strictEqual(selection.y, 10);
    assert.strictEqual(selection.width, 90);
    assert.strictEqual(selection.height, 90);
  });

  it('should reject selection smaller than minimum size', () => {
    const tool = new CropTool();
    tool.toggleCropMode();
    
    tool.startX = 10;
    tool.startY = 10;
    tool.currentX = 15;
    tool.currentY = 15;
    tool.isDrawing = true;
    
    tool.endSelection({});
    
    assert.strictEqual(tool.selections.length, 0);
  });

  it('should handle negative selection (drag up/left)', () => {
    const tool = new CropTool();
    tool.toggleCropMode();
    
    tool.startX = 100;
    tool.startY = 100;
    tool.currentX = 10;
    tool.currentY = 10;
    tool.isDrawing = true;
    
    tool.endSelection({});
    
    assert.strictEqual(tool.selections.length, 1);
    const selection = tool.selections[0];
    assert.strictEqual(selection.x, 10);
    assert.strictEqual(selection.y, 10);
    assert.strictEqual(selection.width, 90);
    assert.strictEqual(selection.height, 90);
  });
});

describe('CropTool - OCR Text Extraction', () => {
  it('should set OCR results', () => {
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
  });

  it('should extract text from region using words', () => {
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
    
    assert.ok(text.includes('Hello'));
    assert.ok(text.includes('World'));
  });

  it('should extract text from region using lines', () => {
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
  });

  it('should return null when no OCR results available', () => {
    const tool = new CropTool();
    
    const selection = {x: 0, y: 0, width: 100, height: 100};
    const text = tool.getTextFromRegion(selection);
    
    assert.strictEqual(text, null);
  });

  it('should detect point in region correctly', () => {
    const tool = new CropTool();
    
    const selection = {x: 10, y: 10, width: 100, height: 100};
    
    // Point in region
    const bbox1 = {x0: 30, y0: 30, x1: 50, y1: 50};
    assert.ok(tool.isPointInRegion(bbox1, selection));
    
    // Point outside region
    const bbox2 = {x0: 200, y0: 200, x1: 250, y1: 250};
    const result = tool.isPointInRegion(bbox2, selection);
    if (result === true) {
      throw new Error('Point should not be in region');
    }
  });

  it('should detect line in region correctly', () => {
    const tool = new CropTool();
    
    const selection = {x: 10, y: 10, width: 100, height: 100};
    
    // Line in region
    const bbox1 = {x0: 20, y0: 20, x1: 80, y1: 40};
    assert.ok(tool.isLineInRegion(bbox1, selection));
    
    // Line outside region
    const bbox2 = {x0: 200, y0: 200, x1: 250, y1: 220};
    const result = tool.isLineInRegion(bbox2, selection);
    if (result === true) {
      throw new Error('Line should not be in region');
    }
  });
});

describe('CropTool - Selection Management', () => {
  it('should clear all selections', () => {
    const tool = new CropTool();
    
    tool.selections = [
      {x: 10, y: 10, width: 50, height: 50},
      {x: 100, y: 100, width: 50, height: 50}
    ];
    tool.currentSelection = tool.selections[0];
    
    tool.clearSelections();
    
    assert.deepStrictEqual(tool.selections, []);
    assert.strictEqual(tool.currentSelection, null);
  });

  it('should maintain multiple selections', () => {
    const tool = new CropTool();
    
    const sel1 = {x: 10, y: 10, width: 50, height: 50};
    const sel2 = {x: 100, y: 100, width: 50, height: 50};
    
    tool.selections.push(sel1);
    tool.selections.push(sel2);
    
    assert.strictEqual(tool.selections.length, 2);
    assert.strictEqual(tool.selections[0], sel1);
    assert.strictEqual(tool.selections[1], sel2);
  });
});

describe('CropTool - Edge Cases', () => {
  it('should handle text extraction with empty results', () => {
    const tool = new CropTool();
    
    tool.setOCRResults({data: {words: []}});
    
    const selection = {x: 0, y: 0, width: 100, height: 100};
    const text = tool.getTextFromRegion(selection);
    
    assert.strictEqual(text, '');
  });

  it('should cancel selection when needed', () => {
    const tool = new CropTool();
    tool.toggleCropMode();
    
    tool.isDrawing = true;
    tool.cancelSelection();
    
    assert.strictEqual(tool.isDrawing, false);
  });
});

describe('CropTool - Integration', () => {
  it('should complete full crop workflow', () => {
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
    assert.ok(text.includes('Sample'));
    assert.ok(text.includes('Text'));
  });
});

// ============================================================================
// PRINT RESULTS
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests:   ${totalTests}`);
console.log(`✅ Passed:     ${passedTests}`);
console.log(`❌ Failed:     ${failedTests}`);
console.log(`Success Rate:  ${((passedTests / totalTests) * 100).toFixed(2)}%`);
console.log('='.repeat(80));

if (failedTests > 0) {
  console.log('\n❌ FAILED TESTS:');
  testResults.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  [${r.suite}] ${r.name}`);
    console.log(`    Error: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED! 🎉');
  process.exit(0);
}
