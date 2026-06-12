import { state, saveSettings } from './state.js';
import { dom } from './dom.js';
import { StorageManager } from './storage.js';
import { themeLibrary } from './themes.js';
import { CanvasEngine } from './canvas.js';

let currentSettingsState = {
    backgroundType: null,
    backgroundValue: null,
    canvasStyle: null
};
let currentBgObjectURL = null;

export function cleanupBackground() {
    if (dom.bgLayer) {
        const video = dom.bgLayer.querySelector('video');
        if (video) {
            video.pause();
            video.src = '';
            try {
                video.load();
            } catch (e) {}
        }
        dom.bgLayer.innerHTML = '';
        dom.bgLayer.style.backgroundImage = '';
        dom.bgLayer.style.backgroundColor = 'transparent';
    }
    if (currentBgObjectURL) {
        URL.revokeObjectURL(currentBgObjectURL);
        currentBgObjectURL = null;
    }
}

export async function applySettings() {
    document.title = state.settings.dashboardTitle || 'New Tab';
    document.documentElement.setAttribute('data-theme', state.settings.themePreference);
    document.body.classList.toggle('drag-drop-disabled', state.settings.enableDragAndDrop === false);

    let bgType = state.settings.backgroundType;
    const bgValue = state.settings.backgroundValue;
    const canvasStyle = state.settings.canvasStyle || 'neural';

    // Always ensure the background layer is ready to show
    if (dom.bgLayer) {
        dom.bgLayer.style.opacity = '1';
    }

    if (currentSettingsState.backgroundType !== bgType || 
        currentSettingsState.backgroundValue !== bgValue ||
        (bgType === 'canvas' && currentSettingsState.canvasStyle !== canvasStyle)) {
        
        // Only do full cleanup if switching background types (e.g. video to image)
        // or if switching from canvas. If just changing image, don't clear old one yet.
        const typeChanged = currentSettingsState.backgroundType !== bgType;
        if (typeChanged || bgType === 'canvas' || currentSettingsState.backgroundType === 'canvas') {
            cleanupBackground();
            CanvasEngine.stop();
            if (dom.canvasLayer) dom.canvasLayer.classList.add('hidden');
        }

        currentSettingsState.backgroundType = bgType;
        currentSettingsState.backgroundValue = bgValue;
        currentSettingsState.canvasStyle = canvasStyle;

        if (bgType === 'canvas') {
            if (dom.canvasLayer) {
                dom.canvasLayer.classList.remove('hidden');
                CanvasEngine.init(dom.canvasLayer, state.settings.canvasStyle || 'neural');
            }
            if (dom.bgLayer) {
                dom.bgLayer.style.backgroundImage = 'none';
                dom.bgLayer.style.backgroundColor = 'transparent';
            }
        } else {
            switch (bgType) {
            case 'bing':
                let bingUrl = null;
                const mkt = navigator.language || 'en-US';
                if (bgValue === 'bing_latest') {
                    const cached = await StorageManager.get('mediaStore', 'bing_latest');
                    const todayStr = new Date().toDateString();
                    const cachedDayStr = cached?.timestamp ? new Date(cached.timestamp).toDateString() : '';
                    if (cached && todayStr === cachedDayStr) {
                        bingUrl = cached.url;
                    }
                } else {
                    bingUrl = bgValue;
                }

                if (bingUrl) {
                    dom.bgLayer.style.backgroundImage = `url('${bingUrl}')`;
                } else {
                    try {
                        const res = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=${mkt}`);
                        const data = await res.json();
                        const url = `https://www.bing.com${data.images[0].urlbase}_UHD.jpg`;
                        await StorageManager.set('mediaStore', 'bing_latest', { url: url, timestamp: Date.now() });
                        dom.bgLayer.style.backgroundImage = `url('${url}')`;
                    } catch (e) {
                        console.error("Failed to fetch Bing image", e);
                        // Fallback to old cached image if fetch failed
                        const cached = await StorageManager.get('mediaStore', 'bing_latest');
                        if (cached?.url) {
                            dom.bgLayer.style.backgroundImage = `url('${cached.url}')`;
                        }
                    }
                }
                break;
            case 'preset':
            case 'custom':
                if (bgValue) {
                    if (bgValue.match(/\.(mp4|webm|ogg)$/i)) {
                        dom.bgLayer.innerHTML = `<video autoplay muted loop playsinline preload="auto" src="${bgValue}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>`;
                        const video = dom.bgLayer.querySelector('video');
                        if (video) {
                            video.muted = state.settings.videoMuted;
                            video.volume = 1.0;
                            video.play().catch(e => console.warn("Video play failed", e));
                        }
                    } else {
                        dom.bgLayer.style.backgroundImage = `url('${bgValue}')`;
                    }
                }
                break;
            case 'local':
                const localMedia = await StorageManager.get('mediaStore', 'localBackground');
                if (localMedia?.data) {
                    currentBgObjectURL = URL.createObjectURL(localMedia.data);
                    if (localMedia.type?.startsWith('video')) {
                        dom.bgLayer.innerHTML = `<video autoplay muted loop playsinline preload="auto" src="${currentBgObjectURL}" type="${localMedia.type}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>`;
                        const video = dom.bgLayer.querySelector('video');
                        if (video) {
                            video.muted = state.settings.videoMuted;
                            video.volume = 1.0;
                            video.play().catch(e => console.warn("Local video play failed", e));
                        }
                    } else {
                        dom.bgLayer.innerHTML = `<img src="${currentBgObjectURL}" decoding="async" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" />`;
                    }
                }
                break;
            
            case 'google_dashboard':
                let googleSrc = "https://www.google.com/?raeen_dashboard=true";
                if (bgValue && (bgValue.includes("google.com") || bgValue.includes("google.co.in"))) {
                    try {
                        const urlObj = new URL(bgValue);
                        urlObj.searchParams.set("raeen_dashboard", "true");
                        googleSrc = urlObj.toString();
                    } catch {
                        googleSrc = bgValue + (bgValue.includes("?") ? "&" : "?") + "raeen_dashboard=true";
                    }
                }
                dom.bgLayer.innerHTML = `<iframe src="${googleSrc}" allow="forms; scripts; same-origin; popups; clipboard-write; gyp-eval; accelerometer; gyroscope;" style="width:100%;height:100%;border:none;pointer-events:auto;z-index:1;"></iframe>`;
                dom.bgLayer.style.backgroundImage = 'none';
                break;
                
            case 'bing_dashboard':
                let bingSrc = "https://www.bing.com/?raeen_dashboard=true";
                if (bgValue && (bgValue.includes("bing.com") || bgValue.includes("cn.bing.com"))) {
                    try {
                        const urlObj = new URL(bgValue);
                        urlObj.searchParams.set("raeen_dashboard", "true");
                        bingSrc = urlObj.toString();
                    } catch {
                        bingSrc = bgValue + (bgValue.includes("?") ? "&" : "?") + "raeen_dashboard=true";
                    }
                }
                dom.bgLayer.innerHTML = `<iframe src="${bingSrc}" allow="forms; scripts; same-origin; popups; clipboard-write; gyp-eval;" style="width:100%;height:100%;border:none;pointer-events:auto;z-index:1;"></iframe>`;
                dom.bgLayer.style.backgroundImage = 'none';
                break;

            case 'solid':
                if (bgValue && bgValue.includes('gradient')) {
                    dom.bgLayer.style.backgroundImage = bgValue;
                } else {
                    dom.bgLayer.style.backgroundColor = bgValue || 'transparent';
                    dom.bgLayer.style.backgroundImage = 'none';
                }
                break;
            }
        }
    } else {
        // Sync video muted state if nothing else changed
        const video = dom.bgLayer.querySelector('video');
        if (video) {
            video.muted = state.settings.videoMuted;
        }
    }

    // Video background class toggle & sound button visibility
    const hasVideo = dom.bgLayer.querySelector('video') !== null;
    document.body.classList.toggle('has-video-bg', hasVideo);
    if (dom.videoSoundBtn) {
        dom.videoSoundBtn.classList.toggle('hidden', !hasVideo);
        dom.videoSoundBtn.classList.toggle('muted', state.settings.videoMuted);
    }

    // Handle Live Background interaction (Immersive Mode)
    const isLive = bgType === 'google_dashboard' || bgType === 'bing_dashboard';
    document.body.classList.toggle('live-bg-active', isLive);

    // Hide all UI in Immersive Mode, except settings
    const hideUI = isLive;
    dom.searchWidget?.classList.toggle('hidden', hideUI || !state.settings.showSearch);
    const hasShortcuts = dom.topSitesWidget?.querySelectorAll('.shortcut').length > 0;
    dom.topSitesWidget?.classList.toggle('hidden', hideUI || !state.settings.showTopSites || !hasShortcuts);
    dom.cardsWidget?.classList.toggle('hidden', hideUI || !state.settings.showCards);
    dom.clockWidget?.style.setProperty('display', (hideUI || !state.settings.showClock) ? 'none' : 'flex');
    dom.notesWidget?.classList.toggle('hidden', hideUI || !state.settings.showCardNote);
    
    const showNoosphere = state.settings.showNoosphereBar && !hideUI;
    if (dom.cdiBar) dom.cdiBar.classList.toggle('hidden', !showNoosphere);
    if (dom.cdiBarRight) dom.cdiBarRight.classList.toggle('hidden', !showNoosphere);
    if (dom.cdiBarTop) dom.cdiBarTop.classList.toggle('hidden', !showNoosphere);
    if (dom.cdiBarBottom) dom.cdiBarBottom.classList.toggle('hidden', !showNoosphere);

    const isImmersive = !state.settings.showMainUI;
    document.body.classList.toggle('immersive-mode', isImmersive);

    dom.searchWidget?.classList.toggle('immersive-hidden', isImmersive);
    dom.topSitesWidget?.classList.toggle('immersive-hidden', isImmersive);
    dom.cardsWidget?.classList.toggle('immersive-hidden', isImmersive);
    dom.clockWidget?.classList.toggle('immersive-hidden', isImmersive);
    dom.appsLauncherBtn?.classList.toggle('immersive-hidden', isImmersive);
    dom.settingsBtn?.classList.toggle('immersive-hidden', isImmersive && !state.settings.showSettingsButtonInImmersive);
    // Force updating clock date visibility when settings are applied
    if (dom.clockDate) {
        const showTodayCard = state.settings.showCards && state.settings.showCardDate && !hideUI;
        if (showTodayCard) {
            dom.clockDate.style.display = "none";
        } else {
            dom.clockDate.style.display = "block";
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            dom.clockDate.textContent = new Date().toLocaleDateString(undefined, options);
        }
    }

    updateCards();
}

