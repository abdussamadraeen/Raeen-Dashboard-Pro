import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import { StorageManager } from '../../../store/storage';
import { AppItem } from '../../../validation/settingsSchema';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const themeLibrary = {
  'Abstract': [
    { name: 'Crystal', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Fluid', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Geometric', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=80' }
  ],
  'Animals': [
    { name: 'Cat', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Dog', url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Wild Animal', url: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Tiger', url: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=1920&q=80' }
  ],
  'Nature & Ocean': [
    { name: 'Flower', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Island', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80' }
  ],
  'Space & Travel': [
    { name: 'Space', url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Travel', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Nebula', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Cityscape', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1920&q=80' }
  ],
  'Special': [
    { name: 'Forza Horizon', url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1920&q=80' },
    { name: 'Neural (Interactive)', url: 'canvas:neural' },
    { name: 'Bubbles (Interactive)', url: 'canvas:bubbles' },
    { name: 'Rain (Interactive)', url: 'canvas:rain' },
    { name: 'Animated GIF', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2I4Y2M1N2YyYzhjYjYyYjYyYjYyYjYyYjYyJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxu5L9Yx7u8/giphy.gif' }
  ]
};

const gradientPresets = [
  'linear-gradient(135deg, #0f0f17 0%, #1a1a28 100%)',
  'linear-gradient(135deg, #7b61ff 0%, #1a1a28 100%)',
  'linear-gradient(135deg, #6366f1 0%, #000000 100%)',
  'linear-gradient(135deg, #0d9488 0%, #111827 100%)',
  'linear-gradient(135deg, #db2777 0%, #030712 100%)',
  'linear-gradient(135deg, #d97706 0%, #1f2937 100%)',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useDashboardStore();
  const [activeTab, setActiveTab] = useState<'general' | 'background' | 'shortcuts' | 'advanced'>('general');
  const [bingWallpapers, setBingWallpapers] = useState<Array<{ url: string; thumb: string; name: string }>>([]);
  const [loadingBing, setLoadingBing] = useState(false);

  // Shortcuts tab form states
  const [scName, setScName] = useState('');
  const [scUrl, setScUrl] = useState('');

  // Expanded galleries states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Abstract': true,
    'Animals': false,
    'Nature & Ocean': false,
    'Space & Travel': false,
    'Special': true,
  });

  useEffect(() => {
    if (isOpen && activeTab === 'background') {
      loadBingGallery();
    }
  }, [isOpen, activeTab]);

  const loadBingGallery = async () => {
    setLoadingBing(true);
    try {
      const mkt = navigator.language || 'en-US';
      const res = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=${mkt}`);
      const data = await res.json();
      const images = data.images || [];
      const mapped = images.map((img: any, i: number) => ({
        url: `https://www.bing.com${img.urlbase}_UHD.jpg`,
        thumb: `https://www.bing.com${img.urlbase}_400x240.jpg`,
        name: i === 0 ? 'Daily Wallpaper' : `Previous Day ${i}`,
      }));
      setBingWallpapers(mapped);
    } catch (e) {
      console.error('Failed to load Bing daily wallpapers:', e);
    } finally {
      setLoadingBing(false);
    }
  };

  const optimizeImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        return resolve(file);
      }
      if (file.type === 'image/gif') {
        return resolve(file);
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX_WIDTH = 2560;
        const MAX_HEIGHT = 1440;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const widthRatio = MAX_WIDTH / width;
          const heightRatio = MAX_HEIGHT / height;
          const bestRatio = Math.min(widthRatio, heightRatio);
          width = Math.round(width * bestRatio);
          height = Math.round(height * bestRatio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }

        const outputType = 'image/jpeg';
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, { type: outputType });
            resolve(optimizedFile);
          } else {
            resolve(file);
          }
        }, outputType, 0.85);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  };

  const handleLocalBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    try {
      if (StorageManager.isReady()) {
        if (file.type.startsWith('image/') && file.type !== 'image/gif') {
          try {
            file = await optimizeImage(file);
          } catch (err) {
            console.warn('Image optimization failed, saving original', err);
          }
        }
        await StorageManager.set('mediaStore', 'localBackground', {
          data: file,
          type: file.type,
          timestamp: Date.now(),
        });
        await updateSettings({
          backgroundType: 'local',
          backgroundValue: 'local_' + Date.now(),
        });
      }
    } catch (err) {
      console.error('Error saving local background:', err);
    }
  };

  const handleAddShortcut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scName.trim() || !scUrl.trim()) return;

    let url = scUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const newShortcut: AppItem = {
      name: scName.trim(),
      url,
      icon: '',
    };

    const updated = [...(settings.shortcuts || []), newShortcut];
    await updateSettings({ shortcuts: updated });
    setScName('');
    setScUrl('');
  };

  const handleRemoveShortcut = async (index: number) => {
    const updated = (settings.shortcuts || []).filter((_, i) => i !== index);
    await updateSettings({ shortcuts: updated });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Dashboard Settings</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Sidebar */}
          <div className="modal-sidebar">
            <button
              className={`sidebar-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
              </svg>
              General
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'background' ? 'active' : ''}`}
              onClick={() => setActiveTab('background')}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
              Background
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
              Shortcuts
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'advanced' ? 'active' : ''}`}
              onClick={() => setActiveTab('advanced')}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.63-3.6-3.6 0-1.98 1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6c0 1.98-1.62 3.6-3.6 3.6z" />
              </svg>
              Advanced
            </button>
          </div>

          {/* Modal Content */}
          <div className="modal-content">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="tab-pane active">
                <div className="card-container">
                  <div className="settings-row">
                    <span>Show Search Widget</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.showSearch}
                        onChange={(e) => updateSettings({ showSearch: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  {settings.showSearch && (
                    <>
                      <div className="settings-row">
                        <span>Search Engine</span>
                        <select
                          className="custom-select max-w-[180px]"
                          value={settings.searchEngine}
                          onChange={(e) => updateSettings({ searchEngine: e.target.value })}
                        >
                          <option value="google">Google</option>
                          <option value="bing">Bing</option>
                          <option value="custom">Custom URL</option>
                        </select>
                      </div>

                      {settings.searchEngine === 'custom' && (
                        <div className="settings-row flex-col items-start gap-2">
                          <span>Custom Search URL (%s represents query)</span>
                          <input
                            type="text"
                            className="text-input"
                            value={settings.customSearchUrl}
                            onChange={(e) => updateSettings({ customSearchUrl: e.target.value })}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="card-container">
                  <div className="settings-row">
                    <span>Show Clock Widget</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.showClock}
                        onChange={(e) => updateSettings({ showClock: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  {settings.showClock && (
                    <div className="settings-row">
                      <span>Clock Format</span>
                      <select
                        className="custom-select max-w-[180px]"
                        value={settings.clockFormat}
                        onChange={(e) => updateSettings({ clockFormat: e.target.value as any })}
                      >
                        <option value="auto">Auto / System</option>
                        <option value="12h">12-Hour Format</option>
                        <option value="24h">24-Hour Format</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="card-container">
                  <div className="settings-row">
                    <span>Show Productivity Cards</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.showCards}
                        onChange={(e) => updateSettings({ showCards: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  {settings.showCards && (
                    <>
                      <div className="settings-row pl-4">
                        <span>Show Calendar Date Card</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={settings.showCardDate}
                            onChange={(e) => updateSettings({ showCardDate: e.target.checked })}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>

                      <div className="settings-row pl-4">
                        <span>Show Focus Pomodoro Card</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={settings.showCardFocus}
                            onChange={(e) => updateSettings({ showCardFocus: e.target.checked })}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>

                      <div className="settings-row pl-4">
                        <span>Show Markdown Notepad Card</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={settings.showCardNote}
                            onChange={(e) => updateSettings({ showCardNote: e.target.checked })}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div className="card-container">
                  <div className="settings-row">
                    <span>Show Ambient HUD CDI Borders</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.showNoosphereBar}
                        onChange={(e) => updateSettings({ showNoosphereBar: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  <div className="settings-row">
                    <span>Theme Preference</span>
                    <select
                      className="custom-select max-w-[180px]"
                      value={settings.themePreference}
                      onChange={(e) => updateSettings({ themePreference: e.target.value as any })}
                    >
                      <option value="dark">Dark Theme</option>
                      <option value="light">Light Theme</option>
                      <option value="system">Follow System</option>
                    </select>
                  </div>

                  <div className="settings-row">
                    <span>Enable Immersive Mode (Hide main HUD)</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={!settings.showMainUI}
                        onChange={(e) => updateSettings({ showMainUI: !e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                  {!settings.showMainUI && (
                    <div className="settings-row pl-4">
                      <span>Show settings gear in Immersive mode</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.showSettingsButtonInImmersive}
                          onChange={(e) => updateSettings({ showSettingsButtonInImmersive: e.target.checked })}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BACKGROUND TAB */}
            {activeTab === 'background' && (
              <div className="tab-pane active">
                <div className="card-container">
                  <div className="settings-row">
                    <span>Background Source</span>
                    <select
                      className="custom-select max-w-[200px]"
                      value={settings.backgroundType}
                      onChange={(e) => {
                        const type = e.target.value as any;
                        let val = settings.backgroundValue;
                        if (type === 'solid') val = '#000000';
                        else if (type === 'bing') val = 'bing_latest';
                        else if (type === 'canvas') val = settings.canvasStyle;
                        updateSettings({ backgroundType: type, backgroundValue: val });
                      }}
                    >
                      <option value="solid">Solid / Gradients</option>
                      <option value="bing">Bing Daily Wallpaper</option>
                      <option value="preset">Preset Wallpapers</option>
                      <option value="canvas">Interactive Canvas Particles</option>
                      <option value="custom">Custom Image/Video URL</option>
                      <option value="local">Local File Upload</option>
                      <option value="google_dashboard">Live Google Iframe</option>
                      <option value="bing_dashboard">Live Bing Iframe</option>
                    </select>
                  </div>

                  {/* Video settings */}
                  {(settings.backgroundType === 'preset' || settings.backgroundType === 'custom' || settings.backgroundType === 'local') && (
                    <div className="settings-row">
                      <span>Mute Video Background Audio</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.videoMuted}
                          onChange={(e) => updateSettings({ videoMuted: e.target.checked })}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  )}
                </div>

                {/* SOLID OPTIONS */}
                {settings.backgroundType === 'solid' && (
                  <div className="card-container p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                      Preset Gradients
                    </label>
                    <div className="color-palette mb-4">
                      {gradientPresets.map((g) => (
                        <div
                          key={g}
                          className="color-swatch"
                          style={{ background: g, border: settings.backgroundValue === g ? '2px solid var(--accent)' : '' }}
                          onClick={() => updateSettings({ backgroundValue: g })}
                        ></div>
                      ))}
                    </div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                      Custom Hex Color Picker
                    </label>
                    <input
                      type="color"
                      className="w-16 h-10 cursor-pointer rounded-lg bg-transparent border-0"
                      value={settings.backgroundValue.startsWith('#') ? settings.backgroundValue : '#000000'}
                      onChange={(e) => updateSettings({ backgroundValue: e.target.value })}
                    />
                  </div>
                )}

                {/* BING OPTIONS */}
                {settings.backgroundType === 'bing' && (
                  <div className="card-container p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                      Bing UHD Wallpaper History
                    </label>
                    {loadingBing ? (
                      <p className="text-xs text-[var(--text-secondary)]">Fetching gallery...</p>
                    ) : (
                      <div className="bing-gallery-grid">
                        {bingWallpapers.map((img, i) => {
                          const isCurrent = settings.backgroundValue === (i === 0 ? 'bing_latest' : img.url);
                          return (
                            <div
                              key={img.url}
                              className="relative cursor-pointer group"
                              onClick={() => updateSettings({ backgroundValue: i === 0 ? 'bing_latest' : img.url })}
                            >
                              <img
                                src={img.thumb}
                                alt={img.name}
                                className={`bing-thumb ${isCurrent ? 'active' : ''}`}
                              />
                              <span className="block text-[10px] text-center mt-1 text-[var(--text-secondary)] group-hover:text-[var(--accent)]">
                                {img.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* PRESET OPTIONS */}
                {settings.backgroundType === 'preset' && (
                  <div className="card-container p-4">
                    <div className="theme-store-container">
                      {Object.entries(themeLibrary).map(([section, items]) => {
                        const isExpanded = expandedSections[section];
                        return (
                          <div key={section} className="flex flex-col gap-2">
                            <div
                              className="theme-section-header"
                              onClick={() => toggleSection(section)}
                            >
                              <span>{section}</span>
                              <svg
                                viewBox="0 0 24 24"
                                width="16"
                                height="16"
                                fill="currentColor"
                                style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }}
                              >
                                <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                              </svg>
                            </div>

                            {isExpanded && (
                              <div className="theme-section-grid">
                                {items.map((t) => {
                                  const isCurrent = settings.backgroundValue === t.url || (t.url.startsWith('canvas:') && settings.backgroundType === 'canvas' && settings.canvasStyle === t.url.split(':')[1]);
                                  const isVideo = t.url.match(/\.(mp4|webm|ogg)$/i);
                                  const isCanvas = t.url.startsWith('canvas:');
                                  let style: React.CSSProperties = { backgroundImage: `url('${t.url}')` };

                                  if (isCanvas) {
                                    style = { background: 'linear-gradient(135deg, var(--accent), #000)' };
                                  } else if (isVideo) {
                                    style = { background: '#000000' };
                                  }

                                  return (
                                    <div
                                      key={t.name}
                                      className="theme-item"
                                      onClick={async () => {
                                        if (isCanvas) {
                                          await updateSettings({
                                            backgroundType: 'canvas',
                                            canvasStyle: t.url.split(':')[1],
                                            backgroundValue: t.url.split(':')[1],
                                          });
                                        } else {
                                          await updateSettings({
                                            backgroundType: 'preset',
                                            backgroundValue: t.url,
                                          });
                                        }
                                      }}
                                    >
                                      <div
                                        className={`theme-thumb ${isCurrent ? 'border-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]' : ''}`}
                                        style={style}
                                      >
                                        {isVideo && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="white" className="opacity-60">
                                              <path d="M8 5v14l11-7z" />
                                            </svg>
                                          </div>
                                        )}
                                        {isCanvas && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="white" className="opacity-60">
                                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      <span className="theme-name">{t.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CANVAS OPTIONS */}
                {settings.backgroundType === 'canvas' && (
                  <div className="card-container p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                      Particle Engine Visual Style
                    </label>
                    <select
                      className="custom-select"
                      value={settings.canvasStyle}
                      onChange={(e) => updateSettings({ canvasStyle: e.target.value, backgroundValue: e.target.value })}
                    >
                      <option value="neural">Neural Network / Constellations</option>
                      <option value="bubbles">Bokeh Floating Bubbles</option>
                      <option value="rain">Cyberpunk Neon Rain Matrix</option>
                    </select>
                  </div>
                )}

                {/* CUSTOM OPTIONS */}
                {settings.backgroundType === 'custom' && (
                  <div className="card-container p-4 flex flex-col gap-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Custom Image/Video URL
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Paste direct link to .jpg, .png, or .mp4/.webm video file"
                      value={settings.backgroundValue.startsWith('http') ? settings.backgroundValue : ''}
                      onChange={(e) => updateSettings({ backgroundValue: e.target.value })}
                    />
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      For videos, direct URLs ending in .mp4 or .webm work best. Loop and autoplay are enabled.
                    </p>
                  </div>
                )}

                {/* LOCAL OPTIONS */}
                {settings.backgroundType === 'local' && (
                  <div className="card-container p-4 flex flex-col gap-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Upload Wallpaper File (Stays Offline)
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleLocalBgUpload}
                      className="text-input text-xs"
                    />
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      Your uploaded image or video is saved inside IndexedDB browser storage (100% private & local).
                    </p>
                    {settings.backgroundValue && (
                      <p className="text-xs text-[var(--text-secondary)] font-semibold mt-1">
                        Active File: {settings.backgroundValue}
                      </p>
                    )}
                  </div>
                )}

                {/* LIVE DIRECT DIRECTIVE SWITCH PANES */}
                {(settings.backgroundType === 'google_dashboard' || settings.backgroundType === 'bing_dashboard') && (
                  <div className="card-container p-4">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Immersive mode enabled. The background is a fully active {settings.backgroundType === 'google_dashboard' ? 'Google' : 'Bing'} homepage frame. Moving your mouse around will let you search and click on items interactively! Click the bottom-left gear settings icon anytime to open this settings menu.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SHORTCUTS TAB */}
            {activeTab === 'shortcuts' && (
              <div className="tab-pane active">
                <div className="card-container p-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                    Shortcuts Source List
                  </label>
                  <select
                    className="custom-select"
                    value={settings.topSitesSource}
                    onChange={(e) => updateSettings({ topSitesSource: e.target.value as any })}
                  >
                    <option value="favorites">My Custom Shortcuts List</option>
                    <option value="custom">Chrome Browser Top Sites (Auto)</option>
                  </select>
                </div>

                {settings.topSitesSource === 'favorites' && (
                  <>
                    <form onSubmit={handleAddShortcut} className="card-container p-4 flex flex-col gap-3">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Add Custom Quick Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="text-input flex-1"
                          placeholder="Shortcut Name"
                          value={scName}
                          onChange={(e) => setScName(e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          className="text-input flex-2"
                          placeholder="URL (e.g. github.com)"
                          value={scUrl}
                          onChange={(e) => setScUrl(e.target.value)}
                          required
                        />
                        <button type="submit" className="primary-btn shrink-0 text-xs">
                          Add Link
                        </button>
                      </div>
                    </form>

                    <div className="card-container p-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                        Manage Custom Links ({settings.shortcuts?.length || 0})
                      </label>
                      <div className="managed-list">
                        {(settings.shortcuts || []).map((sc, i) => (
                          <div key={`${sc.url}-${i}`} className="managed-item">
                            <div className="flex flex-col min-w-0">
                              <strong className="text-sm text-[var(--text-primary)] truncate">{sc.name}</strong>
                              <span className="text-[10px] text-[var(--text-secondary)] truncate">{sc.url}</span>
                            </div>
                            <div className="managed-item-actions">
                              <button
                                type="button"
                                onClick={() => handleRemoveShortcut(i)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!settings.shortcuts || settings.shortcuts.length === 0) && (
                          <p className="text-xs text-[var(--text-secondary)] text-center py-4 opacity-60">
                            No custom shortcuts configured.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {settings.topSitesSource === 'custom' && (
                  <div className="card-container p-4">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Chrome Top Sites mode displays your most frequently visited sites automatically based on your browser history. You can switch back to "My Custom Shortcuts List" above to manage your own personalized links manually.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === 'advanced' && (
              <div className="tab-pane active">
                <div className="card-container p-4 flex flex-col gap-4">
                  <div>
                    <strong className="text-sm font-semibold block text-[var(--text-primary)]">
                      Reset Extension Configuration
                    </strong>
                    <span className="text-xs text-[var(--text-secondary)] block mt-1 leading-relaxed">
                      Would you like to restore all default settings? Your custom notes and media caches will not be touched, but layout switches, wallappers, clock preferences and shortcuts will revert to factory values.
                    </span>
                    <button
                      className="note-delete-btn mt-3 !px-4 !py-2 text-xs"
                      onClick={async () => {
                        if (confirm('Are you sure you want to reset all settings to defaults?')) {
                          await resetSettings();
                          alert('Settings successfully restored to defaults!');
                        }
                      }}
                    >
                      Reset All Settings
                    </button>
                  </div>

                  <hr className="border-[var(--border)]" />

                  <div>
                    <strong className="text-sm font-semibold block text-[var(--text-primary)]">
                      Performance & Privacy
                    </strong>
                    <span className="text-xs text-[var(--text-secondary)] block mt-1 leading-relaxed">
                      This extension runs 100% offline. All settings are validated securely on-device using Zod schemas, state is managed dynamically via Zustand sync stores, and high-performance backgrounds render on low-level HTML5 canvas threads to preserve laptop battery lives.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
