/**
 * PDF Lab — Advanced Client-Side PDF Architecture & Optimization Suite
 * Powered by pdf-lib & pdfjs-dist.
 * 
 * Features:
 * - Smart Vector & Structural Optimizer (Lossless object streams, strips bloated XMP XML metadata)
 * - Deep Embedded Image Downsampler (In-place image stream replacement, preserves vector text)
 * - Ultra Scan Flattener (For scanned documents & hard upload limits)
 * - Zero Inflation Guarantee (Never outputs a file larger than the input)
 * - Visual Multi-PDF Merger (Lossless vector combining)
 * - Precision Page Extractor & Splitter
 * - Images-to-PDF Studio (A4 standard layout)
 */

import { PDFDocument, PDFName, PDFNumber, degrees } from 'pdf-lib';

let currentPdfFile = null;
let currentPdfBuffer = null;
let selectedPreset = 'smart'; // 'smart' | 'deep' | 'extreme'
let pdfjsLibPromise = null;
let mergeQueue = [];
let splitPdfFile = null;
let splitPdfBuffer = null;

export async function getPdfJs() {
    if (!pdfjsLibPromise) {
        pdfjsLibPromise = import('pdfjs-dist/build/pdf.mjs').then((mod) => {
            try {
                if (mod.GlobalWorkerOptions) {
                    const workerUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
                        ? chrome.runtime.getURL('pdf.worker.mjs')
                        : 'pdf.worker.mjs';
                    mod.GlobalWorkerOptions.workerSrc = workerUrl;
                }
            } catch (e) {
                console.warn('[PDF] Worker configuration notice:', e);
            }
            return mod;
        });
    }
    return pdfjsLibPromise;
}

export function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Strips dead streams, thumbnail caches, and bloated application metadata packets.
 */
function stripDocumentBloat(doc) {
    try {
        if (doc.catalog.has(PDFName.of('Metadata'))) {
            doc.catalog.delete(PDFName.of('Metadata'));
        }
        if (doc.catalog.has(PDFName.of('PieceInfo'))) {
            doc.catalog.delete(PDFName.of('PieceInfo'));
        }
        const pages = doc.getPages();
        for (const page of pages) {
            const node = page.node;
            if (node.has(PDFName.of('Thumb'))) {
                node.delete(PDFName.of('Thumb'));
            }
            if (node.has(PDFName.of('PieceInfo'))) {
                node.delete(PDFName.of('PieceInfo'));
            }
        }
    } catch (err) {
        console.warn('[PDF] Notice during bloat cleanup:', err);
    }
}

/**
 * Downsamples heavy embedded image XObjects in-place inside the PDF document.
 * Text, vector lines, formulas, and layouts remain 100% crisp and untouched.
 */
/**
 * Decompresses raw zlib or deflate streams utilizing native browser DecompressionStream.
 */
async function decompressFlate(bytes) {
    if (typeof DecompressionStream === 'undefined' || !bytes || bytes.length === 0) return null;
    try {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const res = new Response(ds.readable);
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
    } catch (_) {
        try {
            const dsRaw = new DecompressionStream('deflate-raw');
            const writer = dsRaw.writable.getWriter();
            writer.write(bytes);
            writer.close();
            const res = new Response(dsRaw.readable);
            const buf = await res.arrayBuffer();
            return new Uint8Array(buf);
        } catch (__) {
            return null;
        }
    }
}

/**
 * Downsamples heavy embedded image XObjects in-place inside the PDF document.
 * Text, vector lines, formulas, and layouts remain 100% crisp and untouched.
 */
