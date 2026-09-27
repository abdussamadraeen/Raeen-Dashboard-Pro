/**
 * 100% Client-Side In-Browser PDF Tools & Generator
 * Fast, zero telemetry, local PDF inspection & Image-to-PDF generator.
 */

let currentPdfFile = null;
let currentPdfBuffer = null;

export function initPdfTools() {
    const card = document.getElementById('card-pdf-tools');
    if (!card) return;

    const dropzone = document.getElementById('pdf-dropzone');
    const fileInput = document.getElementById('pdf-file-input');
    const openBtn = document.getElementById('pdf-open-btn');
    const extractTextBtn = document.getElementById('pdf-extract-text-btn');
    const resetBtn = document.getElementById('pdf-reset-btn');
    const imgToPdfInput = document.getElementById('pdf-img-to-pdf-input');
    const imgToPdfBtn = document.getElementById('pdf-img-to-pdf-btn');

    if (!dropzone || !fileInput) return;

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
        if (files && files[0] && (files[0].type === 'application/pdf' || files[0].name.toLowerCase().endsWith('.pdf'))) {
            loadPdf(files[0]);
        }
    });

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            loadPdf(file);
        }
    });

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (!currentPdfFile) return;
            const url = URL.createObjectURL(currentPdfFile);
            window.open(url, '_blank');
        });
    }

    if (extractTextBtn) {
        extractTextBtn.addEventListener('click', extractPdfText);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetPdfTools);
    }

    if (imgToPdfBtn && imgToPdfInput) {
        imgToPdfBtn.addEventListener('click', () => imgToPdfInput.click());
        imgToPdfInput.addEventListener('change', handleImagesToPdf);
    }
}

function loadPdf(file) {
    currentPdfFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        currentPdfBuffer = e.target.result;
        inspectPdf(currentPdfBuffer, file);
    };
    reader.readAsArrayBuffer(file);
}

function inspectPdf(buffer, file) {
    const dropzone = document.getElementById('pdf-dropzone');
    const details = document.getElementById('pdf-details');
    const nameEl = document.getElementById('pdf-name-val');
    const sizeEl = document.getElementById('pdf-size-val');
    const pagesEl = document.getElementById('pdf-pages-val');
    const versionEl = document.getElementById('pdf-version-val');

    if (dropzone) dropzone.classList.add('hidden');
    if (details) details.classList.remove('hidden');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatBytes(file.size);

    // Fast header parse for PDF version
    const uint8 = new Uint8Array(buffer.slice(0, 1024));
    const headerStr = new TextDecoder('latin1').decode(uint8);
    const verMatch = headerStr.match(/%PDF-([0-9.]+)/);
    if (versionEl) versionEl.textContent = verMatch ? `PDF ${verMatch[1]}` : 'PDF 1.4';

    // Page count estimation via /Type /Page scanning
    const fullText = new TextDecoder('latin1').decode(new Uint8Array(buffer));
    const pageMatches = fullText.match(/\/Type\s*\/Page[^s]/g);
    const count = pageMatches ? pageMatches.length : 1;
    if (pagesEl) pagesEl.textContent = `${count} ${count === 1 ? 'page' : 'pages'}`;
}

function extractPdfText() {
    if (!currentPdfBuffer) return;
    const textBox = document.getElementById('pdf-extracted-text');
    if (!textBox) return;

    const fullText = new TextDecoder('latin1').decode(new Uint8Array(currentPdfBuffer));
    // Extract text in PDF parentheses (string literals inside BT / ET blocks or standalone)
    const textSnippets = [];
    const regex = /\((.*?)\)\s*T[jJ]/g;
    let match;
    while ((match = regex.exec(fullText)) !== null) {
        if (match[1] && match[1].trim().length > 1) {
            textSnippets.push(match[1].replace(/\\([()\\])/g, '$1'));
        }
    }

    if (textSnippets.length > 0) {
        textBox.value = textSnippets.slice(0, 500).join(' ');
        textBox.classList.remove('hidden');
    } else {
        textBox.value = "Note: This PDF is either scanned, encrypted, or uses compressed object streams. Click 'Open in Tab' to view in browser viewer.";
        textBox.classList.remove('hidden');
    }
}

