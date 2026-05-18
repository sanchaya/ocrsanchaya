<template>
  <div
    class="drop"
    :class="{ isDragging: isDragging }"
    @dragover.prevent="dragOver"
    @dragleave.prevent="dragLeave"
    @drop.prevent="drop($event)"
  >
    <div class="page-nav" v-if="totalPages > 1">
      <button @click="prevPage" :disabled="currentPage <= 1">← Prev</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage >= totalPages">Next →</button>
    </div>
    <img :src="imageSource" v-if="imageSource" id="ocr-img" />
    <div v-if="wrongFile" class="message error">Wrong file type</div>
    <div v-if="!imageSource && !isDragging && !wrongFile" class="message">
      Drop, paste or upload an image or PDF
    </div>
    <div v-if="isProcessing" class="processing">
      <div class="spinner"></div>
      Processing PDF... {{ processingProgress }}
    </div>
    <input
      type="file"
      id="uploadimage"
      accept="image/*,.pdf"
      @change="requestUploadFile"
    />
    <label for="uploadimage" class="upload-label" v-if="!imageSource">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="17" viewBox="0 0 20 17">
        <path d="M10 0l-5.2 4.9h3.3v5.1h3.8v-5.1h3.3l-5.2-4.9zm9.3 11.5l-3.2-2.1h-2l3.4 2.6h-3.5c-.1 0-.2.1-.2.1l-.8 2.3h-6l-.8-2.2c-.1-.1-.1-.2-.2-.2h-3.6l3.4-2.6h-2l-3.2 2.1c-.4.3-.7 1-.6 1.5l.6 3.1c.1.5.7.9 1.2.9h16.3c.6 0 1.1-.4 1.3-.9l.6-3.1c.1-.5-.2-1.2-.7-1.5z"/>
      </svg>
      <span>Choose file</span>
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, toRefs } from "vue";

const loadPdfJs = () => {
  return new Promise<any>((resolve) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve((window as any).pdfjsLib);
    };
    document.head.appendChild(script);
  });
};

export default defineComponent({
  name: "ImageLoader",
  emits: ["pdf-loaded", "page-ready", "file-loaded", "page-changed"],
  setup(props, { emit }) {
    const state = reactive({
      isDragging: false,
      wrongFile: false,
      imageSource: null as string | null,
      isProcessing: false,
      totalPages: 0,
      currentPage: 1,
      processingProgress: "",
      pageImages: [] as string[],
    });
    const isDragging = computed(() => state.isDragging);

    const renderPage = async (pdf: any, pageNum: number): Promise<string> => {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context!, viewport }).promise;
      return canvas.toDataURL("image/png");
    };

    const processPDF = async (file: File) => {
      state.isProcessing = true;
      state.processingProgress = "Loading PDF...";
      try {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        state.totalPages = pdf.numPages;
        state.pageImages = [];
        state.currentPage = 1;

        for (let i = 1; i <= state.totalPages; i++) {
          state.processingProgress = `Rendering page ${i} of ${state.totalPages}...`;
          const imgData = await renderPage(pdf, i);
          state.pageImages.push(imgData);
          emit("page-ready", { pageNum: i, totalPages: state.totalPages });
        }

        state.imageSource = state.pageImages[0];
        emit("pdf-loaded", { totalPages: state.totalPages, pageImages: state.pageImages });
      } catch (e) {
        console.error("PDF processing error:", e);
        state.wrongFile = true;
      }
      state.isProcessing = false;
    };

    const prevPage = () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        state.imageSource = state.pageImages[state.currentPage - 1];
        emit("page-changed", state.currentPage);
      }
    };

    const nextPage = () => {
      if (state.currentPage < state.totalPages) {
        state.currentPage++;
        state.imageSource = state.pageImages[state.currentPage - 1];
        emit("page-changed", state.currentPage);
      }
    };

    const requestUploadFile = () => {
      const src = document.querySelector("#uploadimage") as HTMLInputElement;
      if (src && src.files && src.files.length > 0) {
        const file = src.files[0];
        emit("file-loaded", file);
        if (file.type === "application/pdf") {
          processPDF(file);
        } else if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (f) => {
            state.imageSource = f.target?.result as string;
            state.wrongFile = false;
            state.totalPages = 0;
            state.pageImages = [];
          };
          reader.readAsDataURL(file);
        } else {
          state.wrongFile = true;
        }
      }
    };
    const dragOver = () => {
      state.isDragging = true;
    };
    const dragLeave = () => {
      state.isDragging = false;
    };
    const drop = (e: any) => {
      const files: FileList | null | undefined = e.dataTransfer?.files;
      state.wrongFile = false;
      if (files?.length === 1) {
        let file: File = files[0];
        emit("file-loaded", file);
        if (file.type === "application/pdf") {
          processPDF(file);
        } else if (file.type.indexOf("image/") >= 0) {
          var reader = new FileReader();
          reader.onload = (f) => {
            state.imageSource = f.target?.result as string;
            state.isDragging = false;
            state.totalPages = 0;
            state.pageImages = [];
          };
          reader.readAsDataURL(file);
        } else {
          state.wrongFile = true;
          state.isDragging = false;
        }
      }
    };

    document.onpaste = (event) => {
        var items = event.clipboardData?.items;
        for (let index in items) {
            var item = items[index];
            if (item.kind === 'file') {
                const blob = item.getAsFile();
                if (blob) {
                  emit("file-loaded", blob);
                  if (blob.type === "application/pdf") {
                    processPDF(blob);
                  } else if (blob.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (pasteEvent) => {
                        state.imageSource = pasteEvent.target?.result as string;
                    };
                    reader.readAsDataURL(blob);
                  }
                }
            }
        }
    };

    return {
      isDragging,
      ...toRefs(state),
      prevPage,
      nextPage,
      dragOver,
      dragLeave,
      drop,
      requestUploadFile
    };
  },
});
</script>

<style>
.drop {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background-color: var(--text-background, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-family: sans-serif;
  padding: 20px;
  flex-direction: column;
  position: relative;
}

.drop.isDragging {
  background-color: rgba(67, 97, 238, 0.1);
  border: 2px dashed var(--text-color3, #4361ee);
}

.drop img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.message {
  color: var(--span-color, #4a4a68);
  font-size: 16px;
  text-align: center;
}

.message.error {
  color: #dc3545;
}

.processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
  font-size: 16px;
  color: var(--span-color, #4a4a68);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color, #e0e0e0);
  border-top-color: var(--text-color3, #4361ee);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.page-nav {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 20px;
  background: var(--third-color, #fff);
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-nav button {
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid var(--border-color, #e0e0e0);
  background: var(--third-color, #fff);
  color: var(--text-color1, #1a1a2e);
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.page-nav button:hover:not(:disabled) {
  background: var(--text-color3, #4361ee);
  color: white;
  border-color: var(--text-color3, #4361ee);
}

.page-nav button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-nav span {
  font-size: 14px;
  color: var(--span-color, #4a4a68);
  font-weight: 500;
}

#uploadimage {
  display: none;
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--primary-gradient, linear-gradient(135deg, #4361ee 0%, #3f37c9 100%));
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 16px;
  transition: all 0.2s ease;
}

.upload-label:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(67, 97, 238, 0.3);
}

.upload-label svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
</style>