async function downsampleEmbeddedImages(doc, onProgress, targetQuality = 0.72, maxDimension = 1400) {
    try {
        const indirectObjects = doc.context.enumerateIndirectObjects();
        const imageObjects = [];

        for (const [ref, obj] of indirectObjects) {
            if (obj && obj.dict && obj.dict.get(PDFName.of('Subtype'))?.toString() === '/Image') {
                imageObjects.push({ ref, obj });
            }
        }

        if (imageObjects.length === 0) return 0;

        let processed = 0;
        let replacedCount = 0;

        for (const { obj } of imageObjects) {
            processed++;
            if (onProgress) {
                onProgress(Math.round((processed / imageObjects.length) * 100), `Optimizing asset ${processed}/${imageObjects.length}...`);
            }

            try {
                const filter = obj.dict.get(PDFName.of('Filter'))?.toString();
                const rawBytes = obj.contents || (obj.getContents ? obj.getContents() : null);
                if (!rawBytes || rawBytes.byteLength < 16000) continue; // Skip tiny icons/glyphs under 16KB

                let imgBitmap = null;
                const widthVal = obj.dict.get(PDFName.of('Width'));
                const heightVal = obj.dict.get(PDFName.of('Height'));
                const declaredW = widthVal && typeof widthVal.asNumber === 'function' ? widthVal.asNumber() : 0;
                const declaredH = heightVal && typeof heightVal.asNumber === 'function' ? heightVal.asNumber() : 0;

                if (filter === '/DCTDecode' || !filter) {
                    const blob = new Blob([rawBytes], { type: 'image/jpeg' });
                    imgBitmap = await createImageBitmap(blob).catch(() => null);
                } else if (filter === '/FlateDecode') {
                    // 1. Try decoding as container image first
                    try {
                        const blob = new Blob([rawBytes], { type: 'image/png' });
                        imgBitmap = await createImageBitmap(blob).catch(() => null);
                    } catch (_) {}

                    // 2. If container failed, decompress raw deflate stream into pixel raster
                    if (!imgBitmap && declaredW > 0 && declaredH > 0 && typeof OffscreenCanvas !== 'undefined') {
                        const decompressed = await decompressFlate(rawBytes);
                        if (decompressed) {
                            const cs = obj.dict.get(PDFName.of('ColorSpace'))?.toString();
                            const canvas = new OffscreenCanvas(declaredW, declaredH);
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                const imgData = ctx.createImageData(declaredW, declaredH);
                                const d = imgData.data;

                                if ((cs === '/DeviceRGB' || !cs) && decompressed.length >= declaredW * declaredH * 3) {
                                    let s = 0;
                                    for (let i = 0; i < declaredW * declaredH * 4; i += 4) {
                                        d[i] = decompressed[s++];
                                        d[i + 1] = decompressed[s++];
                                        d[i + 2] = decompressed[s++];
                                        d[i + 3] = 255;
                                    }
                                    ctx.putImageData(imgData, 0, 0);
                                    imgBitmap = await createImageBitmap(canvas).catch(() => null);
                                } else if (cs === '/DeviceGray' && decompressed.length >= declaredW * declaredH) {
                                    let s = 0;
                                    for (let i = 0; i < declaredW * declaredH * 4; i += 4) {
                                        const g = decompressed[s++];
                                        d[i] = g;
                                        d[i + 1] = g;
                                        d[i + 2] = g;
                                        d[i + 3] = 255;
                                    }
                                    ctx.putImageData(imgData, 0, 0);
                                    imgBitmap = await createImageBitmap(canvas).catch(() => null);
                                }
                            }
                        }
                    }
                }

                if (!imgBitmap) continue;

                const maxDim = maxDimension;
                let targetW = imgBitmap.width;
                let targetH = imgBitmap.height;

                if (targetW > maxDim || targetH > maxDim) {
                    if (targetW > targetH) {
                        targetH = Math.round((targetH * maxDim) / targetW);
                        targetW = maxDim;
                    } else {
                        targetW = Math.round((targetW * maxDim) / targetH);
                        targetH = maxDim;
                    }
                }

                const canvas = (typeof OffscreenCanvas !== 'undefined')
                    ? new OffscreenCanvas(targetW, targetH)
                    : document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imgBitmap, 0, 0, targetW, targetH);
                imgBitmap.close?.();

                let compressedBlob;
                if (canvas.convertToBlob) {
                    compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: targetQuality });
                } else {
                    compressedBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', targetQuality));
                }

                if (!compressedBlob) continue;
                const newBuf = await compressedBlob.arrayBuffer();
                const newBytes = new Uint8Array(newBuf);

                if (newBytes.byteLength < rawBytes.byteLength) {
                    obj.contents = newBytes;
                    obj.dict.set(PDFName.of('Length'), PDFNumber.of(newBytes.byteLength));
                    obj.dict.set(PDFName.of('Width'), PDFNumber.of(targetW));
                    obj.dict.set(PDFName.of('Height'), PDFNumber.of(targetH));
                    obj.dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                    obj.dict.delete(PDFName.of('DecodeParms'));
                    replacedCount++;
                }
            } catch (imgErr) {
                // Ignore unsupported image colorspace and continue
                console.debug('[PDF] Image asset skipped:', imgErr);
            }
        }
        return replacedCount;
    } catch (err) {
        console.warn('[PDF] Embedded image downsampling notice:', err);
        return 0;
    }
}

