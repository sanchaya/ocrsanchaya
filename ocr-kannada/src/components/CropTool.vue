<template>
  <div class="crop-tool-container" v-if="words.length > 0">
    <div class="crop-controls">
      <button 
        @click="toggleCropMode" 
        :class="['btn-crop', { active: cropModeActive }]"
        title="Click to enable crop mode - then drag on the image to select regions">
        {{ cropModeActive ? '✓ Crop Mode Active' : 'Crop Mode' }}
      </button>
      <button 
        @click="clearSelections"
        :class="['btn-crop-clear', { disabled: selections.length === 0 }]"
        :disabled="selections.length === 0"
        title="Clear all selections">
        Clear
      </button>
      <span v-if="selections.length > 0" class="selection-count">
        {{ selections.length }} region(s) selected
      </span>
    </div>

    <canvas 
      id="crop-canvas-vue"
      v-show="cropModeActive"
      @mousedown="startSelection"
      @mousemove="drawSelection"
      @mouseup="endSelection"
      @mouseleave="cancelSelection"
      class="crop-canvas">
    </canvas>

    <div v-for="(selection, idx) in selections" :key="selection.timestamp" class="selection-button-container">
      <button 
        @click="extractAndCopyText(idx)"
        class="btn-copy-region"
        :style="{
          top: (selection.y * imageScale) + 'px',
          left: (selection.x * imageScale) + 'px'
        }">
        Copy Region {{ idx + 1 }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

interface WordBox {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence?: number;
}

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
}

export default defineComponent({
  name: 'CropTool',
  props: {
    image: {
      type: HTMLImageElement as PropType<HTMLImageElement>,
      required: false
    },
    words: {
      type: Array as PropType<WordBox[]>,
      default: () => []
    },
    onCopyText: {
      type: Function as PropType<(text: string) => void>,
      required: true
    }
  },
  data() {
    return {
      canvas: null as HTMLCanvasElement | null,
      ctx: null as CanvasRenderingContext2D | null,
      img: null as HTMLImageElement | null,
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      selections: [] as Selection[],
      currentSelection: null as Selection | null,
      cropModeActive: false,
      imageScale: 1
    };
  },
  mounted() {
    this.initCropTool();
  },
  methods: {
    initCropTool() {
      this.canvas = document.getElementById('crop-canvas-vue') as HTMLCanvasElement;
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      
      // Set canvas size to match image
      const canvasContainer = this.canvas.parentElement;
      if (canvasContainer && this.image) {
        const rect = this.image.getBoundingClientRect();
        this.canvas.width = this.image.naturalWidth || this.image.width;
        this.canvas.height = this.image.naturalHeight || this.image.height;
        this.imageScale = rect.width / this.canvas.width;
      }
    },
    toggleCropMode() {
      this.cropModeActive = !this.cropModeActive;
      if (this.cropModeActive) {
        this.drawCanvasWithImage();
      } else {
        this.clearSelections();
      }
    },
    drawCanvasWithImage() {
      if (!this.ctx || !this.image) return;

      this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
      this.ctx.drawImage(this.image, 0, 0, this.canvas!.width, this.canvas!.height);

      // Draw existing selections
      this.selections.forEach(sel => this.drawRect(sel, 'rgba(67, 97, 238, 0.3)'));
    },
    startSelection(e: MouseEvent) {
      if (!this.cropModeActive || !this.canvas) return;

      this.isDrawing = true;
      const rect = this.canvas.getBoundingClientRect();
      this.startX = Math.round((e.clientX - rect.left) / this.imageScale);
      this.startY = Math.round((e.clientY - rect.top) / this.imageScale);
    },
    drawSelection(e: MouseEvent) {
      if (!this.isDrawing || !this.cropModeActive || !this.canvas) return;

      const rect = this.canvas.getBoundingClientRect();
      this.currentX = Math.round((e.clientX - rect.left) / this.imageScale);
      this.currentY = Math.round((e.clientY - rect.top) / this.imageScale);

      // Redraw everything
      this.drawCanvasWithImage();

      // Draw current selection (preview)
      if (this.ctx) {
        this.ctx.strokeStyle = '#4361ee';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        const w = this.currentX - this.startX;
        const h = this.currentY - this.startY;
        this.ctx.strokeRect(this.startX, this.startY, w, h);
        this.ctx.setLineDash([]);
      }
    },
    endSelection(e: MouseEvent) {
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
        this.drawCanvasWithImage();
      }
    },
    cancelSelection() {
      this.isDrawing = false;
      if (this.cropModeActive) {
        this.drawCanvasWithImage();
      }
    },
    drawRect(sel: Selection, color: string) {
      if (!this.ctx) return;
      this.ctx.fillStyle = color;
      this.ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
      this.ctx.strokeStyle = '#4361ee';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
    },
    extractAndCopyText(selectionIndex: number) {
      const selection = this.selections[selectionIndex];
      if (!selection) return;

      const extractedText = this.getTextFromRegion(selection);

      if (!extractedText) {
        alert('No OCR text found in selected region');
        return;
      }

      this.onCopyText(extractedText);
      alert('Text extracted and copied:\n\n' + extractedText.substring(0, 100) + '...');
    },
    getTextFromRegion(selection: Selection): string {
      if (this.words.length === 0) return '';

      const selectedLines: string[] = [];
      let currentLineText = '';
      let currentLineY = null;

      // Sort words by Y position then X position
      const sortedWords = [...this.words].sort((a, b) => {
        if (Math.abs(a.y0 - b.y0) > 5) return a.y0 - b.y0;
        return a.x0 - b.x0;
      });

      sortedWords.forEach(word => {
        if (this.isWordInRegion(word, selection)) {
          if (currentLineY === null) {
            currentLineY = word.y0;
          }

          // Check if we're on a new line
          if (Math.abs(word.y0 - currentLineY) > 5) {
            if (currentLineText) selectedLines.push(currentLineText);
            currentLineText = word.text;
            currentLineY = word.y0;
          } else {
            currentLineText += ' ' + word.text;
          }
        }
      });

      if (currentLineText) selectedLines.push(currentLineText);

      return selectedLines.join('\n').trim();
    },
    isWordInRegion(word: WordBox, selection: Selection): boolean {
      const centerX = (word.x0 + word.x1) / 2;
      const centerY = (word.y0 + word.y1) / 2;

      return (
        centerX >= selection.x &&
        centerX <= selection.x + selection.width &&
        centerY >= selection.y &&
        centerY <= selection.y + selection.height
      );
    },
    clearSelections() {
      this.selections = [];
      this.currentSelection = null;
      if (this.cropModeActive) {
        this.drawCanvasWithImage();
      }
    }
  }
});
</script>

