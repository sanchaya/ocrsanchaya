# Crop & Copy OCR Feature - User Guide & Documentation

## Overview

The Crop & Copy feature allows users to select specific regions of an image after OCR processing and extract only the text from those regions. This is useful for:

- Extracting text from specific areas of multi-column documents
- Copying text from particular sections of an image
- Correcting OCR results by focusing on specific regions
- Working with complex layouts where you need targeted text extraction

## Quick Start

### Static Version (HTML/JS)

1. **Upload an Image**
   - Click "Choose a file" or drag-drop an image
   - Supported formats: JPG, PNG, GIF, BMP, PDF, TIFF

2. **Run OCR Recognition**
   - Click the "Recognize" button
   - Wait for OCR to complete (10-30 seconds depending on image size)

3. **Enable Crop Mode**
   - After OCR completes, you'll see a "Crop Mode" button in the top-right of the image
   - Click "Crop Mode" to enable region selection

4. **Select Regions**
   - Click and drag on the image to create a rectangular selection
   - You'll see a dashed blue rectangle while dragging
   - Release mouse to finalize the selection

5. **Copy Text from Region**
   - A blue "Copy Selected Text" button appears near your selection
   - Click the button to extract OCR text from that region
   - Text is automatically appended to the textarea below the image

6. **Repeat or Clear**
   - Create multiple selections by repeating steps 4-5
   - Click "Clear" to remove all selections and start over
   - Click "Crop Mode" again to exit crop mode

### Vue Version (http://localhost:3000)

1. **Upload File** - Same as static version, also supports multi-page PDFs

2. **Select Languages** (Optional) - Choose OCR languages

3. **Click Recognize** - Process image/PDF

4. **Use Crop Mode** - Same as static version

5. **Text Output** - Extracted text appears in TinyMCE editor below

## Keyboard Shortcuts

| Shortcut | Action | Platform |
|----------|--------|----------|
| `Cmd+Z` | Undo last selection | macOS |
| `Ctrl+Z` | Undo last selection | Windows/Linux |
| `Cmd+Shift+Z` | Redo selection | macOS |
| `Ctrl+Shift+Z` | Redo selection | Windows/Linux |
| `Esc` | Exit crop mode | All |

## Features

### Crop Mode Controls

```
┌─────────────────────────────────────────────┐
│ [Crop Mode] [↶ Undo] [↷ Redo] [Clear]       │
│                            3 region(s) selected
└─────────────────────────────────────────────┘
```

**Crop Mode Button** - Click to enable/disable region selection
- Disabled state: Light gray, not active
- Active state: Highlighted in blue

**Undo Button** - Click to undo the last selection
- Disabled when no history available
- Keyboard: `Cmd+Z` (macOS) or `Ctrl+Z` (Windows/Linux)

**Redo Button** - Click to redo an undone selection  
- Disabled when no redo history available
- Keyboard: `Cmd+Shift+Z` (macOS) or `Ctrl+Shift+Z` (Windows/Linux)

**Clear Button** - Click to remove all selections
- Resets the selection list
- Keeps crop mode active

**Selection Counter** - Shows number of regions selected

### Selection Features

- **Minimum Size**: Selections must be at least 10x10 pixels
- **Multi-select**: Create multiple selections to extract different regions
- **Drag Direction**: Drag in any direction (left-to-right or right-to-left works)
- **Visual Feedback**: Dashed blue rectangle shows while dragging
- **Copy Buttons**: Appear automatically when selection is created

### Text Extraction

- **Line Detection**: Text is grouped by lines intelligently
- **Word Matching**: Uses OCR word bounding boxes to match text
- **Fallback**: Can work with line-level or word-level OCR data
- **Formatting**: Preserves line breaks in extracted text

### History Management

- **Undo/Redo**: Up to 20 selections in history
- **Auto-clear**: Clearing removes all selections and updates history
- **State Persistence**: Each action creates a snapshot

## Advanced Features

### Keyboard Navigation

When crop mode is active:
- Press `Esc` to exit crop mode immediately
- Use `Cmd+Z` / `Ctrl+Z` to quickly undo without reaching the button
- Use `Cmd+Shift+Z` / `Ctrl+Shift+Z` to redo

### Notification System

- When you perform actions, a notification appears in the bottom-right corner
- Shows "Undo: Removed selection" or "Redo: Restored selection"
- Disappears automatically after 2 seconds

### Multi-Language Support