export function updateTime() {
    if (!dom.timeEl) return;
    const now = new Date();
    const currentMinute = now.getMinutes();
    
    // De-duplicate ticks if minutes haven't changed
    if (dom.timeEl._lastMin === currentMinute) return;
    dom.timeEl._lastMin = currentMinute;
    
    let h = now.getHours(), m = currentMinute;
    
    if (state.settings.clockFormat === 'auto') {
        const locale = navigator.language || 'en-US';
        let timeString = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
        dom.timeEl.textContent = timeString.replace(/\s?[AP]M/i, '').trim();
    } else {
        if (state.settings.clockFormat === '12h') {
            h = h % 12 || 12;
        }
        dom.timeEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    if (dom.clockDate) {
        const showTodayCard = state.settings.showCards && state.settings.showCardDate;
        if (showTodayCard) {
            dom.clockDate.style.display = "none";
        } else {
            dom.clockDate.style.display = "block";
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            dom.clockDate.textContent = now.toLocaleDateString(undefined, options);
        }
    }
}

export async function loadBingGallery() {
    if (!dom.bingGallery) return;
    dom.bingGallery.innerHTML = '<p class="subtext">Loading daily wallpapers...</p>';
    try {
        const mkt = navigator.language || 'en-US';
        const res = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=${mkt}`);
        const data = await res.json();
        const images = data.images || [];

        if (images.length > 0) {
            const latestUrl = `https://www.bing.com${images[0].urlbase}_UHD.jpg`;
            await StorageManager.set('mediaStore', 'bing_latest', { url: latestUrl, timestamp: Date.now() });
        }

        dom.bingGallery.innerHTML = images.map((img, i) => `
            <div class="bing-thumb-wrapper" style="cursor:pointer;" data-index="${i}" data-url="https://www.bing.com${img.urlbase}_UHD.jpg">
                <img src="https://www.bing.com${img.urlbase}_400x240.jpg" class="bing-thumb ${state.settings.backgroundValue === (i === 0 ? 'bing_latest' : 'https://www.bing.com' + img.urlbase + '_UHD.jpg') ? 'active' : ''}" style="width:100%; border-radius:8px;">
                <div style="font-size:0.6rem; text-align:center; margin-top:2px; color:var(--text-secondary);">${i === 0 ? 'Daily Wallpaper' : 'Previous Day'}</div>
            </div>
        `).join('');

        if (!dom.bingGallery._hasListener) {
            dom.bingGallery._hasListener = true;
            dom.bingGallery.addEventListener('click', (evt) => {
                const wrapper = evt.target.closest('.bing-thumb-wrapper');
                if (wrapper && dom.bingGallery.contains(wrapper)) {
                    const idx = parseInt(wrapper.dataset.index, 10);
                    state.settings.backgroundType = 'bing';
                    state.settings.backgroundValue = (idx === 0) ? 'bing_latest' : wrapper.dataset.url;
                    saveSettings(state.settings);
                }
            });
        }
    } catch (e) {
        dom.bingGallery.innerHTML = '<p class="subtext">Failed to fetch Bing gallery. Check your connection.</p>';
    }
}

