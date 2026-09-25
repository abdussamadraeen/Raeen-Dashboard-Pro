import { state, saveSettings } from './state.js';
import { dom } from './dom.js';
import { StorageManager } from './storage.js';
import { themeLibrary } from './themes.js';
import { CanvasEngine } from './canvas.js';

import { BRAVE_WALLPAPERS, OFFICIAL_BRAVE_WALLPAPERS, BraveWallpaperService } from './brave-wallpapers.js';
export { BRAVE_WALLPAPERS, OFFICIAL_BRAVE_WALLPAPERS, BraveWallpaperService };

let currentBraveWallpaper = null;

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
            } catch (e) {
                console.warn('Failed to load video element', e);
            }
        }
        const iframe = dom.bgLayer.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank';
            iframe.remove();
        }
        dom.bgLayer.innerHTML = '';
        dom.bgLayer.style.backgroundImage = '';
        dom.bgLayer.style.backgroundColor = 'transparent';
    }
    if (currentBgObjectURL) {
        URL.revokeObjectURL(currentBgObjectURL);
        currentBgObjectURL = null;
    }
    if (dom.photographerCredit) {
        dom.photographerCredit.classList.add('hidden');
    }
}

export async function applySettings() {
    const isLiveBg = state.settings.backgroundType === 'google_dashboard' || state.settings.backgroundType === 'bing_dashboard';
    if (!isLiveBg) {
        document.title = state.settings.dashboardTitle || 'New Tab';
    } else {
        const iframe = dom.bgLayer ? dom.bgLayer.querySelector('iframe') : null;
        if (!iframe || document.title === 'New Tab') {
            document.title = state.settings.dashboardTitle || 'New Tab';
        }
    }
    document.documentElement.setAttribute('data-theme', state.settings.themePreference);
    const currentDashboardMode = state.settings.dashboardMode || 'pro';
    document.documentElement.setAttribute('data-dashboard-mode', currentDashboardMode);
    document.body.setAttribute('data-dashboard-mode', currentDashboardMode);
    document.body.classList.toggle('dashboard-mode-minimal', currentDashboardMode === 'minimal');
    document.body.classList.toggle('drag-drop-disabled', state.settings.enableDragAndDrop === false || currentDashboardMode === 'minimal');

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
                CanvasEngine.init(dom.canvasLayer, state.settings.canvasStyle || 'neural', {
                    speed: state.settings.canvasSpeed ?? 1.0,
                    density: state.settings.canvasDensity ?? 1.0,
                    glow: state.settings.canvasGlow ?? 1.0
                });
            }
            if (dom.bgLayer) {
                dom.bgLayer.style.backgroundImage = 'none';
                dom.bgLayer.style.backgroundColor = 'transparent';
            }
        } else {
            switch (bgType) {
            case 'bing':
                let bingUrl = null;
                if (bgValue === 'bing_latest' || bgValue === 'bing_latest_v2') {
                    const cached = await StorageManager.get('mediaStore', 'bing_latest_v2');
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
                        const res = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1');
                        const data = await res.json();
                        const url = `https://www.bing.com${data.images[0].urlbase}_UHD.jpg`;
                        await StorageManager.set('mediaStore', 'bing_latest_v2', { url: url, timestamp: Date.now() });
                        dom.bgLayer.style.backgroundImage = `url('${url}')`;
                    } catch (e) {
                        console.error("Failed to fetch Bing image", e);
                        // Fallback to old cached image if fetch failed
                        const cached = await StorageManager.get('mediaStore', 'bing_latest_v2');
                        if (cached?.url) {
                            dom.bgLayer.style.backgroundImage = `url('${cached.url}')`;
                        }
                    }
                }
                break;
            case 'brave':
                let braveItem = null;
                const isRandomBrave = !bgValue || bgValue === 'brave_random';
                if (isRandomBrave) {
                    if (!currentBraveWallpaper) {
                        const lastIdx = parseInt(localStorage.getItem('last_brave_index') ?? '-1', 10);
                        let randIndex = Math.floor(Math.random() * BRAVE_WALLPAPERS.length);
                        if (BRAVE_WALLPAPERS.length > 1 && randIndex === lastIdx) {
                            randIndex = (randIndex + 1) % BRAVE_WALLPAPERS.length;
                        }
                        try { localStorage.setItem('last_brave_index', randIndex.toString()); } catch (e) { console.warn('Failed to save brave index', e); }
                        currentBraveWallpaper = BRAVE_WALLPAPERS[randIndex];
                    }
                    braveItem = currentBraveWallpaper;
                } else {
                    braveItem = BRAVE_WALLPAPERS.find(w => w.url === bgValue || w.id === bgValue) || {
                        title: 'Brave Curated',
                        photographer: 'Brave Curated',
                        url: bgValue
                    };
                    currentBraveWallpaper = braveItem;
                }

                if (braveItem?.url) {
                    const bgUrl = braveItem.url;
                    // Async pre-decode to prevent main thread frame drops
                    try {
                        const preloader = new Image();
                        preloader.decoding = 'async';
                        preloader.src = bgUrl;
                    } catch (e) {
                        console.warn('Image preloader failed', e);
                    }
                    dom.bgLayer.style.backgroundImage = `url('${bgUrl}')`;
                    try {
                        localStorage.setItem('raeen_bg_value', isRandomBrave ? 'brave_random' : bgUrl);
                    } catch (e) {
                        console.warn('Failed to save background to localStorage', e);
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
                dom.bgLayer.innerHTML = `<iframe src="${googleSrc}" allow="clipboard-write; accelerometer; gyroscope" style="width:100%;height:100%;border:none;pointer-events:auto;z-index:1;"></iframe>`;
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
                dom.bgLayer.innerHTML = `<iframe src="${bingSrc}" allow="clipboard-write; accelerometer; gyroscope" style="width:100%;height:100%;border:none;pointer-events:auto;z-index:1;"></iframe>`;
                dom.bgLayer.style.backgroundImage = 'none';
                break;

            case 'solid':
                const isLightMode = state.settings.themePreference === 'light' || document.documentElement.getAttribute('data-theme') === 'light';
                if (bgValue && bgValue.includes('gradient')) {
                    dom.bgLayer.style.backgroundImage = bgValue;
                    dom.bgLayer.style.backgroundColor = 'transparent';
                } else if (bgValue && bgValue !== '#0f0f17' && bgValue !== '#090d16' && bgValue !== '#f8fafc') {
                    dom.bgLayer.style.backgroundColor = bgValue;
                    dom.bgLayer.style.backgroundImage = 'none';
                } else {
                    dom.bgLayer.style.backgroundColor = isLightMode ? '#f8fafc' : '#090d16';
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

    if (!isLive) {
        document.documentElement.classList.remove('live-bg-pre-active');
        document.querySelectorAll('#raeen-preloader-style, #raeen-theme-preloader-style, #raeen-live-preloader-style, style[data-preloader]').forEach(el => el.remove());
        document.querySelectorAll('style').forEach(s => {
            if (s.textContent && s.textContent.includes('.container') && s.textContent.includes('display: none !important')) {
                s.remove();
            }
        });
    }

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

    // Brave Photographer Credit with verified original author attribution
    if (bgType === 'brave' && currentBraveWallpaper && !hideUI && !isImmersive) {
        if (dom.photographerCredit) {
            dom.photographerCredit.classList.remove('hidden');
            dom.photographerCredit.title = `${currentBraveWallpaper.title || 'Wallpaper'} by ${currentBraveWallpaper.photographer || 'Brave Curated'} (Verified Unsplash Contributor)`;
            initPhotographerCredit();
        }
        if (dom.photographerName) {
            dom.photographerName.textContent = currentBraveWallpaper.photographer || 'Brave Curated';
            if (dom.photographerName.tagName === 'A') {
                dom.photographerName.href = currentBraveWallpaper.link || 'https://unsplash.com';
                dom.photographerName.title = `View ${currentBraveWallpaper.photographer}'s work on Unsplash`;
            }
        }
    } else {
        if (dom.photographerCredit) {
            dom.photographerCredit.classList.add('hidden');
        }
    }

    updateCards();
}

export function updateTime() {
    if (!dom.timeEl) return;
    const now = new Date();
    const currentMinute = now.getMinutes();
    
    // Update cards with current minute/date
    updateCards();

    // De-duplicate time element re-render if minutes and format haven't changed
    const formatKey = `${state.settings.clockFormat}_${state.settings.showClockAmPm}`;
    if (dom.timeEl._lastMin === currentMinute && dom.timeEl._lastFormat === formatKey) return;
    dom.timeEl._lastMin = currentMinute;
    dom.timeEl._lastFormat = formatKey;
    
    let h = now.getHours(), m = currentMinute;
    let timeString = '';
    let ampm = '';

    if (state.settings.clockFormat === '24h') {
        timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        ampm = '';
    } else {
        ampm = h >= 12 ? 'PM' : 'AM';
        if (state.settings.clockFormat === '12h') {
            h = h % 12 || 12;
            timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        } else {
            // 'auto' format
            const locale = navigator.language || 'en-US';
            let rawTime = now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
            const match = rawTime.match(/[AP]M/i);
            if (match) {
                ampm = match[0].toUpperCase();
                timeString = rawTime.replace(/\s?[AP]M/i, '').trim();
            } else {
                timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                ampm = '';
            }
        }
    }

    const showAmPm = state.settings.showClockAmPm !== false;
    if (ampm && showAmPm) {
        dom.timeEl.innerHTML = `<span class="time-digits">${timeString}</span><span class="time-ampm">${ampm}</span>`;
    } else {
        dom.timeEl.innerHTML = `<span class="time-digits">${timeString}</span>`;
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
        const res = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8');
        const data = await res.json();
        const images = data.images || [];

        if (images.length > 0) {
            const latestUrl = `https://www.bing.com${images[0].urlbase}_UHD.jpg`;
            await StorageManager.set('mediaStore', 'bing_latest_v2', { url: latestUrl, timestamp: Date.now() });
        }

        dom.bingGallery.innerHTML = images.map((img, i) => `
            <div class="bing-thumb-wrapper" style="cursor:pointer;" data-index="${i}" data-url="https://www.bing.com${img.urlbase}_UHD.jpg">
                <img src="https://www.bing.com${img.urlbase}_400x240.jpg" class="bing-thumb ${state.settings.backgroundValue === (i === 0 ? 'bing_latest_v2' : 'https://www.bing.com' + img.urlbase + '_UHD.jpg') || (i === 0 && state.settings.backgroundValue === 'bing_latest') ? 'active' : ''}" style="width:100%; border-radius:8px;">
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
                    state.settings.backgroundValue = (idx === 0) ? 'bing_latest_v2' : wrapper.dataset.url;
                    saveSettings(state.settings);
                    applySettings();
                    loadBingGallery();
                }
            });
        }
    } catch (e) {
        dom.bingGallery.innerHTML = '<p class="subtext">Failed to fetch Bing gallery. Check your connection.</p>';
    }
}

export function loadBraveGallery() {
    if (!dom.braveGallery) return;

    const isRandom = !state.settings.backgroundValue || state.settings.backgroundValue === 'brave_random';
    if (dom.braveRandomToggle) {
        dom.braveRandomToggle.checked = isRandom;
    }

    dom.braveGallery.innerHTML = BRAVE_WALLPAPERS.map((item) => {
        const isActive = !isRandom && (state.settings.backgroundValue === item.url || state.settings.backgroundValue === item.id);
        return `
            <div class="brave-thumb-wrapper ${isActive ? 'active' : ''}" data-url="${item.url}" data-id="${item.id}" title="${item.title} by ${item.photographer}">
                <img src="${item.thumb}" class="brave-thumb-img" alt="${item.title}" loading="lazy" />
                <div class="brave-thumb-info">
                    <span class="brave-thumb-title">${item.title}</span>
                    <span class="brave-thumb-author">by ${item.photographer}</span>
                </div>
            </div>
        `;
    }).join('');

    if (!dom.braveGallery._hasListener) {
        dom.braveGallery._hasListener = true;
        dom.braveGallery.addEventListener('click', (evt) => {
            const wrapper = evt.target.closest('.brave-thumb-wrapper');
            if (wrapper && dom.braveGallery.contains(wrapper)) {
                const url = wrapper.dataset.url;
                state.settings.backgroundType = 'brave';
                state.settings.backgroundValue = url;
                currentBraveWallpaper = BRAVE_WALLPAPERS.find(w => w.url === url);
                saveSettings(state.settings);
                applySettings();
                loadBraveGallery();
            }
        });
    }

    if (dom.braveRandomToggle && !dom.braveRandomToggle._hasListener) {
        dom.braveRandomToggle._hasListener = true;
        dom.braveRandomToggle.addEventListener('change', (e) => {
            state.settings.backgroundType = 'brave';
            if (e.target.checked) {
                state.settings.backgroundValue = 'brave_random';
                currentBraveWallpaper = null; // force fresh random rotation
            } else {
                state.settings.backgroundValue = currentBraveWallpaper ? currentBraveWallpaper.url : BRAVE_WALLPAPERS[0].url;
            }
            saveSettings(state.settings);
            applySettings();
            loadBraveGallery();
        });
    }
}

export function initPhotographerCredit() {
    const cycleBtn = document.getElementById('next-wallpaper-btn');
    if (cycleBtn && !cycleBtn._hasListener) {
        cycleBtn._hasListener = true;
        cycleBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const next = await BraveWallpaperService.getNext(currentBraveWallpaper?.id || currentBraveWallpaper?.url);
            if (next) {
                currentBraveWallpaper = next;
                state.settings.backgroundType = 'brave';
                state.settings.backgroundValue = next.url;
                saveSettings(state.settings);
                applySettings();
                loadBraveGallery();
            }
        });
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
    if (dom.canvasSpeedSlider) {
        dom.canvasSpeedSlider.value = state.settings.canvasSpeed ?? 1.0;
        if (dom.canvasSpeedVal) dom.canvasSpeedVal.textContent = `${Number(state.settings.canvasSpeed ?? 1.0).toFixed(1)}×`;
    }
    if (dom.canvasDensitySlider) {
        dom.canvasDensitySlider.value = state.settings.canvasDensity ?? 1.0;
        if (dom.canvasDensityVal) dom.canvasDensityVal.textContent = `${Math.round((state.settings.canvasDensity ?? 1.0) * 100)}%`;
    }
    if (dom.canvasGlowSlider) {
        dom.canvasGlowSlider.value = state.settings.canvasGlow ?? 1.0;
        if (dom.canvasGlowVal) dom.canvasGlowVal.textContent = `${Math.round((state.settings.canvasGlow ?? 1.0) * 100)}%`;
    }
    syncBackgroundOptions();
    if (dom.bgCustomUrl) dom.bgCustomUrl.value = state.settings.backgroundType === 'custom' ? state.settings.backgroundValue : '';
    if (dom.braveRandomToggle) {
        dom.braveRandomToggle.checked = !state.settings.backgroundValue || state.settings.backgroundValue === 'brave_random';
    }
    if (state.settings.backgroundType === 'solid') {
        const currentBg = (state.settings.backgroundValue || '').trim().toLowerCase();
        if (dom.bgColorText) dom.bgColorText.value = state.settings.backgroundValue || '';
        if (dom.bgColorPicker && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(state.settings.backgroundValue || '')) {
            dom.bgColorPicker.value = state.settings.backgroundValue;
        }
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            const swatchColor = (swatch.dataset.color || '').trim().toLowerCase();
            swatch.classList.toggle('active', swatchColor === currentBg);
        });
    } else {
        document.querySelectorAll('.color-swatch').forEach(swatch => swatch.classList.remove('active'));
    }

    if (dom.toggleSearch) dom.toggleSearch.checked = state.settings.showSearch;
    const currentEngineRadio = document.querySelector(`input[name="search_engine"][value="${state.settings.searchEngine}"]`);
    if (currentEngineRadio) currentEngineRadio.checked = true;
    if (dom.customSearchUrlInput) dom.customSearchUrlInput.value = state.settings.customSearchUrl;

    if (dom.toggleTopSites) dom.toggleTopSites.checked = state.settings.showTopSites;
    const sourceRadio = document.querySelector(`input[name="topsites_source"][value="${state.settings.topSitesSource}"]`);
    if (sourceRadio) sourceRadio.checked = true;

    if (dom.toggleClock) dom.toggleClock.checked = state.settings.showClock;
    if (dom.clockFormatSelect) dom.clockFormatSelect.value = state.settings.clockFormat;
    if (dom.toggleClockAmPm) dom.toggleClockAmPm.checked = state.settings.showClockAmPm !== false;

    if (dom.toggleCards) dom.toggleCards.checked = state.settings.showCards;
    if (dom.toggleCardDate) dom.toggleCardDate.checked = state.settings.showCardDate;
    if (dom.toggleCardFocus) dom.toggleCardFocus.checked = state.settings.showCardFocus;
    if (dom.toggleCardNote) dom.toggleCardNote.checked = state.settings.showCardNote;
    if (dom.toggleCardSecurity) dom.toggleCardSecurity.checked = state.settings.showCardSecurity !== false;
    if (dom.toggleCardFileShare) dom.toggleCardFileShare.checked = state.settings.showCardFileShare !== false;
    if (dom.toggleCardDirectories) dom.toggleCardDirectories.checked = state.settings.showCardDirectories !== false;
    if (dom.toggleCardImageCompressor) dom.toggleCardImageCompressor.checked = state.settings.showCardImageCompressor === true;
    if (dom.toggleCardPdfTools) dom.toggleCardPdfTools.checked = state.settings.showCardPdfTools === true;
    if (dom.toggleDragDrop) dom.toggleDragDrop.checked = state.settings.enableDragAndDrop;

    // Render Dashboard Chooser Presets
    renderDashboardChooser();
}

export function syncBackgroundOptions() {
    if (!dom.bgTypeSelect) return;
    const type = dom.bgTypeSelect.value;
    if (dom.bgCanvasOptions) dom.bgCanvasOptions.classList.toggle('hidden', type !== 'canvas');
    if (dom.bgBingOptions) dom.bgBingOptions.classList.toggle('hidden', type !== 'bing');
    if (dom.bgBraveOptions) dom.bgBraveOptions.classList.toggle('hidden', type !== 'brave');
    if (dom.bgPresetOptions) dom.bgPresetOptions.classList.toggle('hidden', type !== 'preset');
    if (dom.bgSolidOptions) dom.bgSolidOptions.classList.toggle('hidden', type !== 'solid');
    if (dom.bgLocalOptions) dom.bgLocalOptions.classList.toggle('hidden', type !== 'local');
    if (dom.bgCustomOptions) dom.bgCustomOptions.classList.toggle('hidden', type !== 'custom');
}

let _lastDateKey = -1;
let _lastDateVal = '';
let _lastDayVal = '';
let _lastYearVal = -1;
let _lastDayPercent = '';
let _lastYearPercent = '';

export function updateCards() {
    if (!state.settings.showCards) return;
    if (dom.cardDateEl) dom.cardDateEl.classList.toggle('hidden', !state.settings.showCardDate);
    if (dom.cardFocusEl) dom.cardFocusEl.classList.toggle('hidden', !state.settings.showCardFocus);
    if (dom.cardNoteEl) dom.cardNoteEl.classList.toggle('hidden', !state.settings.showCardNote);
    if (dom.cardSecurityEl) dom.cardSecurityEl.classList.toggle('hidden', state.settings.showCardSecurity === false);
    if (dom.cardFileShareEl) dom.cardFileShareEl.classList.toggle('hidden', state.settings.showCardFileShare === false);
    if (dom.cardDirectoriesEl) dom.cardDirectoriesEl.classList.toggle('hidden', state.settings.showCardDirectories === false);
    if (dom.cardImageCompressorEl) dom.cardImageCompressorEl.classList.toggle('hidden', state.settings.showCardImageCompressor !== true);
    if (dom.cardPdfToolsEl) dom.cardPdfToolsEl.classList.toggle('hidden', state.settings.showCardPdfTools !== true);

    const now = new Date();
    const currentDateKey = now.getDate();

    // Cache localized date strings - only compute once per day
    if (currentDateKey !== _lastDateKey) {
        _lastDateKey = currentDateKey;
        _lastDateVal = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
        _lastDayVal = now.toLocaleDateString(undefined, { weekday: 'long' });
        if (dom.cardDateValue) dom.cardDateValue.textContent = _lastDateVal;
        if (dom.cardDateDay) dom.cardDateDay.textContent = _lastDayVal;
    }

    const currentYear = now.getFullYear();
    if (currentYear !== _lastYearVal) {
        _lastYearVal = currentYear;
        if (dom.cardYearBadge) dom.cardYearBadge.textContent = currentYear.toString();
    }

    // Calculate Day Progress (%)
    const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const dayPercent = ((secondsToday / 86400) * 100).toFixed(1);
    if (dayPercent !== _lastDayPercent) {
        _lastDayPercent = dayPercent;
        if (dom.dayPercentEl) dom.dayPercentEl.textContent = `${dayPercent}%`;
        if (dom.dayBarEl) dom.dayBarEl.style.width = `${dayPercent}%`;
    }

    // Calculate Year Progress (%)
    const startOfYear = new Date(currentYear, 0, 1).getTime();
    const endOfYear = new Date(currentYear + 1, 0, 1).getTime();
    const yearPercent = (((now.getTime() - startOfYear) / (endOfYear - startOfYear)) * 100).toFixed(1);
    if (yearPercent !== _lastYearPercent) {
        _lastYearPercent = yearPercent;
        if (dom.yearPercentEl) dom.yearPercentEl.textContent = `${yearPercent}%`;
        if (dom.yearBarEl) dom.yearBarEl.style.width = `${yearPercent}%`;
    }
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

// ─── DASHBOARD CHOOSER & PRESET LAYOUTS ───
export function getPresetSquircle(presetId) {
    const glyphs = {
        pro: `<svg viewBox="0 0 24 24" fill="#ffffff"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
        creator: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".6" fill="#ffffff"/><circle cx="17.5" cy="10.5" r=".6" fill="#ffffff"/><circle cx="8.5" cy="7.5" r=".6" fill="#ffffff"/><circle cx="6.5" cy="12.5" r=".6" fill="#ffffff"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.2 0-.9.8-1.7 1.7-1.7h2c3.3 0 6-2.7 6-6 0-5.5-4.5-10-10-10z"/></svg>`,
        minimal: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
        focus: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M10 2h4"/><path d="m18 6 1.5-1.5"/></svg>`,
        security: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
        google_live: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        bing_live: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
        custom: `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/></svg>`
    };

    const gradients = {
        pro: 'linear-gradient(145deg, #0ea5e9 0%, #2563eb 55%, #1d4ed8 100%)',
        creator: 'linear-gradient(145deg, #f43f5e 0%, #ec4899 55%, #a855f7 100%)',
        minimal: 'linear-gradient(145deg, #34d399 0%, #10b981 60%, #047857 100%)',
        focus: 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%)',
        security: 'linear-gradient(145deg, #38bdf8 0%, #06b6d4 55%, #0891b2 100%)',
        google_live: 'linear-gradient(145deg, #4285f4 0%, #2563eb 55%, #1d4ed8 100%)',
        bing_live: 'linear-gradient(145deg, #06b6d4 0%, #0d9488 55%, #0f766e 100%)',
        custom: 'linear-gradient(145deg, #c084fc 0%, #9333ea 55%, #7e22ce 100%)'
    };

    const glows = {
        pro: 'rgba(37, 99, 235, 0.45)',
        creator: 'rgba(236, 72, 153, 0.45)',
        minimal: 'rgba(16, 185, 129, 0.45)',
        focus: 'rgba(245, 158, 11, 0.45)',
        security: 'rgba(6, 182, 212, 0.45)',
        google_live: 'rgba(66, 133, 244, 0.45)',
        bing_live: 'rgba(13, 148, 136, 0.45)',
        custom: 'rgba(147, 51, 234, 0.45)'
    };

    const svg = glyphs[presetId] || glyphs.pro;
    const gradient = gradients[presetId] || gradients.pro;
    const glow = glows[presetId] || glows.pro;

    return `<span class="preset-apple-squircle" style="background:${gradient}; --badge-glow:${glow};">${svg}</span>`;
}

export const DASHBOARD_PRESETS = [
    {
        id: 'pro',
        name: 'Pro Workspace',
        badge: 'Recommended • Balanced 3-Column',
        accentColor: '#38bdf8',
        tagline: 'Complete all-in-one productivity dashboard with Clock, Date, Notes, Focus Pomodoro, VPN Shield, File Share, AI Hub & Search.',
        widgets: ['Clock & Date', 'Pomodoro Timer', 'Quick Notes', 'VPN Shield', 'P2P File Share', 'AI Hub', 'Multi-Search'],
        mockupHtml: `
            <div class="mockup-screen mockup-pro">
                <div class="m-window-bar">
                    <span class="m-traffic-dot m-dot-red"></span>
                    <span class="m-traffic-dot m-dot-yellow"></span>
                    <span class="m-traffic-dot m-dot-green"></span>
                    <span class="m-window-title">Pro 3-Column Studio</span>
                </div>
                <div class="m-stage">
                    <div class="mockup-col col-left">
                        <div class="m-card m-clock"><span class="m-time">10:42</span><span class="m-date">Sep 17</span></div>
                        <div class="m-card m-vpn"><span class="m-dot dot-green"></span><span>VPN Shield</span></div>
                    </div>
                    <div class="mockup-col col-center">
                        <div class="m-search-bar"><span class="m-search-dot"></span><span>Search Web &amp; AI...</span></div>
                        <div class="m-apps-row"><span class="m-app app-blue"></span><span class="m-app app-red"></span><span class="m-app app-amber"></span><span class="m-app app-emerald"></span></div>
                    </div>
                    <div class="mockup-col col-right">
                        <div class="m-card m-focus"><span class="m-ring"></span><span>25:00</span></div>
                        <div class="m-card m-notes"><span class="m-line"></span><span class="m-line short"></span></div>
                    </div>
                </div>
            </div>
        `,
        config: {
            dashboardMode: 'pro',
            showCards: true,
            showCardDate: true,
            showCardFocus: true,
            showCardNote: true,
            showCardSecurity: true,
            showCardFileShare: true,
            showCardDirectories: true,
            showCardImageCompressor: false,
            showCardPdfTools: false,
            showTopSites: true,
            showClock: true,
            showSearch: true,
            showMainUI: true
        }
    },
    {
        id: 'creator',
        name: 'Creator & Media Studio',
        badge: 'Design & Documents',
        accentColor: '#ec4899',
        tagline: 'Built for designers and content creators: In-Browser Image Compressor, Offline PDF Tools, Quick Notes, and P2P File Share.',
        widgets: ['Image Compressor', 'PDF Tools', 'Quick Notes', 'P2P File Share', 'Web Search'],
        mockupHtml: `
            <div class="mockup-screen mockup-creator">
                <div class="m-window-bar">
                    <span class="m-traffic-dot m-dot-red"></span>
                    <span class="m-traffic-dot m-dot-yellow"></span>
                    <span class="m-traffic-dot m-dot-green"></span>
                    <span class="m-window-title">Creator Media Studio</span>
                </div>
                <div class="m-stage">
                    <div class="mockup-col col-left">
                        <div class="m-card m-imgcomp">
                            <div class="m-comp-split">
                                <span class="m-photo-icon">📷</span>
                                <span class="m-badge-save">-78% Saved</span>
                            </div>
                            <div class="m-slider-line"></div>
                        </div>
                    </div>
                    <div class="mockup-col col-center">
                        <div class="m-search-bar"><span class="m-search-dot dot-pink"></span><span>Creative Studio...</span></div>
                        <div class="m-apps-row"><span class="m-app app-pink"></span><span class="m-app app-pink"></span><span class="m-app app-pink"></span></div>
                    </div>
                    <div class="mockup-col col-right">
                        <div class="m-card m-pdf">
                            <div class="m-pdf-header"><span class="m-pdf-tag">PDF</span><span>Doc.pdf</span></div>
                            <div class="m-btn-pill">Images to PDF ↗</div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        config: {
            dashboardMode: 'creator',
            showCards: true,
            showCardDate: false,
            showCardFocus: false,
            showCardNote: true,
            showCardSecurity: false,
            showCardFileShare: true,
            showCardDirectories: false,
            showCardImageCompressor: true,
            showCardPdfTools: true,
            showTopSites: true,
            showClock: true,
            showSearch: true,
            showMainUI: true
        }
    },
    {
        id: 'minimal',
        name: 'Minimalist Clean',
        badge: 'Distraction-Free Zen',
        accentColor: '#10b981',
        tagline: 'Serene distraction-free view with large Clock, clean Search bar, and Top Sites. Hides heavy cards for total focus.',
        widgets: ['Large Clock', 'Clean Web Search', 'Top Sites Shortcuts', 'Serene Wallpaper'],
        mockupHtml: `
            <div class="mockup-screen mockup-minimal">
                <div class="m-window-bar">
                    <span class="m-traffic-dot m-dot-red"></span>
                    <span class="m-traffic-dot m-dot-yellow"></span>
                    <span class="m-traffic-dot m-dot-green"></span>
                    <span class="m-window-title">Minimalist Canvas</span>
                </div>
                <div class="m-stage" style="padding:0;">
                    <div class="m-zen-wallpaper">
                        <div class="m-zen-clock">10:42</div>
                        <div class="m-search-bar search-zen"><span>Search with Zen...</span></div>
                        <div class="m-apps-row apps-zen"><span class="m-app"></span><span class="m-app"></span><span class="m-app"></span><span class="m-app"></span></div>
                    </div>
                </div>
            </div>
        `,
        config: {
            dashboardMode: 'minimal',
            showCards: false,
            showCardDate: false,
            showCardFocus: false,
            showCardNote: false,
            showCardSecurity: false,
            showCardFileShare: false,
            showCardDirectories: false,
            showCardImageCompressor: false,
            showCardPdfTools: false,
            showTopSites: false,
            showClock: true,
            showSearch: true,
            showMainUI: true
        }
    },
    {
        id: 'focus',
        name: 'Productivity & Focus',
        badge: 'Deep Work & Study',
        accentColor: '#f59e0b',
        tagline: 'Tailored for deep work: Pomodoro Focus Timer, Quick Notes notepad, and Date & Year progress.',
        widgets: ['Pomodoro Focus Timer', 'Quick Notes', 'Date & Year Progress', 'Web Search'],
        mockupHtml: `
            <div class="mockup-screen mockup-focus">
                <div class="m-window-bar">
                    <span class="m-traffic-dot m-dot-red"></span>
                    <span class="m-traffic-dot m-dot-yellow"></span>
                    <span class="m-traffic-dot m-dot-green"></span>
                    <span class="m-window-title">Deep Work Flow</span>
                </div>
                <div class="m-stage">
                    <div class="mockup-col col-left">
                        <div class="m-card m-date-progress">
                            <div class="m-line-label"><span>Year</span> <span>71%</span></div>
                            <div class="m-track"><div class="m-fill fill-amber" style="width: 71%"></div></div>
                        </div>
                    </div>
                    <div class="mockup-col col-center">
                        <div class="m-focus-circle">
                            <div class="m-focus-time">25:00</div>
                            <div class="m-focus-label">Deep Work</div>
                        </div>
                        <div class="m-search-bar search-amber"><span>Focus Search...</span></div>
                    </div>
                    <div class="mockup-col col-right">
                        <div class="m-card m-notepad">
                            <div class="m-notepad-header">Tasks</div>
                            <div class="m-line"></div><div class="m-line"></div><div class="m-line short"></div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        config: {
            dashboardMode: 'focus',
            showCards: true,
            showCardDate: true,
            showCardFocus: true,
            showCardNote: true,
            showCardSecurity: false,
            showCardFileShare: false,
            showCardDirectories: false,
            showCardImageCompressor: false,
            showCardPdfTools: false,
            showTopSites: true,
            showClock: true,
            showSearch: true,
            showMainUI: true
        }
    },
    {
        id: 'security',
        name: 'Cyber & Privacy Shield',
        badge: 'Stealth Defense HUD',
        accentColor: '#06b6d4',
        tagline: 'Dedicated to privacy: Real-time VPN Shield HUD, WebRTC Leak Guard, Tor Onion telemetry, and Quick Notes.',
        widgets: ['VPN & Tor Shield HUD', 'WebRTC Leak Guard', 'Clear Traces SCRAM', 'Quick Notes', 'Search'],
        mockupHtml: `
            <div class="mockup-screen mockup-security">
                <div class="m-window-bar">
                    <span class="m-traffic-dot m-dot-red"></span>
                    <span class="m-traffic-dot m-dot-yellow"></span>
                    <span class="m-traffic-dot m-dot-green"></span>
                    <span class="m-window-title">Cyber Shield HUD</span>
                </div>
                <div class="m-stage">
                    <div class="m-sec-grid">
                        <div class="m-radar-mini">
                            <div class="m-sweep"></div>
                            <div class="m-cross"></div>
                        </div>
                        <div class="m-sec-info">
                            <div class="m-sec-badge">DEFCON 1 • PROTECTED</div>
                            <div class="m-hop-row"><span>US</span> → <span>TOR 9050</span> → <span>SECURE</span></div>
                            <div class="m-tele-pill">IP: 185.220.*** • 0ms Leak</div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        config: {
            dashboardMode: 'security',
            showCards: true,
            showCardDate: false,
            showCardFocus: false,
            showCardNote: true,
            showCardSecurity: true,
            showCardFileShare: false,
            showCardDirectories: false,
            showCardImageCompressor: false,
            showCardPdfTools: false,
            showTopSites: true,
            showClock: true,
            showSearch: true,
            showMainUI: true
        }
    },
    {
        id: 'google_live',
        name: 'Live Google Search',
        badge: 'Interactive Google Engine',
        accentColor: '#4285f4',
        tagline: 'Full-screen Google search interface with floating frosted glass dock to switch back anytime.',
        widgets: ['Native Google.com Search', 'Iframe Sandboxed', 'Floating Dock Controls'],
        mockupHtml: `
            <div class="mockup-screen mockup-google">
                <div class="m-window-bar">
                    <span class="m-traffic-dot m-dot-red"></span>
                    <span class="m-traffic-dot m-dot-yellow"></span>
                    <span class="m-traffic-dot m-dot-green"></span>
                    <span class="m-window-title">Google Live View</span>
                </div>
                <div class="m-stage" style="flex-direction:column; justify-content:center; gap:8px;">
                    <div class="m-google-brand">
                        <span style="color:#4285f4">G</span><span style="color:#ea4335">o</span><span style="color:#fbbc05">o</span><span style="color:#4285f4">g</span><span style="color:#34a853">l</span><span style="color:#ea4335">e</span>
                    </div>
                    <div class="m-google-search-pill">
                        <span class="m-search-lens">🔍</span>
                        <span class="m-search-ghost">Search Google or type URL</span>
                    </div>
                </div>
            </div>
        `,
        config: {
            dashboardMode: 'google_live',
            backgroundType: 'google_dashboard',
            backgroundValue: 'https://www.google.com/?raeen_dashboard=true',
            showMainUI: true
        }
    },
    {
        id: 'bing_live',
        name: 'Live Bing Search',
        badge: 'Interactive Bing Engine',
        accentColor: '#008373',
        tagline: 'Full-screen Bing search interface with floating frosted glass dock to switch back anytime.',
        widgets: ['Native Bing.com Search', 'Iframe Sandboxed', 'Floating Dock Controls'],
        mockupHtml: `
            <div class="mockup-screen mockup-bing">
                <div class="m-window-bar">
                    <span class="m-traffic-dot m-dot-red"></span>
                    <span class="m-traffic-dot m-dot-yellow"></span>
                    <span class="m-traffic-dot m-dot-green"></span>
                    <span class="m-window-title">Bing Copilot Live</span>
                </div>
                <div class="m-stage" style="flex-direction:column; justify-content:center; gap:8px;">
                    <div class="m-bing-brand">
                        <span class="m-bing-icon">🔍</span> Bing
                    </div>
                    <div class="m-bing-search-pill">
                        <span>Ask anything or chat with Copilot</span>
                    </div>
                </div>
            </div>
        `,
        config: {
            dashboardMode: 'bing_live',
            backgroundType: 'bing_dashboard',
            backgroundValue: 'https://www.bing.com/?raeen_dashboard=true',
            showMainUI: true
        }
    },
    {
        id: 'custom',
        name: 'Custom Layout',
        badge: 'Fit For You',
        accentColor: '#a855f7',
        tagline: 'Your bespoke setup. Freely position and resize any widget on the free-space canvas.',
        widgets: ['Free-Space Drag & Drop', 'Custom Resizing', 'Selective Widget Toggles'],
        mockupHtml: `
            <div class="mockup-screen mockup-custom">
                <div class="m-window-bar">
                    <span class="m-traffic-dot m-dot-red"></span>
                    <span class="m-traffic-dot m-dot-yellow"></span>
                    <span class="m-traffic-dot m-dot-green"></span>
                    <span class="m-window-title">Free-Position Canvas</span>
                </div>
                <div class="m-stage">
                    <div class="m-canvas-grid">
                        <div class="m-box box-a"><span>Widget A</span><div class="m-resize"></div></div>
                        <div class="m-box box-b"><span>Widget B</span><div class="m-resize"></div></div>
                        <div class="m-box box-c"><span>Widget C</span><div class="m-resize"></div></div>
                    </div>
                </div>
            </div>
        `,
        config: {
            dashboardMode: 'custom'
        }
    }
];

export function renderDashboardChooser() {
    const container = document.getElementById('dashboard-presets-grid');
    if (!container) return;

    const currentMode = state.settings.dashboardMode || 'pro';

    container.innerHTML = DASHBOARD_PRESETS.map(preset => {
        const isActive = currentMode === preset.id;
        const widgetPills = preset.widgets.map(w => `<span class="preset-pill">${w}</span>`).join('');
        const squircle = getPresetSquircle(preset.id);

        return `
            <div class="dashboard-preset-card ${isActive ? 'active' : ''}" data-preset-id="${preset.id}" style="--accent-mode: ${preset.accentColor}">
                <div class="preset-preview-banner">
                    ${preset.mockupHtml || ''}
                </div>
                <div class="preset-card-body">
                    <div class="preset-header">
                        ${squircle}
                        <div class="preset-title-group">
                            <div class="preset-title-row">
                                <h4 class="preset-title">${preset.name}</h4>
                                ${isActive ? `
                                    <span class="preset-active-tag">
                                        <span class="active-pulse-dot"></span>
                                        Active Workspace
                                    </span>
                                ` : ''}
                            </div>
                            <span class="preset-badge">${preset.badge}</span>
                        </div>
                    </div>
                    <p class="preset-tagline">${preset.tagline}</p>
                    <div class="preset-pills">${widgetPills}</div>
                    <div class="preset-footer">
                        <button type="button" class="preset-select-btn ${isActive ? 'btn-active' : ''}" data-preset-id="${preset.id}">
                            ${isActive ? `
                                <span class="btn-check-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                                Current Active Workspace
                            ` : 'Switch to This Workspace →'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (!container._hasPresetListener) {
        container._hasPresetListener = true;
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.dashboard-preset-card');
            const btn = e.target.closest('.preset-select-btn');
            const target = btn || card;
            if (target && target.dataset.presetId) {
                applyDashboardPreset(target.dataset.presetId);
            }
        });
    }
}

export async function applyDashboardPreset(presetId) {
    const preset = DASHBOARD_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Manage background switching safely between live iframe and native
    if (preset.id === 'google_live' || preset.id === 'bing_live') {
        if (state.settings.backgroundType !== 'google_dashboard' && state.settings.backgroundType !== 'bing_dashboard') {
            state.settings.lastNonLiveBgType = state.settings.backgroundType || 'brave';
            state.settings.lastNonLiveBgValue = state.settings.backgroundValue || 'brave_random';
        }
    } else if (state.settings.backgroundType === 'google_dashboard' || state.settings.backgroundType === 'bing_dashboard') {
        state.settings.backgroundType = state.settings.lastNonLiveBgType || 'brave';
        state.settings.backgroundValue = state.settings.lastNonLiveBgValue || 'brave_random';
    }

    Object.assign(state.settings, preset.config);
    state.settings.dashboardMode = preset.id;

    await saveSettings(state.settings);
    await applySettings();
    syncSettingsUI();
    renderDashboardChooser();
    updateCards();
}
