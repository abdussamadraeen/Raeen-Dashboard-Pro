import { dom } from './dom.js';

let focusTimeLeft = 25 * 60; // For display
let focusTimerData = { endTime: 0, pausedLeft: 25 * 60, isRunning: false };

export function initFocusTimer() {
    try {
        const stored = localStorage.getItem('raeen_dashboard_focus');
        if (stored) focusTimerData = JSON.parse(stored);
    } catch (e) { }

    syncFocusState();

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
                alert('Focus session complete!');
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
    try { localStorage.setItem('raeen_dashboard_focus', JSON.stringify(focusTimerData)); } catch (e) { }
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