export function syncSettingsUI() {
    if (!document.querySelector(`input[name="theme_preference"]`)) return;
    
    if (dom.dashboardTitleInput) {
        dom.dashboardTitleInput.value = state.settings.dashboardTitle || 'New Tab';
    }

    const themeRadio = document.querySelector(`input[name="theme_preference"][value="${state.settings.themePreference}"]`);
    if (themeRadio) themeRadio.checked = true;
    
    if (dom.showNoosphereToggle) dom.showNoosphereToggle.checked = state.settings.showNoosphereBar;
    if (dom.showSettingsInImmersiveToggle) dom.showSettingsInImmersiveToggle.checked = state.settings.showSettingsButtonInImmersive;
    if (dom.showMainUIToggle) dom.showMainUIToggle.checked = state.settings.showMainUI;

    if (dom.bgTypeSelect) dom.bgTypeSelect.value = state.settings.backgroundType;
    if (dom.canvasStyleSelect) dom.canvasStyleSelect.value = state.settings.canvasStyle || 'neural';
    syncBackgroundOptions();
    if (dom.bgCustomUrl) dom.bgCustomUrl.value = state.settings.backgroundType === 'custom' ? state.settings.backgroundValue : '';

    if (dom.toggleSearch) dom.toggleSearch.checked = state.settings.showSearch;
    const currentEngineRadio = document.querySelector(`input[name="search_engine"][value="${state.settings.searchEngine}"]`);
    if (currentEngineRadio) currentEngineRadio.checked = true;
    if (dom.customSearchUrlInput) dom.customSearchUrlInput.value = state.settings.customSearchUrl;

    if (dom.toggleTopSites) dom.toggleTopSites.checked = state.settings.showTopSites;
    const sourceRadio = document.querySelector(`input[name="topsites_source"][value="${state.settings.topSitesSource}"]`);
    if (sourceRadio) sourceRadio.checked = true;

    if (dom.toggleClock) dom.toggleClock.checked = state.settings.showClock;
    if (dom.clockFormatSelect) dom.clockFormatSelect.value = state.settings.clockFormat;

    if (dom.toggleCards) dom.toggleCards.checked = state.settings.showCards;
    if (dom.toggleCardDate) dom.toggleCardDate.checked = state.settings.showCardDate;
    if (dom.toggleCardFocus) dom.toggleCardFocus.checked = state.settings.showCardFocus;
    if (dom.toggleCardNote) dom.toggleCardNote.checked = state.settings.showCardNote;
    if (dom.toggleDragDrop) dom.toggleDragDrop.checked = state.settings.enableDragAndDrop;
}

