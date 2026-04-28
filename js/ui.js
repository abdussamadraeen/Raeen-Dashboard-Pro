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
    if (currentBgObjectURL) {
        URL.revokeObjectURL(currentBgObjectURL);
        currentBgObjectURL = null;
    }
    if (dom.bgLayer) {
        dom.bgLayer.innerHTML = '';
        dom.bgLayer.style.backgroundImage = '';
        dom.bgLayer.style.backgroundColor = 'transparent';
    }
}

export async function applySettings() {
    document.documentElement.setAttribute('data-theme', state.settings.themePreference);

    let bgType = state.settings.backgroundType;
    const bgValue = state.settings.backgroundValue;
    const canvasStyle = state.settings.canvasStyle || 'neural';

    // Cleanup legacy types
    if (bgType === 'google_dashboard' || bgType === 'bing_dashboard') {
        state.settings.backgroundType = 'canvas';
        bgType = 'canvas';
    }

    // Always ensure the background layer is ready to show
    dom.bgLayer.style.opacity = '1';

    if (currentSettingsState.backgroundType !== bgType || 
        currentSettingsState.backgroundValue !== bgValue ||
        (bgType === 'canvas' && currentSettingsState.canvasStyle !== canvasStyle)) {
        
        cleanupBackground();
        currentSettingsState.backgroundType = bgType;
        currentSettingsState.backgroundValue = bgValue;
        currentSettingsState.canvasStyle = canvasStyle;

        // Background Cleanup
        CanvasEngine.stop();
        if (dom.canvasLayer) dom.canvasLayer.classList.add('hidden');

        if (bgType === 'canvas') {
            if (dom.canvasLayer) {
                dom.canvasLayer.classList.remove('hidden');
                CanvasEngine.init(dom.canvasLayer, state.settings.canvasStyle || 'neural');
            }
            dom.bgLayer.style.backgroundImage = 'none';
            dom.bgLayer.style.backgroundColor = 'transparent';
        } else {
            switch (bgType) {
            case 'bing':
                const bingUrl = bgValue === 'bing_latest'
                    ? (await StorageManager.get('mediaStore', 'bing_latest'))?.url
                    : bgValue;
                if (bingUrl) {
                    dom.bgLayer.style.backgroundImage = `url('${bingUrl}')`;
                } else {
                    try {
                        const res = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1');
                        const data = await res.json();
                        const url = `https://www.bing.com${data.images[0].urlbase}_UHD.jpg`;
                        await StorageManager.set('mediaStore', 'bing_latest', { url: url, timestamp: Date.now() });
                        dom.bgLayer.style.backgroundImage = `url('${url}')`;
                    } catch (e) { console.error("Failed to fetch Bing image", e); }
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
                            video.play().catch(e => console.warn("Local video play failed", e));
                        }
                    } else {
                        dom.bgLayer.style.backgroundImage = `url('${currentBgObjectURL}')`;
                    }
                }
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

    // Sound button visibility
    if (dom.videoSoundBtn) {
        const hasVideo = dom.bgLayer.querySelector('video');
        dom.videoSoundBtn.classList.toggle('hidden', !hasVideo);
        dom.videoSoundBtn.classList.toggle('muted', state.settings.videoMuted);
    }

    dom.searchWidget?.classList.toggle('hidden', !state.settings.showSearch);
    dom.topSitesWidget?.classList.toggle('hidden', !state.settings.showTopSites);
    dom.cardsWidget?.classList.toggle('hidden', !state.settings.showCards);
    dom.clockWidget?.style.setProperty('display', state.settings.showClock ? 'flex' : 'none');

    const showNoosphere = state.settings.showNoosphereBar;
    dom.cdiBar?.classList.toggle('hidden', !showNoosphere);
    dom.cdiBarRight?.classList.toggle('hidden', !showNoosphere);
    dom.cdiBarTop?.classList.toggle('hidden', !showNoosphere);
    dom.cdiBarBottom?.classList.toggle('hidden', !showNoosphere);

    const isImmersive = !state.settings.showMainUI;
    document.body.classList.toggle('immersive-mode', isImmersive);

    dom.searchWidget?.classList.toggle('immersive-hidden', isImmersive);
    dom.topSitesWidget?.classList.toggle('immersive-hidden', isImmersive);
    dom.cardsWidget?.classList.toggle('immersive-hidden', isImmersive);
    dom.clockWidget?.classList.toggle('immersive-hidden', isImmersive);
    dom.appsLauncherBtn?.classList.toggle('immersive-hidden', isImmersive);
    dom.settingsBtn?.classList.toggle('immersive-hidden', isImmersive && !state.settings.showSettingsButtonInImmersive);

    updateCards();
}

export function updateTime() {
    if (!dom.timeEl) return;
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes();
    
    if (state.settings.clockFormat === 'auto') {
        const locale = navigator.language || 'en-US';
        let timeString = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
        dom.timeEl.textContent = timeString.replace(/\s?[AP]M/i, '').trim();
        return;
    }

    if (state.settings.clockFormat === '12h') {
        h = h % 12 || 12;
    }
    
    dom.timeEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function loadBingGallery() {
    if (!dom.bingGallery) return;
    dom.bingGallery.innerHTML = '<p class="subtext">Loading daily wallpapers...</p>';
    try {
        const mkt = navigator.language || 'en-US';
        const res = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=${mkt}`);
        const data = await res.json();
        const images = data.images || [];

        dom.bingGallery.innerHTML = images.map((img, i) => `
            <div class="bing-thumb-wrapper" style="cursor:pointer;" data-url="https://www.bing.com${img.urlbase}_UHD.jpg">
                <img src="https://www.bing.com${img.urlbase}_400x240.jpg" class="bing-thumb ${state.settings.backgroundValue === (i === 0 ? 'bing_latest' : 'https://www.bing.com' + img.urlbase + '_UHD.jpg') ? 'active' : ''}" style="width:100%; border-radius:8px;">
                <div style="font-size:0.6rem; text-align:center; margin-top:2px; color:var(--text-secondary);">${i === 0 ? 'Daily Wallpaper' : 'Previous Day'}</div>
            </div>
        `).join('');

        dom.bingGallery.querySelectorAll('.bing-thumb-wrapper').forEach((w, i) => w.addEventListener('click', () => {
            state.settings.backgroundType = 'bing';
            state.settings.backgroundValue = (i === 0) ? 'bing_latest' : w.dataset.url;
            saveSettings(state.settings);
        }));
    } catch (e) {
        dom.bingGallery.innerHTML = '<p class="subtext">Failed to fetch Bing gallery. Check your connection.</p>';
    }
}

export function syncSettingsUI() {
    if (!document.querySelector(`input[name="theme_preference"]`)) return;
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
    if (document.querySelector(`input[name="topsites_source"][value="${state.settings.topSitesSource}"]`)) {
        document.querySelector(`input[name="topsites_source"][value="${state.settings.topSitesSource}"]`).checked = true;
    }

    if (dom.toggleClock) dom.toggleClock.checked = state.settings.showClock;
    if (dom.clockFormatSelect) dom.clockFormatSelect.value = state.settings.clockFormat;

    if (dom.toggleCards) dom.toggleCards.checked = state.settings.showCards;
    if (dom.toggleCardDate) dom.toggleCardDate.checked = state.settings.showCardDate;
    if (dom.toggleCardFocus) dom.toggleCardFocus.checked = state.settings.showCardFocus;
    if (dom.toggleCardNote) dom.toggleCardNote.checked = state.settings.showCardNote;
}

export function syncBackgroundOptions() {
    const type = dom.bgTypeSelect.value;
    if (dom.bgCanvasOptions) dom.bgCanvasOptions.classList.toggle('hidden', type !== 'canvas');
    dom.bgBingOptions.classList.toggle('hidden', type !== 'bing');
    dom.bgPresetOptions.classList.toggle('hidden', type !== 'preset');
    dom.bgSolidOptions.classList.toggle('hidden', type !== 'solid');
    dom.bgLocalOptions.classList.toggle('hidden', type !== 'local');
    dom.bgCustomOptions.classList.toggle('hidden', type !== 'custom');
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
        grid.innerHTML = items.map(t => `
            <div class="theme-item" data-url="${t.url}">
                <div class="theme-thumb" style="background-image:url('${t.url}')"></div>
                <span class="theme-name">${t.name}</span>
            </div>
        `).join('');
        dom.galleryGrid.appendChild(grid);
    });

    dom.galleryGrid.querySelectorAll('.theme-section-header').forEach(header => {
        header.addEventListener('click', () => {
            const grid = header.nextElementSibling;
            const isHidden = grid.style.display === 'none';
            grid.style.display = isHidden ? 'grid' : 'none';
            header.querySelector('svg').style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });

    dom.galleryGrid.querySelectorAll('.theme-item').forEach(opt => opt.addEventListener('click', () => {
        const url = opt.dataset.url;
        if (url.startsWith('canvas:')) {
            state.settings.backgroundType = 'canvas';
            state.settings.canvasStyle = url.split(':')[1];
        } else {
            state.settings.backgroundType = 'preset';
            state.settings.backgroundValue = url;
        }
        saveSettings(state.settings);
    }));
}
