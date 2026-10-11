/**
 * studio-ui.js — UI Controller for Creative Studio Suite (PhotoCraft, VectorCraft, PdfCraft)
 * Connects CreativeStudioEngine to #creative-canvas-modal and #card-creative-studio
 */

import { GlobalStudioEngine } from './studio-engine.js';

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const studioEngine = GlobalStudioEngine;

export function initCreativeStudio() {
    const modal = document.getElementById('creative-canvas-modal');
    const canvas = document.getElementById('studio-viewport-canvas');
    if (!canvas || !modal) return;

    // Attach canvas to engine singleton
    studioEngine.attachToCanvas(canvas);

    // Modal open/close controls
    const openModal = () => {
        modal.classList.remove('hidden');
        studioEngine.render();
        renderLayerList();
        updateVectorPreview();
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const closeBtn = modal.querySelector('#close-studio-btn') || modal.querySelector('.close-btn');
    if (closeBtn) closeBtn.onclick = closeModal;

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    // Open studio card buttons
    const launchBtn = document.getElementById('launch-creative-studio-btn');
    if (launchBtn) launchBtn.onclick = openModal;

    const snapBtn = document.getElementById('snap-screen-markup-btn');
    if (snapBtn) {
        snapBtn.onclick = async () => {
            snapBtn.disabled = true;
            const originalText = snapBtn.textContent;
            snapBtn.textContent = 'Snapping...';
            try {
                const chromeApi = (globalThis).chrome;
                if (chromeApi?.runtime?.sendMessage) {
                    chromeApi.runtime.sendMessage({ action: 'capture_screen' }, async (res) => {
                        if (res && res.success && res.dataUrl) {
                            await studioEngine.loadImage(res.dataUrl);
                            openModal();
                        } else {
                            openModal();
                        }
                    });
                } else {
                    openModal();
                }
            } catch (err) {
                console.warn('Screen capture notice:', err);
                openModal();
            } finally {
                snapBtn.disabled = false;
                snapBtn.textContent = originalText;
            }
        };
    }

    // Mini Dropzone in Creator Card
    const miniDropzone = document.getElementById('studio-mini-dropzone');
    if (miniDropzone) {
        ['dragenter', 'dragover'].forEach(evt => {
            miniDropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                miniDropzone.classList.add('drag-active');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            miniDropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                miniDropzone.classList.remove('drag-active');
            });
        });
        miniDropzone.addEventListener('drop', (e) => {
            const file = e.dataTransfer?.files?.[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    await studioEngine.loadImage(ev.target.result);
                    openModal();
                };
                reader.readAsDataURL(file);
            }
        });
        miniDropzone.onclick = () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        await studioEngine.loadImage(ev.target.result);
                        openModal();
                    };
                    reader.readAsDataURL(file);
                }
            };
            fileInput.click();
        };
    }

    // ─── Suite Tab Switching (PhotoCraft, VectorCraft, PdfCraft) ───────────────
    const suiteTabBtns = modal.querySelectorAll('.studio-tab-btn[data-suite-tab]');
    const suitePanes = {
        photocraft: document.getElementById('studio-pane-photocraft'),
        vectorcraft: document.getElementById('studio-pane-vectorcraft'),
        pdfcraft: document.getElementById('studio-pane-pdfcraft')
    };

    suiteTabBtns.forEach(btn => {
        btn.onclick = () => {
            suiteTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.suiteTab;
            Object.keys(suitePanes).forEach(k => {
                if (suitePanes[k]) {
                    suitePanes[k].classList.toggle('hidden', k !== target);
                }
            });
            if (target === 'vectorcraft') {
                updateVectorPreview();
            }
        };
    });

    // ─── PhotoCraft: Tool Palette ─────────────────────────────────────────────
    const toolBtns = modal.querySelectorAll('.studio-tool-btn[data-tool]');
    toolBtns.forEach(btn => {
        btn.onclick = () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tool = btn.dataset.tool;
            studioEngine.activeTool = tool;
        };
    });

    // Color & Size
    const colorPicker = document.getElementById('studio-color-picker');
    if (colorPicker) {
        colorPicker.oninput = (e) => {
            studioEngine.brushColor = e.target.value;
        };
    }

    const sizeSlider = document.getElementById('studio-size-slider');
    const sizeLabel = document.getElementById('studio-size-label');
    if (sizeSlider) {
        sizeSlider.oninput = (e) => {
            const val = parseInt(e.target.value, 10);
            studioEngine.brushSize = val;
            if (sizeLabel) sizeLabel.textContent = `${val}px`;
        };
    }

    // Pixel Filters & AI Cut
    const filterBtns = modal.querySelectorAll('.studio-pill-btn[data-filter]');
    filterBtns.forEach(btn => {
        btn.onclick = () => {
            const filter = btn.dataset.filter;
            if (filter === 'remove_bg') {
                studioEngine.removeBackground();
            } else {
                studioEngine.applyFilter(filter);
            }
        };
    });

    // Transforms (Flip & Rotate)
    const flipHBtn = document.getElementById('studio-flip-h-btn');
    if (flipHBtn) flipHBtn.onclick = () => studioEngine.flipHorizontal();

    const flipVBtn = document.getElementById('studio-flip-v-btn');
    if (flipVBtn) flipVBtn.onclick = () => studioEngine.flipVertical();

    const rotateBtn = document.getElementById('studio-rotate-btn');
    if (rotateBtn) rotateBtn.onclick = () => studioEngine.rotate90();

    // ─── Layer Management UI ──────────────────────────────────────────────────
    const layerListEl = document.getElementById('studio-layer-list');

    function renderLayerList() {
        if (!layerListEl) return;
        layerListEl.innerHTML = '';
        studioEngine.layers.forEach((layer, idx) => {
            const item = document.createElement('div');
            item.className = 'studio-layer-item' + (idx === studioEngine.activeLayerIndex ? ' active' : '');

            const title = document.createElement('span');
            title.textContent = `${layer.visible ? '👁️' : '🕶️'} ${layer.name}`;
            title.style.flex = '1';
            title.style.overflow = 'hidden';
            title.style.textOverflow = 'ellipsis';
            title.style.whiteSpace = 'nowrap';
            title.onclick = () => {
                studioEngine.setActiveLayer(idx);
                renderLayerList();
            };

            const actions = document.createElement('div');
            actions.className = 'studio-layer-actions';

            const toggleVisBtn = document.createElement('button');
            toggleVisBtn.className = 'studio-mini-icon-btn';
            toggleVisBtn.textContent = layer.visible ? 'Hide' : 'Show';
            toggleVisBtn.onclick = (e) => {
                e.stopPropagation();
                studioEngine.toggleLayerVisibility(idx);
                renderLayerList();
            };

            actions.appendChild(toggleVisBtn);
            item.appendChild(title);
            item.appendChild(actions);
            layerListEl.appendChild(item);
        });
    }

    const addLayerBtn = document.getElementById('studio-add-layer-btn');
    if (addLayerBtn) {
        addLayerBtn.onclick = () => {
            studioEngine.addLayer();
            renderLayerList();
        };
    }

    const dupLayerBtn = document.getElementById('studio-duplicate-layer-btn');
    if (dupLayerBtn) {
        dupLayerBtn.onclick = () => {
            studioEngine.duplicateActiveLayer();
            renderLayerList();
        };
    }

    const delLayerBtn = document.getElementById('studio-delete-layer-btn');
    if (delLayerBtn) {
        delLayerBtn.onclick = () => {
            studioEngine.deleteActiveLayer();
            renderLayerList();
        };
    }

    // Undo / Redo / Clear
    const undoBtn = document.getElementById('studio-undo-btn');
    if (undoBtn) undoBtn.onclick = async () => {
        await studioEngine.undo();
        renderLayerList();
    };

    const redoBtn = document.getElementById('studio-redo-btn');
    if (redoBtn) redoBtn.onclick = async () => {
        await studioEngine.redo();
        renderLayerList();
    };

    const clearBtn = document.getElementById('studio-clear-btn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            studioEngine.clearActiveLayer();
        };
    }

    // ─── VectorCraft: visionOS Squircle Generator UI ───────────────────────────
    const nSlider = document.getElementById('vector-n-slider');
    const nLabel = document.getElementById('vector-n-label');
    const vSizeSlider = document.getElementById('vector-size-slider');
    const vSizeLabel = document.getElementById('vector-size-label');
    const vFillPicker = document.getElementById('vector-fill-picker');
    const vSvgCode = document.getElementById('vector-svg-code');
    const vGenerateBtn = document.getElementById('vector-generate-btn');
    const vCopySvgBtn = document.getElementById('vector-copy-svg-btn');
    const vDownloadSvgBtn = document.getElementById('vector-download-svg-btn');

    function updateVectorPreview() {
        const n = parseFloat(nSlider?.value || '4');
        const size = parseInt(vSizeSlider?.value || '280', 10);
        const fill = vFillPicker?.value || '#38bdf8';
        if (nLabel) {
            nLabel.textContent = n === 4 ? '4.0 (Apple)' : n.toFixed(1);
        }
        if (vSizeLabel) {
            vSizeLabel.textContent = `${size}px`;
        }
        if (vSvgCode) {
            vSvgCode.value = studioEngine.generateSquircleSVG(size, size, n, fill);
        }
    }

    if (nSlider) nSlider.oninput = updateVectorPreview;
    if (vSizeSlider) vSizeSlider.oninput = updateVectorPreview;
    if (vFillPicker) vFillPicker.oninput = updateVectorPreview;

    if (vGenerateBtn) {
        vGenerateBtn.onclick = async () => {
            const n = parseFloat(nSlider?.value || '4');
            const size = parseInt(vSizeSlider?.value || '280', 10);
            const fill = vFillPicker?.value || '#38bdf8';
            await studioEngine.renderSquircleToActiveLayer(size, n, fill);
            // Switch back to PhotoCraft to see result
            const photoTabBtn = modal.querySelector('.studio-tab-btn[data-suite-tab="photocraft"]');
            if (photoTabBtn) photoTabBtn.click();
        };
    }

    if (vCopySvgBtn) {
        vCopySvgBtn.onclick = async () => {
            const svg = vSvgCode?.value || '';
            await navigator.clipboard.writeText(svg);
            const orig = vCopySvgBtn.textContent;
            vCopySvgBtn.textContent = '✓ Copied!';
            setTimeout(() => { vCopySvgBtn.textContent = orig; }, 1800);
        };
    }

    if (vDownloadSvgBtn) {
        vDownloadSvgBtn.onclick = () => {
            const svg = vSvgCode?.value || '';
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `squircle_${Date.now()}.svg`;
            a.click();
            URL.revokeObjectURL(url);
        };
    }

    // ─── PdfCraft: Client-Side PDF Compressor & Tooling ───────────────────────
    let currentPdfPreset = { quality: 0.65, scale: 1.0 };
    const pdfPresetBtns = modal.querySelectorAll('.studio-pill-btn[data-pdf-preset]');
    pdfPresetBtns.forEach(btn => {
        btn.onclick = () => {
            pdfPresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const preset = btn.dataset.pdfPreset;
            if (preset === 'extreme') currentPdfPreset = { quality: 0.45, scale: 0.85 };
            else if (preset === 'light') currentPdfPreset = { quality: 0.85, scale: 1.15 };
            else currentPdfPreset = { quality: 0.65, scale: 1.0 };
        };
    });

    const pdfCraftFileInput = document.getElementById('pdfcraft-file-input');
    const pdfCraftChooseBtn = document.getElementById('pdfcraft-choose-btn');
    const pdfCraftStatus = document.getElementById('pdfcraft-status');

    if (pdfCraftChooseBtn && pdfCraftFileInput) {
        pdfCraftChooseBtn.onclick = () => pdfCraftFileInput.click();
        pdfCraftFileInput.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (pdfCraftStatus) pdfCraftStatus.textContent = `Optimizing ${file.name}...`;
            try {
                const buffer = await file.arrayBuffer();
                const compressedBlob = await studioEngine.compressPDF(buffer, currentPdfPreset);
                const origStr = formatBytes(file.size);
                const newStr = formatBytes(compressedBlob.size);
                const savedPercent = Math.max(0, Math.round(((file.size - compressedBlob.size) / file.size) * 100));

                if (pdfCraftStatus) {
                    pdfCraftStatus.textContent = `✓ Done! ${origStr} → ${newStr} (${savedPercent}% saved)`;
                }

                // Download result
                const url = URL.createObjectURL(compressedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${file.name.replace(/\.[^/.]+$/, '')}_compressed.pdf`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 8000);
            } catch (err) {
                console.error('PdfCraft error:', err);
                if (pdfCraftStatus) pdfCraftStatus.textContent = 'Error compressing file.';
            }
        };
    }

    const pdfCraftImgInput = document.getElementById('pdfcraft-img-input');
    const pdfCraftImagesBtn = document.getElementById('pdfcraft-images-btn');
    if (pdfCraftImagesBtn && pdfCraftImgInput) {
        pdfCraftImagesBtn.onclick = () => pdfCraftImgInput.click();
        pdfCraftImgInput.onchange = async (e) => {
            const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) return;
            if (pdfCraftStatus) pdfCraftStatus.textContent = `Converting ${files.length} images to PDF...`;

            try {
                const imagesData = await Promise.all(files.map(f => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        const reader = new FileReader();
                        reader.onload = () => {
                            img.onload = () => {
                                const c = document.createElement('canvas');
                                c.width = img.naturalWidth;
                                c.height = img.naturalHeight;
                                const ctx = c.getContext('2d');
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, c.width, c.height);
                                ctx.drawImage(img, 0, 0);
                                resolve({
                                    width: c.width,
                                    height: c.height,
                                    dataUrl: c.toDataURL('image/jpeg', 0.85)
                                });
                            };
                            img.src = reader.result;
                        };
                        reader.readAsDataURL(f);
                    });
                }));

                const { createSimplePdf } = await import('./pdf-tools.js');
                const pdfBlob = createSimplePdf(imagesData);
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `images_document_${Date.now()}.pdf`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 8000);

                if (pdfCraftStatus) pdfCraftStatus.textContent = `✓ Generated ${files.length}-page PDF!`;
            } catch (err) {
                console.error('PdfCraft images to pdf error:', err);
                if (pdfCraftStatus) pdfCraftStatus.textContent = 'Error converting images.';
            }
        };
    }

    // ─── Header Action Buttons (Copy & Download) ──────────────────────────────
    const copyBtn = document.getElementById('studio-copy-clipboard-btn');
    if (copyBtn) {
        copyBtn.onclick = async () => {
            copyBtn.disabled = true;
            const originalContent = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span>✓ Copied!</span>';
            try {
                await studioEngine.copyToClipboard();
            } catch (err) {
                console.warn('Clipboard write notice:', err);
            } finally {
                setTimeout(() => {
                    copyBtn.disabled = false;
                    copyBtn.innerHTML = originalContent;
                }, 2000);
            }
        };
    }

    const downloadBtn = document.getElementById('studio-download-btn');
    if (downloadBtn) {
        downloadBtn.onclick = async () => {
            const blob = await studioEngine.exportBlob('image/png');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `creative_studio_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 8000);
        };
    }

    // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Esc)
    window.addEventListener('keydown', (e) => {
        if (modal.classList.contains('hidden')) return;
        if (e.key === 'Escape') closeModal();
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) studioEngine.redo();
            else studioEngine.undo();
            renderLayerList();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            studioEngine.redo();
            renderLayerList();
        }
    });
}
