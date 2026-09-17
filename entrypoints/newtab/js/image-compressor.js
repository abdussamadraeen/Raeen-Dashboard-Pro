/**
 * 100% Client-Side In-Browser Image Compressor & Converter
 * Zero server dependencies, private, ultra-fast canvas processing.
 */

let currentImageFile = null;
let originalDataUrl = null;
let compressedBlob = null;
let compressedUrl = null;

export function initImageCompressor() {
    const card = document.getElementById('card-image-compressor');
    if (!card) return;

    const fileInput = document.getElementById('img-comp-input');
    const dropzone = document.getElementById('img-comp-dropzone');
    const qualitySlider = document.getElementById('img-comp-quality');
    const qualityVal = document.getElementById('img-comp-quality-val');
    const formatSelect = document.getElementById('img-comp-format');
    const resizeSelect = document.getElementById('img-comp-resize');
    const downloadBtn = document.getElementById('img-comp-download-btn');
    const resetBtn = document.getElementById('img-comp-reset-btn');

    if (!fileInput || !dropzone) return;

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-active');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-active');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files && files[0] && files[0].type.startsWith('image/')) {
            loadImage(files[0]);
        }
    });

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        }
    });

    if (qualitySlider && qualityVal) {
        qualitySlider.addEventListener('input', () => {
            qualityVal.textContent = `${qualitySlider.value}%`;
            processCompression();
        });
    }

    if (formatSelect) {
        formatSelect.addEventListener('change', processCompression);
    }

    if (resizeSelect) {
        resizeSelect.addEventListener('change', processCompression);
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!compressedBlob) return;
            const ext = getTargetExtension();
            const originalBase = (currentImageFile?.name || 'compressed_image').replace(/\.[^/.]+$/, '');
            const downloadName = `${originalBase}_compressed.${ext}`;

            const a = document.createElement('a');
            a.href = compressedUrl;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetCompressor);
    }
}

function loadImage(file) {
    currentImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        originalDataUrl = e.target.result;
        showControls();
        processCompression();
    };
    reader.readAsDataURL(file);
}

function showControls() {
    const dropzone = document.getElementById('img-comp-dropzone');
    const controls = document.getElementById('img-comp-controls');
    const previewArea = document.getElementById('img-comp-preview-area');
    if (dropzone) dropzone.classList.add('hidden');
    if (controls) controls.classList.remove('hidden');
    if (previewArea) previewArea.classList.remove('hidden');
}

function resetCompressor() {
    if (compressedUrl) {
        URL.revokeObjectURL(compressedUrl);
        compressedUrl = null;
    }
    currentImageFile = null;
    originalDataUrl = null;
    compressedBlob = null;

    const fileInput = document.getElementById('img-comp-input');
    if (fileInput) fileInput.value = '';

    const dropzone = document.getElementById('img-comp-dropzone');
    const controls = document.getElementById('img-comp-controls');
    const previewArea = document.getElementById('img-comp-preview-area');
    if (dropzone) dropzone.classList.remove('hidden');
    if (controls) controls.classList.add('hidden');
    if (previewArea) previewArea.classList.add('hidden');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getTargetExtension() {
    const formatSelect = document.getElementById('img-comp-format');
    const val = formatSelect ? formatSelect.value : 'webp';
    if (val === 'image/jpeg') return 'jpg';
    if (val === 'image/png') return 'png';
    return 'webp';
}

function processCompression() {
    if (!originalDataUrl || !currentImageFile) return;

    const qualitySlider = document.getElementById('img-comp-quality');
    const formatSelect = document.getElementById('img-comp-format');
    const resizeSelect = document.getElementById('img-comp-resize');
    const previewThumb = document.getElementById('img-comp-thumb');
    const origSizeEl = document.getElementById('img-comp-orig-size');
    const compSizeEl = document.getElementById('img-comp-comp-size');
    const savingsEl = document.getElementById('img-comp-savings');

    const quality = qualitySlider ? parseInt(qualitySlider.value, 10) / 100 : 0.8;
    const mimeType = formatSelect ? formatSelect.value : 'image/webp';
    const resizeVal = resizeSelect ? resizeSelect.value : 'original';

    const img = new Image();
    img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (resizeVal !== 'original') {
            const maxDim = parseInt(resizeVal, 10);
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
            if (!blob) return;

            if (compressedUrl) {
                URL.revokeObjectURL(compressedUrl);
            }
            compressedBlob = blob;
            compressedUrl = URL.createObjectURL(blob);

            if (previewThumb) {
                previewThumb.src = compressedUrl;
            }

            const origBytes = currentImageFile.size;
            const compBytes = blob.size;

            if (origSizeEl) origSizeEl.textContent = `${formatBytes(origBytes)} (${img.naturalWidth}×${img.naturalHeight})`;
            if (compSizeEl) compSizeEl.textContent = `${formatBytes(compBytes)} (${width}×${height})`;

            if (savingsEl) {
                const diff = origBytes - compBytes;
                const percent = Math.round((diff / origBytes) * 100);
                if (percent > 0) {
                    savingsEl.textContent = `-${percent}% Saved`;
                    savingsEl.className = 'img-comp-savings-badge badge-green';
                } else {
                    savingsEl.textContent = `+${Math.abs(percent)}% (No savings)`;
                    savingsEl.className = 'img-comp-savings-badge badge-gray';
                }
            }
        }, mimeType, quality);
    };
    img.src = originalDataUrl;
}