export function syncBackgroundOptions() {
    if (!dom.bgTypeSelect) return;
    const type = dom.bgTypeSelect.value;
    if (dom.bgCanvasOptions) dom.bgCanvasOptions.classList.toggle('hidden', type !== 'canvas');
    if (dom.bgBingOptions) dom.bgBingOptions.classList.toggle('hidden', type !== 'bing');
    if (dom.bgPresetOptions) dom.bgPresetOptions.classList.toggle('hidden', type !== 'preset');
    if (dom.bgSolidOptions) dom.bgSolidOptions.classList.toggle('hidden', type !== 'solid');
    if (dom.bgLocalOptions) dom.bgLocalOptions.classList.toggle('hidden', type !== 'local');
    if (dom.bgCustomOptions) dom.bgCustomOptions.classList.toggle('hidden', type !== 'custom');
}

export function updateCards() {
    if (!state.settings.showCards) return;
    if (dom.cardDateEl) dom.cardDateEl.classList.toggle('hidden', !state.settings.showCardDate);
    if (dom.cardFocusEl) dom.cardFocusEl.classList.toggle('hidden', !state.settings.showCardFocus);
    if (dom.cardNoteEl) dom.cardNoteEl.classList.toggle('hidden', !state.settings.showCardNote);

    const now = new Date();
    if (dom.cardDateValue) dom.cardDateValue.textContent = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    if (dom.cardDateDay) dom.cardDateDay.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
}

