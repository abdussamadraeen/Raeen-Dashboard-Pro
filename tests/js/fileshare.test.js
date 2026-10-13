import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatBytes,
  formatSpeed,
  generateSixDigitCode,
  sanitizeFileName,
  getFileIcon
} from '../../entrypoints/newtab/js/fileshare.js';

describe('ShareMe Fileshare Engine Tests', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(null)).toBe('0 B');
      expect(formatBytes(-10)).toBe('0 B');
    });

    it('formats standard byte thresholds', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });
  });

  describe('formatSpeed', () => {
    it('formats zero and small rates', () => {
      expect(formatSpeed(0)).toBe('0 B/s');
      expect(formatSpeed(null)).toBe('0 B/s');
      expect(formatSpeed(500)).toBe('500 B/s');
    });

    it('formats megabyte and gigabyte rates', () => {
      expect(formatSpeed(10485760)).toBe('10 MB/s');
      expect(formatSpeed(1073741824)).toBe('1 GB/s');
    });
  });

  describe('generateSixDigitCode', () => {
    it('generates a 6-digit numeric string', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateSixDigitCode();
        expect(code).toMatch(/^\d{6}$/);
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('sanitizeFileName', () => {
    it('neutralizes malicious path traversal characters', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('______etc_passwd');
      expect(sanitizeFileName('..\\windows\\system32')).toBe('___windows_system32');
    });

    it('neutralizes angle brackets, quotes, and control chars', () => {
      expect(sanitizeFileName('<script>alert(1).png')).toBe('_script_alert(1).png');
      expect(sanitizeFileName('file"with*special?chars.txt')).toBe('file_with_special_chars.txt');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(sanitizeFileName('')).toBe('downloaded_file');
      expect(sanitizeFileName(null)).toBe('downloaded_file');
      expect(sanitizeFileName(undefined)).toBe('downloaded_file');
    });
  });

  describe('getFileIcon', () => {
    it('returns appropriate emojis based on extension', () => {
      expect(getFileIcon('photo.jpg')).toBe('🖼️');
      expect(getFileIcon('image.png')).toBe('🖼️');
      expect(getFileIcon('movie.mp4')).toBe('🎬');
      expect(getFileIcon('track.mp3')).toBe('🎵');
      expect(getFileIcon('archive.zip')).toBe('📦');
      expect(getFileIcon('doc.pdf')).toBe('📄');
      expect(getFileIcon('unknown.xyz')).toBe('📁');
      expect(getFileIcon('')).toBe('📄');
    });
  });

  describe('Binary Chunk Processing & Normalization', () => {
    it('normalizes Uint8Array views to clean ArrayBuffers without dropping data', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const view = original.subarray(2, 6); // [3, 4, 5, 6]

      let chunkBuffer = null;
      if (view instanceof ArrayBuffer) {
        chunkBuffer = view;
      } else if (ArrayBuffer.isView(view)) {
        chunkBuffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
      }

      expect(chunkBuffer).toBeInstanceOf(ArrayBuffer);
      expect(chunkBuffer.byteLength).toBe(4);
      const reconstructed = new Uint8Array(chunkBuffer);
      expect(Array.from(reconstructed)).toEqual([3, 4, 5, 6]);
    });

    it('handles direct ArrayBuffers correctly', () => {
      const buffer = new Uint8Array([10, 20, 30]).buffer;
      let chunkBuffer = null;
      if (buffer instanceof ArrayBuffer) {
        chunkBuffer = buffer;
      }

      expect(chunkBuffer).toBeInstanceOf(ArrayBuffer);
      expect(chunkBuffer.byteLength).toBe(3);
    });
  });
});
