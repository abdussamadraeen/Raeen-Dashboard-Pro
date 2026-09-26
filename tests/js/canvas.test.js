import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CanvasEngine } from '../../entrypoints/newtab/js/canvas.js';

describe('CanvasEngine', () => {
  let canvasElement;

  beforeEach(() => {
    // Setup mock canvas element with 2d context
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1920;
    canvasElement.height = 1080;

    const mockCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
    };

    canvasElement.getContext = vi.fn(() => mockCtx);
  });

  afterEach(() => {
    CanvasEngine.stop();
  });

  const themes = [
    'neural',
    'bubbles',
    'rain',
    'matrix',
    'warp',
    'wave',
    'galaxy',
    'fireflies',
    'synthwave',
    'quantum',
  ];

  themes.forEach((theme) => {
    it(`initializes theme "${theme}" without throwing ReferenceError or crashing`, () => {
      expect(() => {
        CanvasEngine.init(canvasElement, theme, {
          speed: 1.2,
          density: 1.0,
          glow: 1.5,
        });
      }).not.toThrow();

      // Test pointer movement interaction
      expect(() => {
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: 500,
            clientY: 400,
          })
        );
      }).not.toThrow();

      // Test pointer down interaction
      expect(() => {
        window.dispatchEvent(new PointerEvent('pointerdown'));
      }).not.toThrow();

      // Test pointer up interaction
      expect(() => {
        window.dispatchEvent(new PointerEvent('pointerup'));
      }).not.toThrow();

      // Test setOptions
      expect(() => {
        CanvasEngine.setOptions({
          speed: 1.5,
          density: 1.8,
          glow: 2.0,
        });
      }).not.toThrow();

      // Test clean stop
      expect(() => {
        CanvasEngine.stop();
      }).not.toThrow();
    });
  });
});
