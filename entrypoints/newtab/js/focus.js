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

const RING_CIRCUMFERENCE = 364.42; // 2 * Math.PI * 58

function updateFocusDisplay() {
    if (!dom.cardFocusTime) return;
    const safeSec = Math.max(0, focusTimeLeft);
    const m = Math.floor(safeSec / 60).toString().padStart(2, '0');
    const s = (safeSec % 60).toString().padStart(2, '0');
    dom.cardFocusTime.textContent = `${m}:${s}`;

    // Update SVG circular progress dial
    const ringProgress = document.getElementById('focus-ring-progress');
    if (ringProgress) {
        const total = focusTimerData.sessionDuration || (25 * 60);
        const progress = Math.max(0, Math.min(1, safeSec / total));
        const offset = RING_CIRCUMFERENCE * (1 - progress);
        ringProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
        ringProgress.style.strokeDashoffset = `${offset}`;
    }

    // Update status badge & mode label
    const badge = document.getElementById('focus-status-badge');
    const modeLabel = document.getElementById('focus-mode-label');
    const totalMins = Math.round((focusTimerData.sessionDuration || (25 * 60)) / 60);
    const isBreak = totalMins <= 15;

    if (modeLabel) {
        modeLabel.textContent = isBreak ? `${totalMins}m Break Session` : `${totalMins}m Deep Work`;
    }

    if (badge) {
        badge.className = 'focus-status-badge';
        if (focusTimerData.isRunning) {
            badge.textContent = isBreak ? 'Resting' : 'Focusing';
            badge.classList.add('badge-running');
        } else if (focusTimeLeft === 0) {
            badge.textContent = 'Completed!';
            badge.classList.add('badge-completed');
        } else if (focusTimerData.pausedLeft < (focusTimerData.sessionDuration || 25 * 60)) {
            badge.textContent = 'Paused';
            badge.classList.add('badge-paused');
        } else {
            badge.textContent = 'Ready';
            badge.classList.add('badge-ready');
        }
    }
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
    const handleToggle = () => {
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

    const handleReset = () => {
        focusTimerData.isRunning = false;
        focusTimerData.endTime = 0;
        focusTimerData.pausedLeft = focusTimerData.sessionDuration || (25 * 60);
        stopTicker();
        saveFocusState();
        syncFocusState();
    };

    const handlePresetChange = (mins) => {
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

    if (dom.focusToggleBtn) {
        dom.focusToggleBtn.onclick = handleToggle;
    }

    if (dom.focusResetBtn) {
        dom.focusResetBtn.onclick = handleReset;
    }

    // 5. Preset duration selector pills
    const presetContainer = document.getElementById('focus-presets');
    if (presetContainer) {
        presetContainer.onclick = (e) => {
            const pill = e.target.closest('.focus-preset-pill');
            if (!pill || !pill.dataset.minutes) return;
            handlePresetChange(parseInt(pill.dataset.minutes, 10));
        };
    }

    // 6. Global event delegation fallback (guarantees clicks work even across DOM replacement)
    if (!window._raeenFocusDelegated) {
        window._raeenFocusDelegated = true;
        document.addEventListener('click', (e) => {
            const toggle = e.target.closest('#focus-toggle-btn');
            if (toggle && toggle !== dom.focusToggleBtn) {
                handleToggle();
                return;
            }
            const reset = e.target.closest('#focus-reset-btn');
            if (reset && reset !== dom.focusResetBtn) {
                handleReset();
                return;
            }
            const pill = e.target.closest('.focus-preset-pill');
            if (pill && pill.dataset.minutes && (!presetContainer || !presetContainer.contains(pill))) {
                handlePresetChange(parseInt(pill.dataset.minutes, 10));
            }
        });
    }
}

export function resetFocusTimerForTest() {
    focusTimerData = { endTime: 0, pausedLeft: 25 * 60, isRunning: false, sessionDuration: 25 * 60 };
    focusTimeLeft = 25 * 60;
    stopTicker();
}