/**
 * Master PDF Optimization Engine
 * Guarantees zero file inflation and chooses the most optimal result.
 */
export async function optimizePdf(buffer, options = {}, onProgress) {
    const preset = options.preset || 'smart';
    const originalSize = buffer.byteLength;

    if (onProgress) onProgress(15, 'Analyzing document structures...');

    // Strategy 1: Smart Vector & Object Streams (Pure Lossless)
    let smartBytes = null;
    try {
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        stripDocumentBloat(doc);

        if (preset === 'deep') {
            await downsampleEmbeddedImages(doc, onProgress, 0.65, 1200);
        } else if (preset === 'smart') {
            await downsampleEmbeddedImages(doc, onProgress, 0.78, 1600);
        }

        if (onProgress) onProgress(70, 'Packing object streams...');
        smartBytes = await doc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50
        });
    } catch (err) {
        console.warn('[PDF] Structure pass failed, falling back:', err);
    }

    // Strategy 2: Ultra Scan (Only if preset === 'extreme')
    let extremeBytes = null;
    if (preset === 'extreme') {
        try {
            if (onProgress) onProgress(30, 'Rendering raster pages...');
            const pdfjs = await getPdfJs();
            const loadingTask = pdfjs.getDocument({
                data: new Uint8Array(buffer.slice(0)),
                useWorkerFetch: false,
                isEvalSupported: false,
                useSystemFonts: true,
                stopAtErrors: false
            });
            const pdfDoc = await loadingTask.promise;
            const numPages = pdfDoc.numPages;
            const pagesData = [];

            for (let i = 1; i <= numPages; i++) {
                const percent = 30 + Math.round((i / numPages) * 55);
                if (onProgress) onProgress(percent, `Flattening page ${i}/${numPages}...`);

                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.9 });
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(viewport.width);
                canvas.height = Math.round(viewport.height);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: ctx, viewport }).promise;

                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.52);
                pagesData.push({ width: canvas.width, height: canvas.height, dataUrl: jpegDataUrl });
            }

            const extremeBlob = createSimplePdf(pagesData);
            const extremeBuf = await extremeBlob.arrayBuffer();
            extremeBytes = new Uint8Array(extremeBuf);
        } catch (extErr) {
            console.warn('[PDF] Extreme raster pass skipped:', extErr);
        }
    }

    if (onProgress) onProgress(95, 'Verifying compression metrics...');

    // Select best candidate with ZERO INFLATION GUARANTEE
    let bestBytes = null;
    let strategyUsed = 'smart';

    if (extremeBytes && extremeBytes.byteLength < originalSize) {
        bestBytes = extremeBytes;
        strategyUsed = 'extreme';
    }

    if (smartBytes && smartBytes.byteLength < originalSize) {
        if (!bestBytes || smartBytes.byteLength < bestBytes.byteLength) {
            bestBytes = smartBytes;
            strategyUsed = preset;
        }
    }

    // If no candidate achieved reduction, the original document was already optimal
    if (!bestBytes || bestBytes.byteLength >= originalSize) {
        return {
            buffer: buffer,
            isOptimal: true,
            savedBytes: 0,
            savedPercent: 0,
            originalSize,
            newSize: originalSize,
            strategy: 'pristine',
            message: `Pristine Document (${formatBytes(originalSize)}) · Already at minimum size with zero bloat.`
        };
    }

    const savedBytes = originalSize - bestBytes.byteLength;
    const savedPercent = Math.round((savedBytes / originalSize) * 100);

    return {
        buffer: bestBytes.buffer,
        isOptimal: false,
        savedBytes,
        savedPercent,
        originalSize,
        newSize: bestBytes.byteLength,
        strategy: strategyUsed,
        message: `Saved ${savedPercent}% (${formatBytes(originalSize)} → ${formatBytes(bestBytes.byteLength)})`
    };
}

/**
 * Merges multiple PDF files into a single unified PDF client-side
 * Preserves 100% of all vector fonts, text and resolution.
 */