<style scoped>
.crop-tool-container {
  position: relative;
  margin-bottom: 20px;
}

.crop-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: rgba(67, 97, 238, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(67, 97, 238, 0.1);
  margin-bottom: 12px;
}

.btn-crop,
.btn-crop-clear {
  padding: 8px 16px;
  border: 1px solid #4361ee;
  border-radius: 6px;
  background: white;
  color: #4361ee;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s ease;
}

.btn-crop:hover {
  background: rgba(67, 97, 238, 0.1);
  box-shadow: 0 2px 8px rgba(67, 97, 238, 0.15);
}

.btn-crop.active {
  background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
}

.btn-crop-clear {
  border-color: #ccc;
  color: #666;
}

.btn-crop-clear:hover:not(.disabled) {
  background: #f5f5f5;
}

.btn-crop-clear.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selection-count {
  margin-left: auto;
  font-size: 13px;
  color: #4361ee;
  font-weight: 500;
}

.crop-canvas {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
  z-index: 5;
  border: 2px dashed #4361ee;
  border-radius: 4px;
}

.selection-button-container {
  position: absolute;
  z-index: 15;
}

.btn-copy-region {
  position: absolute;
  padding: 8px 12px;
  font-size: 12px;
  background: linear-gradient(135deg, #4361ee 0%, #3f37c9 100%);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(67, 97, 238, 0.3);
  transition: all 0.2s ease;
  font-weight: 500;
  white-space: nowrap;
}

.btn-copy-region:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(67, 97, 238, 0.4);
}

.btn-copy-region:active {
  transform: translateY(0);
}
</style>