Vue version supports extracting text in multiple languages:
- Kannada
- Hindi
- Sanskrit
- English
- Tamil
- Telugu

## Technical Details

### How Text Extraction Works

1. **Region Selection** - You drag to create a bounding box
2. **OCR Matching** - System finds all OCR words within that region
3. **Line Grouping** - Words are grouped into lines based on Y-coordinate
4. **Text Assembly** - Lines are joined with newlines

### Bounding Box Calculation

- **Point-in-region**: Checks if word center falls within selected rectangle
- **Tolerance**: Uses 5-pixel tolerance for line detection
- **Coordinate System**: Uses canvas coordinates (0,0 = top-left)

### History System

- **State Snapshots**: Each selection creates a deep copy of the selections array
- **Linear History**: Redo history clears if you make a new selection
- **Size Limit**: Keeps only last 20 selections in memory

## Troubleshooting

### Problem: Crop Mode button doesn't appear

**Solution**: 
- Wait for OCR to fully complete (check browser console for "Crop controls shown")
- Make sure your image uploaded successfully
- Try refreshing the page with `Cmd+Shift+R` (hard refresh)

### Problem: Text extraction returns empty result

**Solution**:
- Make sure your selection is large enough (minimum 10x10 pixels)
- Check that the selection overlaps the text you want to extract
- Verify OCR completed successfully (text should appear in output area)

### Problem: Selection appears but can't copy text

**Solution**:
- Verify crop controls are visible (they're positioned in top-right of image)
- Try a larger selection area
- Check browser console for any error messages
- Make sure OCR word data is available

### Problem: Undo/Redo buttons are grayed out

**Solution**:
- Undo is disabled when you're at the beginning of history
- Redo is disabled when you're at the latest action
- Create more selections to build up undo history
- This is normal behavior

## File Structure

### Static Version
- `index.html` - HTML interface with crop controls
- `js/crop-tool.js` - Main crop functionality (304 lines)
- `style/ocr.css` - Styling for crop controls
- `js/tesseract-ocr.js` - OCR integration

### Vue Version  
- `ocr-kannada/src/components/CropTool.vue` - Vue component
- `ocr-kannada/src/App.vue` - Main app with integration

## Code Examples

### JavaScript - Basic Usage

```javascript
// Initialize crop tool
const tool = new CropTool();

// Set OCR results
tool.setOCRResults(ocrData);

// Enable crop mode
tool.toggleCropMode();

// Extract text from selection
const text = tool.getTextFromRegion({
  x: 50,
  y: 50,
  width: 200,
  height: 100
});

// Undo/Redo
tool.undo();
tool.redo();
```

### Vue - Component Usage

```vue
<template>
  <CropTool 
    :image="currentImage"
    :words="ocrWords"
    :on-copy-text="appendToEditor"
    @notification="showNotification"
  />
</template>

<script>
import CropTool from '@/components/CropTool.vue';

export default {
  components: { CropTool },
  methods: {
    appendToEditor(text) {
      this.editorContent += text + '\n';
    },
    showNotification(message) {
      console.log(message);
    }
  }
};
</script>
```

## Performance Notes

- **Canvas rendering**: Optimized for real-time drawing
- **History storage**: Limited to 20 selections to prevent memory issues  
- **Text extraction**: O(n) complexity where n = number of words
- **Supports**: Images up to 4000x4000 pixels

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (macOS & iOS)
- **Mobile**: Touch events not yet supported (desktop only)

## Known Limitations

1. **Mobile**: Touch selection not yet implemented
2. **Large PDFs**: Multi-page extraction limited to current page
3. **Complex Text**: Rotated or angled text may not extract correctly
4. **Performance**: Very large images (>5000px) may be slower

## Future Enhancements

- [ ] Touch/mobile support for region selection
- [ ] Freehand drawing mode instead of rectangles
- [ ] Copy multiple regions at once
- [ ] Adjust selection after creation
- [ ] Delete individual selections
- [ ] Export selections as separate images
- [ ] OCR confidence indicator
- [ ] Text quality metrics

## Support & Feedback

For issues, feature requests, or feedback:
- Open an issue on [GitHub](https://github.com/sanchaya/ocrsanchaya)
- Include browser/OS information
- Attach screenshot if possible
- Describe steps to reproduce

## License

This feature is part of the Sanchaya OCR project. See LICENSE file for details.

---

**Version**: 1.0.0  
**Last Updated**: May 21, 2026  
**Tested On**: Chrome 131+, Firefox 128+, Safari 17+