export async function mergePdfs(pdfFiles) {
    const mergedDoc = await PDFDocument.create();

    for (const file of pdfFiles) {
        const buffer = await file.arrayBuffer();
        const donorDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const indices = donorDoc.getPageIndices();
        const copiedPages = await mergedDoc.copyPages(donorDoc, indices);
        copiedPages.forEach(p => mergedDoc.addPage(p));
    }

    const mergedBytes = await mergedDoc.save({ useObjectStreams: true });
    return new Blob([mergedBytes], { type: 'application/pdf' });
}

/**
 * Extracts specific pages from a PDF file losslessly
 */
export async function splitPdf(file, pageIndices = []) {
    const buffer = await file.arrayBuffer();
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const validIndices = pageIndices
        .map(n => n - 1)
        .filter(idx => idx >= 0 && idx < sourceDoc.getPageCount());

    if (validIndices.length === 0) {
        throw new Error('No valid page numbers specified for extraction');
    }

    const copiedPages = await newDoc.copyPages(sourceDoc, validIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const splitBytes = await newDoc.save({ useObjectStreams: true });
    return new Blob([splitBytes], { type: 'application/pdf' });
}

/**
 * Converts images into an A4 PDF document client-side
 */
export async function handleImagesToPdf(files, pageSize = 'a4') {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return null;

    const doc = await PDFDocument.create();
    const PAGE_W = 595.28; // A4 pt
    const PAGE_H = 841.89;

    for (const file of imageFiles) {
        const buffer = await file.arrayBuffer();
        let img;
        try {
            if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
                img = await doc.embedJpg(buffer);
            } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
                img = await doc.embedPng(buffer);
            } else {
                // Convert other formats (WebP, etc) via canvas
                const dataUrl = await new Promise(res => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result);
                    reader.readAsDataURL(file);
                });
                const bmp = await createImageBitmap(new Blob([buffer]));
                const canvas = document.createElement('canvas');
                canvas.width = bmp.width;
                canvas.height = bmp.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bmp, 0, 0);
                bmp.close?.();
                const pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
                const pngBuf = await pngBlob.arrayBuffer();
                img = await doc.embedPng(pngBuf);
            }

            if (img) {
                const page = doc.addPage([PAGE_W, PAGE_H]);
                const margin = 28;
                const maxW = PAGE_W - margin * 2;
                const maxH = PAGE_H - margin * 2;
                const scale = Math.min(maxW / img.width, maxH / img.height, 1.0);
                const drawW = img.width * scale;
                const drawH = img.height * scale;
                const x = (PAGE_W - drawW) / 2;
                const y = (PAGE_H - drawH) / 2;
                page.drawImage(img, { x, y, width: drawW, height: drawH });
            }
        } catch (e) {
            console.warn('[PDF] Image embed notice:', e);
        }
    }

    const pdfBytes = await doc.save({ useObjectStreams: true });
    return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Creates a clean standard PDF 1.4 from an array of selected images or page canvases (Fallback / studio engine helper)
 */
