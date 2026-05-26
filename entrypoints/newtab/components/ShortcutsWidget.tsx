import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import { AppItem } from '../../../validation/settingsSchema';

export const ShortcutsWidget: React.FC = () => {
  const { settings } = useDashboardStore();
  const [browserTopSites, setBrowserTopSites] = useState<AppItem[]>([]);

  useEffect(() => {
    if (settings.topSitesSource === 'custom' && typeof chrome !== 'undefined' && chrome.topSites) {
      chrome.topSites.get((sites: Array<{ title: string; url: string }>) => {
        const mapped = sites.slice(0, 8).map((site: { title: string; url: string }) => ({
          name: site.title,
          url: site.url,
          icon: `https://www.google.com/s2/favicons?sz=64&domain_url=${site.url}`,
        }));
        setBrowserTopSites(mapped);
      });
    }
  }, [settings.topSitesSource]);

  if (!settings.showTopSites) {
    return null;
  }

  const listToRender =
    settings.topSitesSource === 'favorites'
      ? settings.shortcuts || []
      : browserTopSites;

  return (
    <div id="top-sites-widget" className="quick-links">
      {listToRender.map((sc, i) => {
        const iconUrl = sc.icon || `https://www.google.com/s2/favicons?sz=64&domain_url=${sc.url}`;
        const firstLetter = sc.name ? sc.name.charAt(0).toUpperCase() : '?';

        return (
          <a
            key={`${sc.url}-${i}`}
            href={sc.url}
            className="shortcut"
            style={{ '--item-index': i } as React.CSSProperties}
          >
            {sc.icon === 'letter' ? (
              <div className="icon-placeholder">{firstLetter}</div>
            ) : (
              <img
                src={iconUrl}
                alt={sc.name}
                onError={(e) => {
                  // Fallback to letter icon on error
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'icon-placeholder';
                    placeholder.innerText = firstLetter;
                    parent.insertBefore(placeholder, parent.firstChild);
                  }
                }}
              />
            )}
            <span>{sc.name}</span>
          </a>
        );
      })}
    </div>
  );
};
