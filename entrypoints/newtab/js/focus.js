import { dom } from './dom.js';

let focusTimeLeft = 25 * 60; // For display
let focusTimerData = { endTime: 0, pausedLeft: 25 * 60, isRunning: false, sessionDuration: 25 * 60 };
let timerInterval = null;

function startTicker() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        if (focusTimerData.isRunning) {
            const left = Math.floor((focusTimerData.endTime - Date.now()) / 1000);
            if (left > 0) {
                focusTimeLeft = left;
                updateFocusDisplay();
            } else {
                // Session completed!
                focusTimeLeft = 0;
                updateFocusDisplay();
                focusTimerData.isRunning = false;
                focusTimerData.endTime = 0;
                focusTimerData.pausedLeft = focusTimerData.sessionDuration || (25 * 60);
                stopTicker();
                saveFocusState();
                syncFocusState();
                playSessionCompleteChime();
            }
        } else {
            stopTicker();
        }
    }, 1000);
}

function stopTicker() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateFocusDisplay() {
    if (!dom.cardFocusTime) return;
    const safeSec = Math.max(0, focusTimeLeft);
    const m = Math.floor(safeSec / 60).toString().padStart(2, '0');
    const s = (safeSec % 60).toString().padStart(2, '0');
    dom.cardFocusTime.textContent = `${m}:${s}`;
}

function updatePresetPillsUI() {
    const currentMins = Math.round((focusTimerData.sessionDuration || (25 * 60)) / 60);
    const pills = document.querySelectorAll('.focus-preset-pill');
    pills.forEach(pill => {
        const mins = parseInt(pill.dataset.minutes || '0', 10);
        pill.classList.toggle('active', mins === currentMins);
    });
}

function syncFocusState() {
    // Validate data integrity
    if (typeof focusTimerData.pausedLeft !== 'number' || isNaN(focusTimerData.pausedLeft) || focusTimerData.pausedLeft <= 0) {
        focusTimerData.pausedLeft = focusTimerData.sessionDuration || (25 * 60);
    }
    if (!focusTimerData.sessionDuration) {
        focusTimerData.sessionDuration = 25 * 60;
    }

    if (focusTimerData.isRunning) {
        const left = Math.floor((focusTimerData.endTime - Date.now()) / 1000);
        if (left <= 0) {
            // Expired while away
            focusTimerData.isRunning = false;
            focusTimerData.endTime = 0;
            focusTimerData.pausedLeft = focusTimerData.sessionDuration;
            focusTimeLeft = focusTimerData.sessionDuration;
            if (dom.focusToggleBtn) dom.focusToggleBtn.innerHTML = '▶ Start';
            stopTicker();
            saveFocusState();
        } else {
            focusTimeLeft = left;
            if (dom.focusToggleBtn) dom.focusToggleBtn.innerHTML = '⏸ Pause';
            startTicker();
        }
    } else {
        focusTimeLeft = focusTimerData.pausedLeft;
        if (dom.focusToggleBtn) dom.focusToggleBtn.innerHTML = '▶ Start';
        stopTicker();
    }

    updateFocusDisplay();
    updatePresetPillsUI();
}

function saveFocusState() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ 'raeen_dashboard_focus': focusTimerData });
    }
    try {
        localStorage.setItem('raeen_dashboard_focus', JSON.stringify(focusTimerData));
    } catch (e) {}
}

function playSessionCompleteChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch(e) {}
}

export function initFocusTimer() {
    // 1. Immediately hydrate from localStorage for instantaneous first render
    try {
        const raw = localStorage.getItem('raeen_dashboard_focus');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                focusTimerData = Object.assign(focusTimerData, parsed);
            }
        }
    } catch (e) {}

    syncFocusState();

    // 2. Load and listen for changes across extension storage / other tabs
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['raeen_dashboard_focus'], (result) => {
            if (result && result.raeen_dashboard_focus) {
                focusTimerData = Object.assign(focusTimerData, result.raeen_dashboard_focus);
                syncFocusState();
            }
        });

        chrome.storage?.onChanged?.addListener((changes, areaName) => {
            if (areaName === 'local' && changes.raeen_dashboard_focus) {
                focusTimerData = Object.assign(focusTimerData, changes.raeen_dashboard_focus.newValue || {});
                syncFocusState();
            }
        });
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'raeen_dashboard_focus' && e.newValue) {
            try {
                focusTimerData = Object.assign(focusTimerData, JSON.parse(e.newValue));
                syncFocusState();
            } catch (err) {}
        }
    });

    // 3. Document visibility change handler (resync when user switches back to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && focusTimerData.isRunning) {
            syncFocusState();
        }
    });

    // 4. Attach button events
    if (dom.focusToggleBtn) {
        dom.focusToggleBtn.onclick = () => {
            if (focusTimerData.isRunning) {
                // Pause
                focusTimerData.pausedLeft = Math.max(1, focusTimeLeft);
                focusTimerData.isRunning = false;
                focusTimerData.endTime = 0;
            } else {
                // Start
                if (!focusTimerData.pausedLeft || focusTimerData.pausedLeft <= 0) {
                    focusTimerData.pausedLeft = focusTimerData.sessionDuration || (25 * 60);
                }
                focusTimerData.endTime = Date.now() + focusTimerData.pausedLeft * 1000;
                focusTimerData.isRunning = true;
            }
            saveFocusState();
            syncFocusState();
        };
    }

    if (dom.focusResetBtn) {
        dom.focusResetBtn.onclick = () => {
            focusTimerData.isRunning = false;
            focusTimerData.endTime = 0;
            focusTimerData.pausedLeft = focusTimerData.sessionDuration || (25 * 60);
            stopTicker();
            saveFocusState();
            syncFocusState();
        };
    }

    // 5. Preset duration selector pills (25m Focus / 15m Break / 5m Rest)
    const presetContainer = document.getElementById('focus-presets');
    if (presetContainer) {
        presetContainer.onclick = (e) => {
            const pill = e.target.closest('.focus-preset-pill');
            if (!pill || !pill.dataset.minutes) return;
            const mins = parseInt(pill.dataset.minutes, 10);
            if (isNaN(mins) || mins <= 0) return;

            const durationSec = mins * 60;
            focusTimerData.sessionDuration = durationSec;
            focusTimerData.pausedLeft = durationSec;
            focusTimerData.isRunning = false;
            focusTimerData.endTime = 0;
            stopTicker();
            saveFocusState();
            syncFocusState();
        };
    }
}

export function resetFocusTimerForTest() {
    focusTimerData = { endTime: 0, pausedLeft: 25 * 60, isRunning: false, sessionDuration: 25 * 60 };
    focusTimeLeft = 25 * 60;
    stopTicker();
}
