import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';

export const ClockWidget: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');
  const [ampmStr, setAmpmStr] = useState('');
  const clockFormat = useDashboardStore((state) => state.settings.clockFormat);
  const showClock = useDashboardStore((state) => state.settings.showClock);
  const showMainUI = useDashboardStore((state) => state.settings.showMainUI);
  const backgroundType = useDashboardStore((state) => state.settings.backgroundType);
  const showClockAmPm = useDashboardStore((state) => state.settings.showClockAmPm);

  useEffect(() => {
    if (!showClock) return;

    const updateTime = () => {
      const now = new Date();
      let formatted = '';
      let ampm = '';

      if (clockFormat === '24h') {
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        formatted = `${h}:${m}`;
        ampm = '';
      } else {
        ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        if (clockFormat === '12h') {
          const h = (now.getHours() % 12 || 12).toString().padStart(2, '0');
          const m = now.getMinutes().toString().padStart(2, '0');
          formatted = `${h}:${m}`;
        } else {
          const locale = navigator.language || 'en-US';
          const raw = now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
          const match = raw.match(/[AP]M/i);
          if (match) {
            ampm = match[0].toUpperCase();
            formatted = raw.replace(/\s?[AP]M/i, '').trim();
          } else {
            const h = now.getHours().toString().padStart(2, '0');
            const m = now.getMinutes().toString().padStart(2, '0');
            formatted = `${h}:${m}`;
            ampm = '';
          }
        }
      }

      setTimeStr(formatted);
      setAmpmStr(ampm);
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
      <h1 id="time" className="time text-8xl font-black tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] inline-flex items-start">
        <span className="time-digits">{timeStr}</span>
        {ampmStr && showClockAmPm !== false && <span className="time-ampm">{ampmStr}</span>}
      </h1>
    </div>
  );
};
