import { describe, it, expect } from 'vitest';
import { formatBytes, optimizePdf, mergePdfs, splitPdf, createSimplePdf } from '../../entrypoints/newtab/js/pdf-tools.js';
import { PDFDocument } from 'pdf-lib';

describe('PDF Lab Suite', () => {
    it('formatBytes accurately formats bytes into human-readable units', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1024 * 1024)).toBe('1 MB');
        expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('createSimplePdf creates a valid PDF blob from page data', async () => {
        const pages = [
            {
                width: 400,
                height: 300,
                dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
            }
        ];
        const blob = createSimplePdf(pages);
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/pdf');
        expect(blob.size).toBeGreaterThan(0);
    });

    it('optimizePdf guarantees zero file inflation on already-compact vector PDFs', async () => {
        const doc = await PDFDocument.create();
        const page = doc.addPage([500, 700]);
        page.drawText('Sample Clean Document');
        const originalBytes = await doc.save({ useObjectStreams: true });

        const result = await optimizePdf(originalBytes.buffer, { preset: 'smart' });
        expect(result.originalSize).toBe(originalBytes.byteLength);
        expect(result.newSize).toBeLessThanOrEqual(originalBytes.byteLength);
        if (result.isOptimal) {
            expect(result.message).toContain('Already at minimum size');
        }
    });

    it('mergePdfs combines multiple PDF documents losslessly', async () => {
        const doc1 = await PDFDocument.create();
        doc1.addPage([400, 600]);
        const bytes1 = await doc1.save();

        const doc2 = await PDFDocument.create();
        doc2.addPage([400, 600]);
        doc2.addPage([400, 600]);
        const bytes2 = await doc2.save();

        const file1 = new File([bytes1], 'doc1.pdf', { type: 'application/pdf' });
        const file2 = new File([bytes2], 'doc2.pdf', { type: 'application/pdf' });

        const mergedBlob = await mergePdfs([file1, file2]);
        const mergedBuf = await mergedBlob.arrayBuffer();
        const mergedDoc = await PDFDocument.load(mergedBuf);

        expect(mergedDoc.getPageCount()).toBe(3);
    });

    it('splitPdf extracts specific page indices correctly', async () => {
        const doc = await PDFDocument.create();
        doc.addPage([400, 600]); // page 1
        doc.addPage([400, 600]); // page 2
        doc.addPage([400, 600]); // page 3
        const bytes = await doc.save();
        const file = new File([bytes], 'source.pdf', { type: 'application/pdf' });

        const splitBlob = await splitPdf(file, [1, 3]);
        const splitBuf = await splitBlob.arrayBuffer();
        const splitDoc = await PDFDocument.load(splitBuf);

        expect(splitDoc.getPageCount()).toBe(2);
    });
});