function resetPdfTools() {
    currentPdfFile = null;
    currentPdfBuffer = null;

    const fileInput = document.getElementById('pdf-file-input');
    if (fileInput) fileInput.value = '';

    const dropzone = document.getElementById('pdf-dropzone');
    const details = document.getElementById('pdf-details');
    const textBox = document.getElementById('pdf-extracted-text');

    if (dropzone) dropzone.classList.remove('hidden');
    if (details) details.classList.add('hidden');
    if (textBox) {
        textBox.value = '';
        textBox.classList.add('hidden');
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Creates a clean standard PDF 1.4 from an array of selected images
 */
async function handleImagesToPdf(e) {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const statusEl = document.getElementById('pdf-img-status');
    if (statusEl) {
        statusEl.textContent = `Converting ${files.length} images to PDF...`;
        statusEl.classList.remove('hidden');
    }

    try {
        const imagesData = await Promise.all(files.map(file => {
            return new Promise((resolve) => {
                const img = new Image();
                const reader = new FileReader();
                reader.onload = () => {
                    img.onload = () => {
                        // Normalize to JPEG for standard PDF embedding
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        resolve({
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                            dataUrl: jpegDataUrl
                        });
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
        }));

        // Assemble minimal valid standard PDF
        const pdfBlob = createSimplePdf(imagesData);
        const downloadUrl = URL.createObjectURL(pdfBlob);

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `raeen_images_document.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (statusEl) {
            statusEl.textContent = `✓ Downloaded ${files.length}-page PDF successfully!`;
            setTimeout(() => statusEl.classList.add('hidden'), 4000);
        }
    } catch (err) {
        console.error('Image to PDF conversion error:', err);
        if (statusEl) statusEl.textContent = 'Error generating PDF from images.';
    }
}

function createSimplePdf(pages) {
    // Standard PDF 1.4 binary assembler with accurate byte offsets
    const encoder = new TextEncoder();
    const chunks = [];
    let currentOffset = 0;

    function append(data) {
        const bytes = typeof data === 'string' ? encoder.encode(data) : data;
        chunks.push(bytes);
        currentOffset += bytes.length;
    }

    append('%PDF-1.4\n');

    const totalObjects = 2 + pages.length * 3;
    const offsets = new Array(totalObjects + 1).fill(0);

    const recordObject = (num) => {
        offsets[num] = currentOffset;
        append(`${num} 0 obj\n`);
    };

    // 1. Catalog Object (1 0 obj)
    recordObject(1);
    append(`<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

    // 2. Pages Root Object (2 0 obj)
    const pageObjNums = pages.map((_, i) => 3 + i * 3);
    recordObject(2);
    append(`<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);

    // Build pages, content streams, and images
    pages.forEach((page, i) => {
        const pageNum = 3 + i * 3;
        const contentNum = 4 + i * 3;
        const imageNum = 5 + i * 3;

        const base64Data = (page.dataUrl || '').split(',')[1] || '';
        const binaryStr = atob(base64Data);
        const imgBytes = new Uint8Array(binaryStr.length);
        for (let j = 0; j < binaryStr.length; j++) {
            imgBytes[j] = binaryStr.charCodeAt(j);
        }

        // Page Object
        recordObject(pageNum);
        append(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Contents ${contentNum} 0 R /Resources << /XObject << /Im${i} ${imageNum} 0 R >> >> >>\nendobj\n`);

        // Content Stream
        const streamText = `q ${page.width} 0 0 ${page.height} 0 0 cm /Im${i} Do Q\n`;
        const streamBytes = encoder.encode(streamText);
        recordObject(contentNum);
        append(`<< /Length ${streamBytes.length} >>\nstream\n`);
        append(streamBytes);
        append(`\nendstream\nendobj\n`);

        // Image XObject (JPEG DCTDecode)
        recordObject(imageNum);
        append(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);
        append(imgBytes);
        append(`\nendstream\nendobj\n`);
    });

    // Cross-Reference Table (xref)
    const startXref = currentOffset;
    append(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= totalObjects; i++) {
        const offStr = String(offsets[i]).padStart(10, '0');
        append(`${offStr} 00000 n \n`);
    }

    // Trailer
    append(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

    return new Blob(chunks, { type: 'application/pdf' });
}
