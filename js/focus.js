import { dom } from './dom.js';

let focusTimeLeft = 25 * 60; // For display
let focusTimerData = { endTime: 0, pausedLeft: 25 * 60, isRunning: false };

export function initFocusTimer() {
    // Load state from chrome storage for cross-tab sync
    chrome.storage.local.get(['raeen_dashboard_focus'], (result) => {
        if (result.raeen_dashboard_focus) {
            focusTimerData = result.raeen_dashboard_focus;
            syncFocusState();
        }
    });

    // Listen for changes from other tabs
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.raeen_dashboard_focus) {
            focusTimerData = changes.raeen_dashboard_focus.newValue;
            syncFocusState();
        }
    });

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
                // alert('Focus session complete!'); // Optional: user might find it annoying
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
    chrome.storage.local.set({ 'raeen_dashboard_focus': focusTimerData });
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