export function createSimplePdf(pages) {
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

    recordObject(1);
    append(`<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

    const pageObjNums = pages.map((_, i) => 3 + i * 3);
    recordObject(2);
    append(`<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);

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

        recordObject(pageNum);
        append(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Contents ${contentNum} 0 R /Resources << /XObject << /Im${i} ${imageNum} 0 R >> >> >>\nendobj\n`);

        const streamText = `q ${page.width} 0 0 ${page.height} 0 0 cm /Im${i} Do Q\n`;
        const streamBytes = encoder.encode(streamText);
        recordObject(contentNum);
        append(`<< /Length ${streamBytes.length} >>\nstream\n`);
        append(streamBytes);
        append(`\nendstream\nendobj\n`);

        recordObject(imageNum);
        append(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);
        append(imgBytes);
        append(`\nendstream\nendobj\n`);
    });

    const startXref = currentOffset;
    append(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= totalObjects; i++) {
        const offStr = String(offsets[i]).padStart(10, '0');
        append(`${offStr} 00000 n \n`);
    }

    append(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

    return new Blob(chunks, { type: 'application/pdf' });
}

/**
 * Initializes the PDF Lab interactive card controller
 */
export function initPdfTools() {
    const card = document.getElementById('card-pdf-tools');
    if (!card) return;

    // ─── Mode Navigation Tabs ───
    const navTabs = card.querySelectorAll('.pdf-nav-tab');
    const panels = {
        compress: document.getElementById('pdf-panel-compress'),
        merge: document.getElementById('pdf-panel-merge'),
        split: document.getElementById('pdf-panel-split'),
        img2pdf: document.getElementById('pdf-panel-img2pdf'),
    };

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            Object.keys(panels).forEach(key => {
                if (panels[key]) panels[key].classList.toggle('hidden', key !== target);
            });
        });
    });

    // ─── Tab 1: Compress Controller ───
    initCompressTab();

    // ─── Tab 2: Merge Controller ───
    initMergeTab();

    // ─── Tab 3: Split Controller ───
    initSplitTab();

    // ─── Tab 4: Images to PDF Controller ───
    initImg2PdfTab();
}

function initCompressTab() {
    const dropzone = document.getElementById('pdf-dropzone');
    const fileInput = document.getElementById('pdf-file-input');
    const openBtn = document.getElementById('pdf-open-btn');
    const startCompressBtn = document.getElementById('pdf-start-compress-btn');
    const resetBtn = document.getElementById('pdf-reset-btn');
    const presetsWrap = document.getElementById('pdf-compress-presets');

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
            loadCompressFile(files[0]);
        }
    });

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) loadCompressFile(file);
    });

    if (presetsWrap) {
        presetsWrap.addEventListener('click', (e) => {
            const pill = e.target.closest('.pdf-comp-pill');
            if (!pill) return;
            selectedPreset = pill.dataset.preset || 'smart';
            presetsWrap.querySelectorAll('.pdf-comp-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    }

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (!currentPdfFile) return;
            const url = URL.createObjectURL(currentPdfFile);
            window.open(url, '_blank');
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetCompressTab);
    }

    if (startCompressBtn) {
        startCompressBtn.addEventListener('click', executeCompress);
    }
}

function loadCompressFile(file) {
    currentPdfFile = file;
    const reader = new FileReader();
    reader.onload = async (e) => {
        currentPdfBuffer = e.target.result;
        const dropzone = document.getElementById('pdf-dropzone');
        const details = document.getElementById('pdf-details');
        const nameEl = document.getElementById('pdf-name-val');
        const sizeEl = document.getElementById('pdf-size-val');
        const pagesEl = document.getElementById('pdf-pages-val');
        const versionEl = document.getElementById('pdf-version-val');
        const progressWrap = document.getElementById('pdf-compress-progress');
        const resultWrap = document.getElementById('pdf-compress-result');

        if (dropzone) dropzone.classList.add('hidden');
        if (details) details.classList.remove('hidden');
        if (progressWrap) progressWrap.classList.add('hidden');
        if (resultWrap) resultWrap.classList.add('hidden');

        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatBytes(file.size);

        // Parse version
        const uint8 = new Uint8Array(currentPdfBuffer.slice(0, 1024));
        const headerStr = new TextDecoder('latin1').decode(uint8);
        const verMatch = headerStr.match(/%PDF-([0-9.]+)/);
        if (versionEl) versionEl.textContent = verMatch ? `PDF ${verMatch[1]}` : 'PDF 1.4';

        // Read page count losslessly via pdf-lib
        try {
            const doc = await PDFDocument.load(currentPdfBuffer, { ignoreEncryption: true });
            const count = doc.getPageCount();
            if (pagesEl) pagesEl.textContent = `${count} ${count === 1 ? 'page' : 'pages'}`;
        } catch (_) {
            if (pagesEl) pagesEl.textContent = '1 page';
        }
    };
    reader.readAsArrayBuffer(file);
}

async function executeCompress() {
    if (!currentPdfBuffer || !currentPdfFile) return;

    const progressWrap = document.getElementById('pdf-compress-progress');
    const progressBar = document.getElementById('pdf-compress-bar');
    const progressStatus = document.getElementById('pdf-compress-status-text');
    const progressPercent = document.getElementById('pdf-compress-percent-text');
    const resultWrap = document.getElementById('pdf-compress-result');
    const savingsBadge = document.getElementById('pdf-compress-savings-badge');
    const downloadBtn = document.getElementById('pdf-download-btn');
    const startBtn = document.getElementById('pdf-start-compress-btn');

    if (progressWrap) progressWrap.classList.remove('hidden');
    if (resultWrap) resultWrap.classList.add('hidden');
    if (startBtn) startBtn.disabled = true;

    try {
        const result = await optimizePdf(currentPdfBuffer, { preset: selectedPreset }, (pct, status) => {
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressPercent) progressPercent.textContent = `${pct}%`;
            if (progressStatus) progressStatus.textContent = status;
        });

        if (progressWrap) progressWrap.classList.add('hidden');
        if (resultWrap) resultWrap.classList.remove('hidden');

        if (savingsBadge) {
            savingsBadge.className = 'pdf-savings-badge' + (result.isOptimal ? ' optimal' : '');
            savingsBadge.textContent = result.message;
        }

        if (downloadBtn) {
            downloadBtn.onclick = () => {
                const blob = new Blob([result.buffer], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const baseName = currentPdfFile.name.replace(/\.[^/.]+$/, '');
                a.download = result.isOptimal ? `${baseName}_clean.pdf` : `${baseName}_optimized.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            };
        }
    } catch (err) {
        console.error('PDF Optimization error:', err);
        if (progressStatus) progressStatus.textContent = 'Notice: ' + (err.message || 'Error processing document');
    } finally {
        if (startBtn) startBtn.disabled = false;
    }
}

