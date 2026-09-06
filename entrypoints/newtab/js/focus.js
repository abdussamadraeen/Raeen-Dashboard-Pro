import { dom } from './dom.js';

let focusTimeLeft = 25 * 60; // For display
let focusTimerData = { endTime: 0, pausedLeft: 25 * 60, isRunning: false };

export function initFocusTimer() {
    // Load state safely for cross-tab sync
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['raeen_dashboard_focus'], (result) => {
            if (result.raeen_dashboard_focus) {
                focusTimerData = result.raeen_dashboard_focus;
                syncFocusState();
            }
        });

        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local' && changes.raeen_dashboard_focus) {
                focusTimerData = changes.raeen_dashboard_focus.newValue;
                syncFocusState();
            }
        });
    } else if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem('raeen_dashboard_focus');
            if (raw) {
                focusTimerData = JSON.parse(raw);
                syncFocusState();
            }
        } catch (e) {}

        window.addEventListener('storage', (e) => {
            if (e.key === 'raeen_dashboard_focus' && e.newValue) {
                try {
                    focusTimerData = JSON.parse(e.newValue);
                    syncFocusState();
                } catch (err) {}
            }
        });
    }

    setInterval(() => {
        if (focusTimerData.isRunning) {
            const left = Math.floor((focusTimerData.endTime - Date.now()) / 1000);
            if (left >= 0) {
                focusTimeLeft = left;
                updateFocusDisplay();
            } else {
                focusTimerData.isRunning = false;
                focusTimerData.pausedLeft = 25 * 60;
                saveFocusState();
                syncFocusState();
            }
        }
    }, 1000);

    if (dom.focusToggleBtn) {
        dom.focusToggleBtn.addEventListener('click', () => {
            if (focusTimerData.isRunning) {
                focusTimerData.pausedLeft = focusTimeLeft;
                focusTimerData.isRunning = false;
            } else {
                focusTimerData.endTime = Date.now() + focusTimerData.pausedLeft * 1000;
                focusTimerData.isRunning = true;
            }
            saveFocusState();
            syncFocusState();
        });
    }

    if (dom.focusResetBtn) {
        dom.focusResetBtn.addEventListener('click', () => {
            focusTimerData.isRunning = false;
            focusTimerData.pausedLeft = 25 * 60;
            saveFocusState();
            syncFocusState();
        });
    }
}

function saveFocusState() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ 'raeen_dashboard_focus': focusTimerData });
    } else {
        try {
            localStorage.setItem('raeen_dashboard_focus', JSON.stringify(focusTimerData));
        } catch (e) {}
    }
}

function syncFocusState() {
    if (focusTimerData.isRunning) {
        focusTimeLeft = Math.max(0, Math.floor((focusTimerData.endTime - Date.now()) / 1000));
        if (dom.focusToggleBtn) dom.focusToggleBtn.innerHTML = '⏸ Pause';
    } else {
        focusTimeLeft = focusTimerData.pausedLeft;
        if (dom.focusToggleBtn) dom.focusToggleBtn.innerHTML = '▶ Start';
    }
    updateFocusDisplay();
}

function updateFocusDisplay() {
    if (!dom.cardFocusTime) return;
    const m = Math.floor(focusTimeLeft / 60).toString().padStart(2, '0');
    const s = (focusTimeLeft % 60).toString().padStart(2, '0');
    dom.cardFocusTime.textContent = `${m}:${s}`;
}
