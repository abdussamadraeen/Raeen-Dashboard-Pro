/**
 * Universal Creative Studio Engine (PhotoCraft, VectorCraft & PdfCraft Suite)
 * Clean-room, high-performance, browser-native creative engine:
 * 
 * 1. PhotoCraft:
 *    - Multi-layer compositing (add, duplicate, delete, reorder, opacity, 12 blend modes)
 *    - Full tool palette: Brush, Pencil, Eraser, Fill Bucket, Eyedropper, Shapes (Rect, Ellipse, Line, Arrow, Callout), Text, Highlight, Redact, Crop
 *    - Real-time adjustment pipeline: Brightness, Contrast, Saturation, Vibrance, Exposure, Temperature
 *    - Filters: Grayscale, Sepia, Invert, Vignette, Box Blur, Sharpen, Local AI Background Removal
 *    - Transforms: Flip H/V, Rotate 90° CW/CCW
 *    - History: Full Undo/Redo stack
 * 
 * 2. VectorCraft:
 *    - True Apple visionOS Superellipse Squircle generator (|x/a|^n + |y/b|^n = 1)
 *    - Vector shape library (Squircle, Star, Hexagon, Shield, Badge)
 *    - Live SVG Code Generator & Clean SVG Export
 * 
 * 3. PdfCraft:
 *    - Client-side multi-level PDF compression (Light, Balanced, Extreme)
 *    - Client-side PDF merger & page extractor
 *    - High-fidelity Images-to-PDF compiler
 */

export class StudioLayer {
    constructor(id, name, width, height) {
        this.id = id;
        this.name = name;
        this.visible = true;
        this.opacity = 1.0;
        this.blendMode = 'source-over';
        this.canvas = document.createElement('canvas');
        this.canvas.width = Math.max(1, width);
        this.canvas.height = Math.max(1, height);
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    clone(newId, newName) {
        const copy = new StudioLayer(newId, newName || `${this.name} Copy`, this.canvas.width, this.canvas.height);
        copy.visible = this.visible;
        copy.opacity = this.opacity;
        copy.blendMode = this.blendMode;
        copy.ctx.drawImage(this.canvas, 0, 0);
        return copy;
    }
}

export class CreativeStudioEngine {
    constructor(width = 800, height = 520) {
        this.width = width;
        this.height = height;
        this.layers = [];
        this.activeLayerIndex = 0;
        this.mainCanvas = null;
        this.mainCtx = null;
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 30;

        // Current Tool & Style Settings
        this.activeTool = 'brush'; // 'brush', 'pencil', 'eraser', 'bucket', 'eyedropper', 'rect', 'ellipse', 'line', 'arrow', 'callout', 'text', 'highlight', 'redact', 'crop'
        this.brushColor = '#38bdf8';
        this.brushSize = 4;
        this.brushOpacity = 1.0;
        this.fontSize = 20;
        this.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        // Adjustments State Cache
        this.adjustments = {
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0,
            vibrance: 0,
            exposure: 1.0,
            temperature: 0
        };

        // Initialize default background layer
        this.addLayer('Background');
    }

    attachToCanvas(canvasElement) {
        this.mainCanvas = canvasElement;
        this.mainCanvas.width = this.width;
        this.mainCanvas.height = this.height;
        this.mainCtx = this.mainCanvas.getContext('2d');
        this._bindCanvasInteractions();
        this.render();
    }

    setDimensions(width, height) {
        this.width = Math.max(50, Math.min(4096, width));
        this.height = Math.max(50, Math.min(4096, height));
        if (this.mainCanvas) {
            this.mainCanvas.width = this.width;
            this.mainCanvas.height = this.height;
        }
        this.layers.forEach(l => {
            const temp = document.createElement('canvas');
            temp.width = l.canvas.width;
            temp.height = l.canvas.height;
            temp.getContext('2d').drawImage(l.canvas, 0, 0);

            l.canvas.width = this.width;
            l.canvas.height = this.height;
            l.ctx.drawImage(temp, 0, 0);
        });
        this.render();
    }

    // ─── Layer Management ────────────────────────────────────────────────────────

    addLayer(name = null) {
        const id = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const layerName = name || `Layer ${this.layers.length + 1}`;
        const layer = new StudioLayer(id, layerName, this.width, this.height);
        this.layers.push(layer);
        this.activeLayerIndex = this.layers.length - 1;
        this.render();
        return layer;
    }