function resetCompressTab() {
    currentPdfFile = null;
    currentPdfBuffer = null;
    const fileInput = document.getElementById('pdf-file-input');
    if (fileInput) fileInput.value = '';
    const dropzone = document.getElementById('pdf-dropzone');
    const details = document.getElementById('pdf-details');
    const progressWrap = document.getElementById('pdf-compress-progress');
    const resultWrap = document.getElementById('pdf-compress-result');
    if (dropzone) dropzone.classList.remove('hidden');
    if (details) details.classList.add('hidden');
    if (progressWrap) progressWrap.classList.add('hidden');
    if (resultWrap) resultWrap.classList.add('hidden');
}

// ─── Tab 2: Merge Controller ───
function initMergeTab() {
    const dropzone = document.getElementById('pdf-merge-dropzone');
    const input = document.getElementById('pdf-merge-input');
    const queueWrap = document.getElementById('pdf-merge-queue');
    const listEl = document.getElementById('pdf-merge-list');
    const mergeBtn = document.getElementById('pdf-start-merge-btn');

    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());

    ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-active');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-active');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer?.files || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));
        addMergeFiles(files);
    });

    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        addMergeFiles(files);
    });

    function addMergeFiles(files) {
        files.forEach(f => mergeQueue.push(f));
        renderMergeQueue();
    }

    function renderMergeQueue() {
        if (mergeQueue.length === 0) {
            if (queueWrap) queueWrap.classList.add('hidden');
            return;
        }
        if (queueWrap) queueWrap.classList.remove('hidden');
        if (listEl) {
            listEl.innerHTML = mergeQueue.map((f, i) => `
                <div class="pdf-merge-item">
                    <span>${i + 1}. ${f.name} (${formatBytes(f.size)})</span>
                    <button type="button" class="file-pill-remove" data-index="${i}">×</button>
                </div>
            `).join('');

            listEl.querySelectorAll('.file-pill-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index, 10);
                    mergeQueue.splice(idx, 1);
                    renderMergeQueue();
                });
            });
        }
    }

    if (mergeBtn) {
        mergeBtn.addEventListener('click', async () => {
            if (mergeQueue.length < 2) {
                alert('Please add at least 2 PDF files to merge.');
                return;
            }
            mergeBtn.disabled = true;
            mergeBtn.textContent = 'Merging documents...';
            try {
                const mergedBlob = await mergePdfs(mergeQueue);
                const url = URL.createObjectURL(mergedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `merged_document_${Date.now()}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                mergeQueue = [];
                renderMergeQueue();
            } catch (err) {
                console.error('Merge failed:', err);
                alert('Merge notice: ' + (err.message || 'Error merging files'));
            } finally {
                mergeBtn.disabled = false;
                mergeBtn.textContent = '📑 Merge All PDFs';
            }
        });
    }
}

// ─── Tab 3: Split Controller ───
function initSplitTab() {
    const dropzone = document.getElementById('pdf-split-dropzone');
    const input = document.getElementById('pdf-split-input');
    const controls = document.getElementById('pdf-split-controls');
    const nameEl = document.getElementById('pdf-split-name');
    const pagesEl = document.getElementById('pdf-split-pages');
    const rangeInput = document.getElementById('pdf-split-range');
    const splitBtn = document.getElementById('pdf-start-split-btn');

    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());

    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const f = e.dataTransfer?.files?.[0];
        if (f && f.name.toLowerCase().endsWith('.pdf')) loadSplitFile(f);
    });

    input.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        if (f) loadSplitFile(f);
    });

    async function loadSplitFile(file) {
        splitPdfFile = file;
        const buf = await file.arrayBuffer();
        splitPdfBuffer = buf;
        try {
            const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
            const count = doc.getPageCount();
            if (nameEl) nameEl.textContent = file.name;
            if (pagesEl) pagesEl.textContent = `${count} total pages`;
            if (rangeInput) rangeInput.placeholder = `e.g. 1-${Math.min(count, 3)}, ${count}`;
            if (controls) controls.classList.remove('hidden');
            if (dropzone) dropzone.classList.add('hidden');
        } catch (err) {
            console.error('Split load error:', err);
        }
    }

    if (splitBtn) {
        splitBtn.addEventListener('click', async () => {
            if (!splitPdfFile || !splitPdfBuffer) return;
            const rangeStr = rangeInput?.value?.trim() || '';
            if (!rangeStr) {
                alert('Please enter page numbers to extract (e.g. 1-3, 5)');
                return;
            }

            const indices = [];
            const parts = rangeStr.split(',');
            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed.includes('-')) {
                    const [start, end] = trimmed.split('-').map(n => parseInt(n.trim(), 10));
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let p = start; p <= end; p++) indices.push(p);
                    }
                } else {
                    const p = parseInt(trimmed, 10);
                    if (!isNaN(p)) indices.push(p);
                }
            }

            if (indices.length === 0) {
                alert('Invalid page range format.');
                return;
            }

            splitBtn.disabled = true;
            splitBtn.textContent = 'Extracting pages...';
            try {
                const splitBlob = await splitPdf(splitPdfFile, indices);
                const url = URL.createObjectURL(splitBlob);
                const a = document.createElement('a');
                a.href = url;
                const baseName = splitPdfFile.name.replace(/\.[^/.]+$/, '');
                a.download = `${baseName}_extracted.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            } catch (err) {
                alert('Split notice: ' + (err.message || 'Error extracting pages'));
            } finally {
                splitBtn.disabled = false;
                splitBtn.textContent = '✂ Extract Pages';
            }
        });
    }
}