export function renderThemeLibrary() {
    if (!dom.galleryGrid) return;
    dom.galleryGrid.innerHTML = '';
    Object.entries(themeLibrary).forEach(([section, items]) => {
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'theme-section-header';
        sectionHeader.innerHTML = `<span>${section}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`;
        dom.galleryGrid.appendChild(sectionHeader);

        const grid = document.createElement('div');
        grid.className = 'theme-section-grid';
        grid.innerHTML = items.map(t => {
            const isCanvas = t.url && t.url.startsWith('canvas:');
            const isVideo = t.url && t.url.match(/\.(mp4|webm|ogg)$/i);
            let thumbStyle = `background-image:url('${t.url}')`;
            
            if (isCanvas) {
                thumbStyle = `background: linear-gradient(135deg, var(--accent), #000); filter: hue-rotate(45deg);`;
            } else if (isVideo) {
                thumbStyle = `background: #000;`;
            }
            
            return `
                <div class="theme-item" data-url="${t.url}">
                    <div class="theme-thumb" style="${thumbStyle}">
                        ${isVideo ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="white" style="opacity:0.6"><path d="M8 5v14l11-7z"/></svg>' : ''}
                        ${isCanvas ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="white" style="opacity:0.6"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>' : ''}
                    </div>
                    <span class="theme-name">${t.name}</span>
                </div>
            `;
        }).join('');
        dom.galleryGrid.appendChild(grid);
    });

    if (!dom.galleryGrid._hasListener) {
        dom.galleryGrid._hasListener = true;
        dom.galleryGrid.addEventListener('click', (evt) => {
            const header = evt.target.closest('.theme-section-header');
            if (header && dom.galleryGrid.contains(header)) {
                const grid = header.nextElementSibling;
                if (grid) {
                    const isHidden = grid.style.display === 'none';
                    grid.style.display = isHidden ? 'grid' : 'none';
                    const svg = header.querySelector('svg');
                    if (svg) {
                        svg.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
                    }
                }
                return;
            }

            const item = evt.target.closest('.theme-item');
            if (item && dom.galleryGrid.contains(item)) {
                const url = item.dataset.url;
                if (url.startsWith('canvas:')) {
                    state.settings.backgroundType = 'canvas';
                    state.settings.canvasStyle = url.split(':')[1];
                } else {
                    state.settings.backgroundType = 'preset';
                    state.settings.backgroundValue = url;
                }
                saveSettings(state.settings);
            }
        });
    }
}