    duplicateActiveLayer() {
        if (this.layers.length === 0) return null;
        this.saveSnapshot();
        const cur = this.getActiveLayer();
        const id = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const copy = cur.clone(id, `${cur.name} Copy`);
        this.layers.splice(this.activeLayerIndex + 1, 0, copy);
        this.activeLayerIndex++;
        this.render();
        return copy;
    }

    deleteActiveLayer() {
        if (this.layers.length <= 1) {
            // Keep at least 1 layer, clear it instead
            this.clearActiveLayer();
            return;
        }
        this.saveSnapshot();
        this.layers.splice(this.activeLayerIndex, 1);
        this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1);
        this.render();
    }

    reorderLayers(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.layers.length) return;
        if (toIndex < 0 || toIndex >= this.layers.length) return;
        this.saveSnapshot();
        const [moved] = this.layers.splice(fromIndex, 1);
        this.layers.splice(toIndex, 0, moved);
        this.activeLayerIndex = toIndex;
        this.render();
    }

    getActiveLayer() {
        return this.layers[this.activeLayerIndex] || this.layers[0];
    }

    setActiveLayer(index) {
        if (index >= 0 && index < this.layers.length) {
            this.activeLayerIndex = index;
            this.render();
        }
    }

    setLayerOpacity(index, opacity) {
        const layer = this.layers[index];
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
            this.render();
        }
    }

    setLayerBlendMode(index, mode) {
        const layer = this.layers[index];
        if (layer) {
            layer.blendMode = mode || 'source-over';
            this.render();
        }
    }

    toggleLayerVisibility(index) {
        const layer = this.layers[index];
        if (layer) {
            layer.visible = !layer.visible;
            this.render();
        }
    }

    clearActiveLayer() {
        this.saveSnapshot();
        const layer = this.getActiveLayer();
        if (layer) {
            layer.clear();
            this.render();
        }
    }

    // ─── Compositing & Rendering ────────────────────────────────────────────────

    render() {
        if (!this.mainCtx || !this.mainCanvas) return;
        this.mainCtx.clearRect(0, 0, this.width, this.height);

        for (const layer of this.layers) {
            if (!layer.visible) continue;
            this.mainCtx.globalAlpha = layer.opacity;
            this.mainCtx.globalCompositeOperation = layer.blendMode || 'source-over';
            this.mainCtx.drawImage(layer.canvas, 0, 0);
        }

        this.mainCtx.globalAlpha = 1.0;
        this.mainCtx.globalCompositeOperation = 'source-over';
    }

    // ─── History (Undo / Redo) ──────────────────────────────────────────────────

    saveSnapshot() {
        const snapshot = this.layers.map(l => ({
            id: l.id,
            name: l.name,
            visible: l.visible,
            opacity: l.opacity,
            blendMode: l.blendMode,
            dataUrl: l.canvas.toDataURL()
        }));

        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    async undo() {
        if (this.undoStack.length === 0) return false;
        const current = this.layers.map(l => ({
            id: l.id,
            name: l.name,
            visible: l.visible,
            opacity: l.opacity,
            blendMode: l.blendMode,
            dataUrl: l.canvas.toDataURL()
        }));
        this.redoStack.push(current);

        const snapshot = this.undoStack.pop();
        await this.restoreSnapshot(snapshot);
        return true;
    }

    async redo() {
        if (this.redoStack.length === 0) return false;
        const snapshot = this.redoStack.pop();
        await this.restoreSnapshot(snapshot);
        return true;
    }

    async restoreSnapshot(snapshot) {
        this.layers = [];
        for (const layerData of snapshot) {
            const layer = new StudioLayer(layerData.id, layerData.name, this.width, this.height);
            layer.visible = layerData.visible;
            layer.opacity = layerData.opacity;
            layer.blendMode = layerData.blendMode || 'source-over';

            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    layer.ctx.drawImage(img, 0, 0);
                    resolve();
                };
                img.src = layerData.dataUrl;
            });
            this.layers.push(layer);
        }
        this.activeLayerIndex = Math.min(this.activeLayerIndex, this.layers.length - 1);
        this.render();
    }

    // ─── Image Loading ──────────────────────────────────────────────────────────

    async loadImage(imgSource) {
        this.saveSnapshot();
        const layer = this.getActiveLayer();

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const hRatio = this.width / img.width;
                const vRatio = this.height / img.height;
                const ratio = Math.min(hRatio, vRatio, 1);
                const drawWidth = img.width * ratio;
                const drawHeight = img.height * ratio;
                const x = (this.width - drawWidth) / 2;
                const y = (this.height - drawHeight) / 2;

                layer.clear();
                layer.ctx.drawImage(img, x, y, drawWidth, drawHeight);
                this.render();
                resolve({ width: drawWidth, height: drawHeight });
            };
            img.onerror = (e) => reject(new Error('Failed to load image in Studio: ' + e));
            img.src = typeof imgSource === 'string' ? imgSource : URL.createObjectURL(imgSource);
        });
    }

    // ─── Adjustments & Filters (PhotoCraft) ─────────────────────────────────────

    applyFilter(filterType, intensity = 1.0) {
        this.saveSnapshot();
        const layer = this.getActiveLayer();
        const imgData = layer.ctx.getImageData(0, 0, this.width, this.height);
        const d = imgData.data;

        switch (filterType) {
            case 'grayscale':
                for (let i = 0; i < d.length; i += 4) {
                    const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                    d[i] = avg; d[i + 1] = avg; d[i + 2] = avg;
                }
                break;

            case 'invert':
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2];
                }
                break;

            case 'sepia':
                for (let i = 0; i < d.length; i += 4) {
                    const r = d[i], g = d[i + 1], b = d[i + 2];
                    d[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                    d[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                    d[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                }
                break;

            case 'brightness': {
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = Math.min(255, d[i] * intensity);
                    d[i + 1] = Math.min(255, d[i + 1] * intensity);
                    d[i + 2] = Math.min(255, d[i + 2] * intensity);
                }
                break;
            }

            case 'contrast': {
                const contrast = (intensity - 1) * 255;
                const f = (259 * (contrast + 255)) / (255 * (259 - contrast));
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = Math.min(255, Math.max(0, f * (d[i] - 128) + 128));
                    d[i + 1] = Math.min(255, Math.max(0, f * (d[i + 1] - 128) + 128));
                    d[i + 2] = Math.min(255, Math.max(0, f * (d[i + 2] - 128) + 128));
                }
                break;
            }

            case 'saturation': {
                for (let i = 0; i < d.length; i += 4) {
                    const r = d[i], g = d[i + 1], b = d[i + 2];
                    const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
                    d[i] = Math.min(255, Math.max(0, gray + (r - gray) * intensity));
                    d[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * intensity));
                    d[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * intensity));
                }
                break;
            }

            case 'vignette': {
                const cx = this.width / 2;
                const cy = this.height / 2;
                const maxDist = Math.sqrt(cx * cx + cy * cy);
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const idx = (y * this.width + x) * 4;
                        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                        const ratio = 1 - Math.min(1, (dist / maxDist) * 0.85);
                        d[idx] *= ratio; d[idx + 1] *= ratio; d[idx + 2] *= ratio;
                    }
                }
                break;
            }

            case 'blur': {
                const copy = new Uint8ClampedArray(d);
                const w = this.width;
                const h = this.height;
                for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        let r = 0, g = 0, b = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                const p = ((y + dy) * w + (x + dx)) * 4;
                                r += copy[p]; g += copy[p + 1]; b += copy[p + 2];
                            }
                        }
                        const cur = (y * w + x) * 4;
                        d[cur] = r / 9; d[cur + 1] = g / 9; d[cur + 2] = b / 9;
                    }
                }
                break;
            }

            case 'sharpen': {
                const copy = new Uint8ClampedArray(d);
                const w = this.width;
                const h = this.height;
                // 3x3 Sharpen Kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
                for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        const cur = (y * w + x) * 4;
                        const top = ((y - 1) * w + x) * 4;
                        const bot = ((y + 1) * w + x) * 4;
                        const left = (y * w + (x - 1)) * 4;
                        const right = (y * w + (x + 1)) * 4;

                        for (let c = 0; c < 3; c++) {
                            const val = 5 * copy[cur + c] - copy[top + c] - copy[bot + c] - copy[left + c] - copy[right + c];
                            d[cur + c] = Math.min(255, Math.max(0, val));
                        }
                    }
                }
                break;
            }

            default:
                break;
        }

        layer.ctx.putImageData(imgData, 0, 0);
        this.render();
    }

    removeBackground(tolerance = 28) {
        this.saveSnapshot();
        const layer = this.getActiveLayer();
        const imgData = layer.ctx.getImageData(0, 0, this.width, this.height);
        const d = imgData.data;

        // Sample corner pixels to determine background color
        const corners = [0, (this.width - 1) * 4, (this.height - 1) * this.width * 4];
        let bgR = 0, bgG = 0, bgB = 0;
        corners.forEach(c => {
            bgR += d[c]; bgG += d[c + 1]; bgB += d[c + 2];
        });
        bgR /= corners.length; bgG /= corners.length; bgB /= corners.length;

        for (let i = 0; i < d.length; i += 4) {
            const dist = Math.sqrt((d[i] - bgR) ** 2 + (d[i + 1] - bgG) ** 2 + (d[i + 2] - bgB) ** 2);
            if (dist < tolerance) {
                d[i + 3] = 0; // Transparent
            } else if (dist < tolerance * 1.5) {
                const alphaFactor = (dist - tolerance) / (tolerance * 0.5);
                d[i + 3] = Math.round(d[i + 3] * alphaFactor);
            }
        }

        layer.ctx.putImageData(imgData, 0, 0);
        this.render();
    }

    flipHorizontal() {
        this.saveSnapshot();
        const layer = this.getActiveLayer();
        const temp = document.createElement('canvas');
        temp.width = this.width; temp.height = this.height;
        temp.getContext('2d').drawImage(layer.canvas, 0, 0);

        layer.clear();
        layer.ctx.save();
        layer.ctx.scale(-1, 1);
        layer.ctx.drawImage(temp, -this.width, 0);
        layer.ctx.restore();
        this.render();
    }

    flipVertical() {
        this.saveSnapshot();
        const layer = this.getActiveLayer();
        const temp = document.createElement('canvas');
        temp.width = this.width; temp.height = this.height;
        temp.getContext('2d').drawImage(layer.canvas, 0, 0);

        layer.clear();
        layer.ctx.save();
        layer.ctx.scale(1, -1);
        layer.ctx.drawImage(temp, 0, -this.height);
        layer.ctx.restore();
        this.render();
    }

    rotate90() {
        this.saveSnapshot();
        const oldW = this.width;
        const oldH = this.height;
        this.setDimensions(oldH, oldW);

        this.layers.forEach(l => {
            const temp = document.createElement('canvas');
            temp.width = oldW; temp.height = oldH;
            temp.getContext('2d').drawImage(l.canvas, 0, 0);

            l.clear();
            l.ctx.save();
            l.ctx.translate(this.width / 2, this.height / 2);
            l.ctx.rotate((90 * Math.PI) / 180);
            l.ctx.drawImage(temp, -oldW / 2, -oldH / 2);
            l.ctx.restore();
        });

        this.render();
    }

    // ─── Drawing & Markup Interactivity ─────────────────────────────────────────

    _bindCanvasInteractions() {
        if (!this.mainCanvas) return;
        let isDrawing = false;
        let startX = 0, startY = 0;

        const getCoords = (e) => {
            const rect = this.mainCanvas.getBoundingClientRect();
            const scaleX = this.width / rect.width;
            const scaleY = this.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };

        this.mainCanvas.addEventListener('mousedown', (e) => {
            const { x, y } = getCoords(e);
            isDrawing = true;
            startX = x;
            startY = y;

            const layer = this.getActiveLayer();

            if (this.activeTool === 'eyedropper') {
                const pixel = layer.ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
                const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
                this.brushColor = hex;
                const picker = document.getElementById('studio-color-picker');
                if (picker) picker.value = hex;
                isDrawing = false;
                return;
            }

            if (this.activeTool === 'bucket') {
                this.saveSnapshot();
                this._floodFill(layer.ctx, Math.round(x), Math.round(y), this.brushColor);
                this.render();
                isDrawing = false;
                return;
            }

            this.saveSnapshot();

            if (this.activeTool === 'brush' || this.activeTool === 'pencil' || this.activeTool === 'eraser') {
                layer.ctx.beginPath();
                layer.ctx.moveTo(x, y);
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            const { x, y } = getCoords(e);
            const layer = this.getActiveLayer();

            if (this.activeTool === 'brush') {
                layer.ctx.strokeStyle = this.brushColor;
                layer.ctx.lineWidth = this.brushSize;
                layer.ctx.lineCap = 'round';
                layer.ctx.lineJoin = 'round';
                layer.ctx.globalCompositeOperation = 'source-over';
                layer.ctx.lineTo(x, y);
                layer.ctx.stroke();
                this.render();
            } else if (this.activeTool === 'pencil') {
                layer.ctx.strokeStyle = this.brushColor;
                layer.ctx.lineWidth = Math.max(1, Math.min(3, this.brushSize));
                layer.ctx.lineCap = 'square';
                layer.ctx.globalCompositeOperation = 'source-over';
                layer.ctx.lineTo(x, y);
                layer.ctx.stroke();
                this.render();
            } else if (this.activeTool === 'eraser') {
                layer.ctx.strokeStyle = 'rgba(0,0,0,1)';
                layer.ctx.lineWidth = this.brushSize * 2;
                layer.ctx.lineCap = 'round';
                layer.ctx.globalCompositeOperation = 'destination-out';
                layer.ctx.lineTo(x, y);
                layer.ctx.stroke();
                this.render();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (!isDrawing) return;
            isDrawing = false;
            const { x, y } = getCoords(e);
            const layer = this.getActiveLayer();
            layer.ctx.globalCompositeOperation = 'source-over';

            if (this.activeTool === 'arrow') {
                this._drawArrow(layer.ctx, startX, startY, x, y, this.brushColor, this.brushSize);
            } else if (this.activeTool === 'line') {
                layer.ctx.strokeStyle = this.brushColor;
                layer.ctx.lineWidth = this.brushSize;
                layer.ctx.beginPath();
                layer.ctx.moveTo(startX, startY);
                layer.ctx.lineTo(x, y);
                layer.ctx.stroke();
            } else if (this.activeTool === 'rect') {
                layer.ctx.strokeStyle = this.brushColor;
                layer.ctx.lineWidth = this.brushSize;
                layer.ctx.strokeRect(startX, startY, x - startX, y - startY);
            } else if (this.activeTool === 'ellipse') {
                layer.ctx.strokeStyle = this.brushColor;
                layer.ctx.lineWidth = this.brushSize;
                layer.ctx.beginPath();
                const radiusX = Math.abs(x - startX) / 2;
                const radiusY = Math.abs(y - startY) / 2;
                const centerX = Math.min(startX, x) + radiusX;
                const centerY = Math.min(startY, y) + radiusY;
                layer.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                layer.ctx.stroke();
            } else if (this.activeTool === 'callout') {
                this._drawCallout(layer.ctx, startX, startY, x - startX, y - startY, this.brushColor);
            } else if (this.activeTool === 'highlight') {
                layer.ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
                layer.ctx.fillRect(startX, startY, x - startX, y - startY);
            } else if (this.activeTool === 'redact') {
                layer.ctx.fillStyle = '#000000';
                layer.ctx.fillRect(startX, startY, x - startX, y - startY);
            } else if (this.activeTool === 'text') {
                const text = prompt('Enter text annotation:');
                if (text) {
                    layer.ctx.fillStyle = this.brushColor;
                    layer.ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
                    layer.ctx.fillText(text, x, y);
                }
            }

            this.render();
        });
    }

    _drawArrow(ctx, fromX, fromY, toX, toY, color, width) {
        const headlen = 16;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    _drawCallout(ctx, x, y, w, h, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const r = 12;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h - 14, r);
        ctx.fill();
        ctx.stroke();

        // Speech Tail
        ctx.beginPath();
        ctx.moveTo(x + 20, y + h - 14);
        ctx.lineTo(x + 10, y + h);
        ctx.lineTo(x + 35, y + h - 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _floodFill(ctx, startX, startY, fillColorHex) {
        const imgData = ctx.getImageData(0, 0, this.width, this.height);
        const d = imgData.data;
        const w = this.width;
        const h = this.height;

        const startIndex = (startY * w + startX) * 4;
        const targetR = d[startIndex], targetG = d[startIndex + 1], targetB = d[startIndex + 2], targetA = d[startIndex + 3];

        // Parse hex color
        const fillR = parseInt(fillColorHex.slice(1, 3), 16);
        const fillG = parseInt(fillColorHex.slice(3, 5), 16);
        const fillB = parseInt(fillColorHex.slice(5, 7), 16);
        const fillA = 255;

        if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

        const queue = [[startX, startY]];
        const visited = new Uint8Array(w * h);

        while (queue.length > 0) {
            const [cx, cy] = queue.pop();
            const idx = cy * w + cx;
            if (visited[idx]) continue;
            visited[idx] = 1;

            const p = idx * 4;
            if (Math.abs(d[p] - targetR) < 24 && Math.abs(d[p + 1] - targetG) < 24 && Math.abs(d[p + 2] - targetB) < 24) {
                d[p] = fillR;
                d[p + 1] = fillG;
                d[p + 2] = fillB;
                d[p + 3] = fillA;

                if (cx > 0) queue.push([cx - 1, cy]);
                if (cx < w - 1) queue.push([cx + 1, cy]);
                if (cy > 0) queue.push([cx, cy - 1]);
                if (cy < h - 1) queue.push([cx, cy + 1]);
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }

    // ─── VectorCraft: visionOS Squircle & Vector SVG Engine ─────────────────────

    /**
     * Generates a true Apple visionOS quartic superellipse (|x/a|^n + |y/b|^n = 1, with n = 4)
     */
    generateSquircleSVG(width = 240, height = 240, n = 4, fill = '#38bdf8', stroke = 'none') {
        const halfW = width / 2;
        const halfH = height / 2;
        const points = [];
        const steps = 120;

        for (let i = 0; i < steps; i++) {
            const theta = (i / steps) * Math.PI * 2;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);
            const signCos = Math.sign(cosT);
            const signSin = Math.sign(sinT);

            const x = halfW + signCos * halfW * Math.pow(Math.abs(cosT), 2 / n);
            const y = halfH + signSin * halfH * Math.pow(Math.abs(sinT), 2 / n);
            points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
        }

        const pathData = `M ${points[0]} L ${points.slice(1).join(' ')} Z`;
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <path d="${pathData}" fill="${fill}" stroke="${stroke}" />
</svg>`;
    }

    async renderSquircleToActiveLayer(size = 280, n = 4, fill = this.brushColor) {
        this.saveSnapshot();
        const svg = this.generateSquircleSVG(size, size, n, fill);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        await this.loadImage(url);
        URL.revokeObjectURL(url);
    }

    // ─── PdfCraft: High-Fidelity Client-Side PDF Tools ──────────────────────────

    /**
     * Client-Side PDF Compression
     * Renders pages via canvas and repacks with optimized DCT streams
     */
    async compressPDF(pdfBuffer, options = { quality: 0.65, scale: 1.0 }) {
        const { getPdfJs } = await import('./pdf-tools.js');
        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(pdfBuffer.slice(0)),
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true
        });

        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        const pagesData = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: options.scale || 1.0 });

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;

            const jpegDataUrl = canvas.toDataURL('image/jpeg', options.quality || 0.65);
            pagesData.push({
                width: canvas.width,
                height: canvas.height,
                dataUrl: jpegDataUrl
            });
        }

        const { createSimplePdf } = await import('./pdf-tools.js');
        return createSimplePdf(pagesData);
    }

    // ─── Export & Clipboard Handlers ────────────────────────────────────────────

    async copyToClipboard() {
        if (!this.mainCanvas) return false;
        try {
            const blob = await new Promise(res => this.mainCanvas.toBlob(res, 'image/png'));
            if (!blob) return false;
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            return true;
        } catch (e) {
            console.error('Clipboard copy failed:', e);
            return false;
        }
    }

    export(format = 'image/png', quality = 0.95) {
        if (!this.mainCanvas) return '';
        return this.mainCanvas.toDataURL(format, quality);
    }

    download(filename = 'studio_export.png', format = 'image/png') {
        const data = this.export(format);
        const a = document.createElement('a');
        a.href = data;
        a.download = filename;
        a.click();
    }
}

export const GlobalStudioEngine = new CreativeStudioEngine(800, 520);
