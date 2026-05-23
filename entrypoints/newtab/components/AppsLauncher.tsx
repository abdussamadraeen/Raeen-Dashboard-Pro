import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import { AppItem } from '../../../validation/settingsSchema';

type AppProvider = 'google' | 'microsoft' | 'ai' | 'custom';

export const AppsLauncher: React.FC = () => {
  const { settings, appsData, updateSettings, reorderPresetApps } = useDashboardStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppProvider>('google');
  
  // Custom app form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [appIcon, setAppIcon] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    setShowAddForm(false);
  };

  const handleAddCustomApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim() || !appUrl.trim()) return;

    let url = appUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const newApp: AppItem = {
      name: appName.trim(),
      url,
      icon: appIcon.trim() || undefined,
    };

    const updated = [...(settings.customApps || []), newApp];
    await updateSettings({ customApps: updated });

    // Reset form
    setAppName('');
    setAppUrl('');
    setAppIcon('');
    setShowAddForm(false);
  };

  const handleRemoveCustomApp = async (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = (settings.customApps || []).filter((_, i) => i !== index);
    await updateSettings({ customApps: updated });
  };

  // Preset Apps Drag & Drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number, provider: 'google' | 'microsoft') => {
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderPresetApps(provider, draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const getAppsList = (): AppItem[] => {
    switch (activeTab) {
      case 'google':
        return appsData.google || [];
      case 'microsoft':
        return appsData.microsoft || [];
      case 'ai':
        return settings.aiApps || [];
      case 'custom':
        return settings.customApps || [];
      default:
        return [];
    }
  };

  const appsList = getAppsList();

  return (
    <div ref={containerRef} className="top-right-widget" style={{ position: 'absolute', top: '30px', right: '40px', zIndex: 60 }}>
      {/* 3x3 Grid Icon Trigger Button */}
      <button
        id="apps-launcher-btn"
        className="icon-btn"
        onClick={toggleDropdown}
        title="App Launcher"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" />
        </svg>
      </button>

      {/* Launcher Dropdown Container */}
      <div id="apps-dropdown" className={`apps-dropdown ${isOpen ? '' : 'hidden'}`}>
        {/* Navigation Tabs */}
        <div className="apps-tabs">
          <button
            className={`app-tab ${activeTab === 'google' ? 'active' : ''}`}
            onClick={() => { setActiveTab('google'); setShowAddForm(false); }}
          >
            Google
          </button>
          <button
            className={`app-tab ${activeTab === 'microsoft' ? 'active' : ''}`}
            onClick={() => { setActiveTab('microsoft'); setShowAddForm(false); }}
          >
            Microsoft
          </button>
          <button
            className={`app-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ai'); setShowAddForm(false); }}
          >
            AI Apps
          </button>
          <button
            className={`app-tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => { setActiveTab('custom'); }}
          >
            Custom
          </button>
        </div>

        {/* Custom app add form inside custom tab */}
        {activeTab === 'custom' && showAddForm && (
          <form onSubmit={handleAddCustomApp} className="p-4 border-b border-[var(--border)] flex flex-col gap-2 bg-[var(--bg-element)]">
            <input
              type="text"
              placeholder="App Name"
              className="text-input"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="App URL (e.g. google.com)"
              className="text-input"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Icon URL (optional)"
              className="text-input"
              value={appIcon}
              onChange={(e) => setAppIcon(e.target.value)}
            />
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                className="focus-btn focus-btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="focus-btn focus-btn-primary"
              >
                Save App
              </button>
            </div>
          </form>
        )}

        {/* Dynamic App Grid Pane */}
        <div className="apps-grid app-pane active">
          {appsList.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] opacity-60">
              <span className="text-xs">No apps configured.</span>
              {activeTab === 'custom' && !showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="notes-add-btn mt-2"
                >
                  + Add Custom App
                </button>
              )}
            </div>
          ) : (
            appsList.map((app, index) => {
              let domain = 'google.com';
              try {
                domain = new URL(app.url).hostname;
              } catch (e) {}
              const fallbackIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
              const isDragSupported = activeTab === 'google' || activeTab === 'microsoft';

              return (
                <a
                  key={`${app.url}-${index}`}
                  href={app.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`app-item ${draggedIndex === index ? 'dragging' : ''}`}
                  draggable={isDragSupported}
                  onDragStart={() => isDragSupported && handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => isDragSupported && handleDrop(index, activeTab as 'google' | 'microsoft')}
                >
                  <img
                    src={app.icon || fallbackIcon}
                    alt={app.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackIcon;
                    }}
                  />
                  <span>{app.name}</span>

                  {/* Remove button for Custom apps */}
                  {activeTab === 'custom' && (
                    <button
                      className="remove-app-btn"
                      onClick={(e) => handleRemoveCustomApp(index, e)}
                      title="Remove App"
                    >
                      &times;
                    </button>
                  )}
                </a>
              );
            })
          )}
        </div>

        {/* More Links Footer */}
        {activeTab !== 'custom' && activeTab !== 'ai' && (
          <div className="p-3 border-t border-[var(--border)] text-center bg-[var(--bg-sidebar)]">
            <a
              id="more-apps-link"
              href={activeTab === 'google' ? 'https://about.google/products/' : 'https://www.microsoft.com/en-us/store/apps'}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {activeTab === 'google' ? 'More from Google' : 'More from Microsoft'}
            </a>
          </div>
        )}

        {/* Show add button in custom tab if form is hidden and items exist */}
        {activeTab === 'custom' && !showAddForm && appsList.length > 0 && (
          <div className="p-3 border-t border-[var(--border)] text-center bg-[var(--bg-sidebar)]">
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs text-[var(--accent)] hover:underline font-semibold"
            >
              + Add Custom App
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
