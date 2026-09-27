import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initFocusTimer, resetFocusTimerForTest } from '../../entrypoints/newtab/js/focus.js';

describe('Focus Timer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetFocusTimerForTest();
        document.body.innerHTML = `
            <div id="card-focus">
                <div id="card-focus-time">25:00</div>
                <div id="focus-presets">
                    <button type="button" class="focus-preset-pill active" data-minutes="25">25m Focus</button>
                    <button type="button" class="focus-preset-pill" data-minutes="15">15m Break</button>
                    <button type="button" class="focus-preset-pill" data-minutes="5">5m Rest</button>
                </div>
                <div class="focus-controls">
                    <button id="focus-toggle-btn">▶ Start</button>
                    <button id="focus-reset-btn">↺ Reset</button>
                </div>
            </div>
        `;
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllTimers();
    });

    it('initializes with 25:00 display and ▶ Start button', async () => {
        const { initFocusTimer } = await import('../../entrypoints/newtab/js/focus.js');
        initFocusTimer();

        const timeEl = document.getElementById('card-focus-time');
        const btn = document.getElementById('focus-toggle-btn');
        expect(timeEl?.textContent).toBe('25:00');
        expect(btn?.innerHTML).toBe('▶ Start');
    });

    it('starts ticker when ▶ Start is clicked and switches to ⏸ Pause', async () => {
        const { initFocusTimer } = await import('../../entrypoints/newtab/js/focus.js');
        initFocusTimer();

        const timeEl = document.getElementById('card-focus-time');
        const btn = document.getElementById('focus-toggle-btn');

        btn?.click();
        expect(btn?.innerHTML).toBe('⏸ Pause');

        // Advance 3 seconds
        vi.advanceTimersByTime(3000);
        expect(timeEl?.textContent).toBe('24:57');
    });

    it('pauses ticker when ⏸ Pause is clicked', async () => {
        const { initFocusTimer } = await import('../../entrypoints/newtab/js/focus.js');
        initFocusTimer();

        const timeEl = document.getElementById('card-focus-time');
        const btn = document.getElementById('focus-toggle-btn');

        btn?.click(); // start
        vi.advanceTimersByTime(5000);
        expect(timeEl?.textContent).toBe('24:55');

        btn?.click(); // pause
        expect(btn?.innerHTML).toBe('▶ Start');

        vi.advanceTimersByTime(5000);
        // Time remains paused
        expect(timeEl?.textContent).toBe('24:55');
    });

    it('resets ticker when ↺ Reset is clicked', async () => {
        const { initFocusTimer } = await import('../../entrypoints/newtab/js/focus.js');
        initFocusTimer();

        const timeEl = document.getElementById('card-focus-time');
        const btn = document.getElementById('focus-toggle-btn');
        const resetBtn = document.getElementById('focus-reset-btn');

        btn?.click(); // start
        vi.advanceTimersByTime(10000);
        expect(timeEl?.textContent).toBe('24:50');

        resetBtn?.click();
        expect(timeEl?.textContent).toBe('25:00');
        expect(btn?.innerHTML).toBe('▶ Start');
    });

    it('switches duration when preset pill is clicked', async () => {
        const { initFocusTimer } = await import('../../entrypoints/newtab/js/focus.js');
        initFocusTimer();

        const timeEl = document.getElementById('card-focus-time');
        const breakPill = document.querySelector('[data-minutes="5"]');

        breakPill?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(timeEl?.textContent).toBe('05:00');
        expect(breakPill?.classList.contains('active')).toBe(true);
    });
});
