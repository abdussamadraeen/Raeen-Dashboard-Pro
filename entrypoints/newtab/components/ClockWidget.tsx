import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';

export const ClockWidget: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');
  const clockFormat = useDashboardStore((state) => state.settings.clockFormat);
  const showClock = useDashboardStore((state) => state.settings.showClock);
  const showMainUI = useDashboardStore((state) => state.settings.showMainUI);
  const backgroundType = useDashboardStore((state) => state.settings.backgroundType);

  useEffect(() => {
    if (!showClock) return;

    const updateTime = () => {
      const now = new Date();
      let formatted = '';

      if (clockFormat === 'auto') {
        const locale = navigator.language || 'en-US';
        const str = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
        formatted = str.replace(/\s?[AP]M/i, '').trim();
      } else {
        let h = now.getHours();
        const m = now.getMinutes().toString().padStart(2, '0');

        if (clockFormat === '12h') {
          h = h % 12 || 12;
        }

        const hStr = h.toString().padStart(2, '0');
        formatted = `${hStr}:${m}`;
      }

      setTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [clockFormat, showClock]);

  const isLive = backgroundType === 'google_dashboard' || backgroundType === 'bing_dashboard';
  const hideUI = isLive;

  if (hideUI || !showClock || !showMainUI) {
    return null;
  }

  return (
    <div id="clock-widget" className="clock-widget select-none my-8 flex items-center justify-center">
      <h1 id="time" className="time text-8xl font-black tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        {timeStr}
      </h1>
    </div>
  );
};