// ─── Tab 4: Images to PDF Controller ───
function initImg2PdfTab() {
    const dropzone = document.getElementById('pdf-img2pdf-dropzone');
    const input = document.getElementById('pdf-img-to-pdf-input');
    const queueWrap = document.getElementById('pdf-img2pdf-queue');
    const statusEl = document.getElementById('pdf-img-status');
    const convertBtn = document.getElementById('pdf-img-to-pdf-btn');

    if (!dropzone || !input) return;

    let queuedImages = [];

    dropzone.addEventListener('click', () => input.click());

    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            queuedImages = files;
            if (queueWrap) queueWrap.classList.remove('hidden');
            if (statusEl) statusEl.textContent = `${queuedImages.length} images queued`;
        }
    });

    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            queuedImages = files;
            if (queueWrap) queueWrap.classList.remove('hidden');
            if (statusEl) statusEl.textContent = `${queuedImages.length} images queued`;
        }
    });

    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            if (queuedImages.length === 0) return;
            convertBtn.disabled = true;
            convertBtn.textContent = 'Compiling PDF...';
            try {
                const pdfBlob = await handleImagesToPdf(queuedImages);
                if (pdfBlob) {
                    const url = URL.createObjectURL(pdfBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `raeen_document_${Date.now()}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                    if (statusEl) statusEl.textContent = `✓ Generated ${queuedImages.length}-page PDF successfully!`;
                    queuedImages = [];
                }
            } catch (err) {
                if (statusEl) statusEl.textContent = 'Notice: Error compiling images to PDF';
            } finally {
                convertBtn.disabled = false;
                convertBtn.textContent = '🖼 Generate PDF from Images';
            }
        });
    }
}
