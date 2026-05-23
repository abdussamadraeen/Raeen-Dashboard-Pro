import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import { Timer } from 'lucide-react';

export const FocusTimer: React.FC = () => {
  const focusTimer = useDashboardStore((state) => state.focusTimer);
  const startFocusTimer = useDashboardStore((state) => state.startFocusTimer);
  const pauseFocusTimer = useDashboardStore((state) => state.pauseFocusTimer);
  const resetFocusTimer = useDashboardStore((state) => state.resetFocusTimer);
  const tickFocusTimer = useDashboardStore((state) => state.tickFocusTimer);
  
  const showCardFocus = useDashboardStore((state) => state.settings.showCardFocus);
  const showCards = useDashboardStore((state) => state.settings.showCards);
  const showMainUI = useDashboardStore((state) => state.settings.showMainUI);
  const backgroundType = useDashboardStore((state) => state.settings.backgroundType);

  const [timeLeft, setTimeLeft] = useState(25 * 60);

  // Synchronize timer display with Zustand focusTimer state
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (focusTimer.isRunning) {
      const calculateTimeLeft = () => {
        const left = Math.max(0, Math.floor((focusTimer.endTime - Date.now()) / 1000));
        setTimeLeft(left);

        if (left <= 0) {
          tickFocusTimer(); // Stop timer and reset
        }
      };

      calculateTimeLeft();
      interval = setInterval(calculateTimeLeft, 1000);
    } else {
      setTimeLeft(focusTimer.pausedLeft);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [focusTimer, tickFocusTimer]);

  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');

  const isLive = backgroundType === 'google_dashboard' || backgroundType === 'bing_dashboard';
  const hideUI = isLive;

  if (hideUI || !showCards || !showCardFocus || !showMainUI) {
    return null;
  }

  return (
    <div id="card-focus" className="info-card glass-premium rounded-2xl border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col gap-3 transition-all duration-300">
      <div className="info-card-header flex items-center gap-3">
        <div className="info-card-icon w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#5643cc] flex items-center justify-center shadow-[0_4px_12px_var(--accent-glow)] shrink-0">
          <Timer className="w-4 h-4 text-white" />
        </div>
        <span className="info-card-title text-xs font-semibold uppercase tracking-wider text-white/60">
          Focus Session
        </span>
      </div>

      <div className="info-card-content flex items-baseline gap-2">
        <span id="card-focus-time" className="info-card-value text-3xl font-bold tracking-tight text-white">
          {m}:{s}
        </span>
        <span className="info-card-sub text-xs text-white/50">
          Pomodoro
        </span>
      </div>

      <div className="focus-controls flex gap-2 w-full mt-1">
        <button
          id="focus-toggle-btn"
          onClick={focusTimer.isRunning ? pauseFocusTimer : startFocusTimer}
          className="focus-btn focus-btn-primary flex-1 py-2 rounded-lg font-semibold text-xs transition-all duration-200 bg-accent text-white shadow-[0_2px_8px_var(--accent-glow)] hover:shadow-[0_4px_14px_var(--accent-glow)] active:scale-95"
        >
          {focusTimer.isRunning ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          id="focus-reset-btn"
          onClick={resetFocusTimer}
          className="focus-btn focus-btn-secondary flex-1 py-2 rounded-lg font-semibold text-xs border border-white/20 bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all duration-200"
        >
          🔄 Reset
        </button>
      </div>
    </div>
  );
};
