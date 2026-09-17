import { state, saveSettings } from './state.js';
import { dom } from './dom.js';
import { StorageManager } from './storage.js';
import { themeLibrary } from './themes.js';
import { CanvasEngine } from './canvas.js';

export const BRAVE_WALLPAPERS = [
    {
        id: 'brave_1',
        title: 'Dolomites Sunrise',
        photographer: 'Dylan Malval',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_2',
        title: 'Misty Emerald Forest',
        photographer: 'Sebastian Unrau',
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_3',
        title: 'Arctic Aurora Borealis',
        photographer: 'Vincent Guth',
        url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_4',
        title: 'Lofoten Fjords & Sea',
        photographer: 'Luca Bravo',
        url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_5',
        title: 'Desert Dunes Sunset',
        photographer: 'Jeremy Bishop',
        url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_6',
        title: 'Pacific Ocean Waves',
        photographer: 'Sean Oulashin',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_7',
        title: 'Mount Fuji Reflection',
        photographer: 'Manuel Cosentino',
        url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_8',
        title: 'Deep Cosmic Nebula',
        photographer: 'Alexander Andrews',
        url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_9',
        title: 'Yosemite Valley Mist',
        photographer: 'Bailey Zindel',
        url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_10',
        title: 'Alpine Mountain Peaks',
        photographer: 'Kalen Emsley',
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_11',
        title: 'Iceland Cascades',
        photographer: 'Derek Thomson',
        url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_12',
        title: 'Golden Autumn Pines',
        photographer: 'Luca Bravo',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_13',
        title: 'Highland Serenity',
        photographer: 'Kal Visuals',
        url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_14',
        title: 'Lone Tree Savannah',
        photographer: 'Sander Weeteling',
        url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_15',
        title: 'Sunlit Forest Path',
        photographer: 'Federico Respini',
        url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_16',
        title: 'Spring Lake Calm',
        photographer: 'Aaron Burden',
        url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_17',
        title: 'Nordic Forest Mist',
        photographer: 'David Kovalenko',
        url: 'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_18',
        title: 'Alpine Wildflowers',
        photographer: 'Kari Shea',
        url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_19',
        title: 'Canyon River Journey',
        photographer: 'Kal Visuals',
        url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_20',
        title: 'Emerald Lake Valley',
        photographer: 'Lucas Davies',
        url: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_21',
        title: 'Mountain Ridge Horizon',
        photographer: 'Pietro De Grandi',
        url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_22',
        title: 'Starry Mountain Peak',
        photographer: 'Benjamin Davies',
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_23',
        title: 'Enchanted Forest Creek',
        photographer: 'Krzysztof Niewolny',
        url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_24',
        title: 'Misty Wilderness Lake',
        photographer: 'David Marcu',
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_25',
        title: 'Valley of the Mist',
        photographer: 'Bailey Zindel',
        url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_26',
        title: 'Reflective Mountain Stream',
        photographer: 'Jerry Zhang',
        url: 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_27',
        title: 'Deep Autumn Forest',
        photographer: 'Sebastian Unrau',
        url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_28',
        title: 'Winter Mountain Pine',
        photographer: 'Dan Meyers',
        url: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_29',
        title: 'Alpine Summit Dawn',
        photographer: 'Dino Reichmuth',
        url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=75'
    },
    {
        id: 'brave_30',
        title: 'Misty Pine Ridges',
        photographer: 'Kalen Emsley',
        url: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=3840&q=85',
        thumb: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=600&q=75'
    }
];

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
            } catch (e) {}
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
                if (!bgValue || bgValue === 'brave_random') {
                    if (!currentBraveWallpaper) {
                        const randIndex = Math.floor(Math.random() * BRAVE_WALLPAPERS.length);
                        currentBraveWallpaper = BRAVE_WALLPAPERS[randIndex];
                    }
                    braveItem = currentBraveWallpaper;
                } else {
                    braveItem = BRAVE_WALLPAPERS.find(w => w.url === bgValue || w.id === bgValue) || {
                        title: 'Brave Curated',
                        photographer: 'Dylan Malval',
                        url: bgValue
                    };
                    currentBraveWallpaper = braveItem;
                }

                if (braveItem?.url) {
                    dom.bgLayer.style.backgroundImage = `url('${braveItem.url}')`;
                    try {
                        localStorage.setItem('raeen_bg_value', braveItem.url);
                    } catch (e) {}
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

    // Brave Photographer Credit
    if (bgType === 'brave' && currentBraveWallpaper && !hideUI && !isImmersive) {
        if (dom.photographerCredit) {
            dom.photographerCredit.classList.remove('hidden');
        }
        if (dom.photographerName) {
            dom.photographerName.textContent = currentBraveWallpaper.photographer || 'Brave Curated';
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
    if (dom.braveRandomToggle) {
        dom.braveRandomToggle.checked = !state.settings.backgroundValue || state.settings.backgroundValue === 'brave_random';
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
export const DASHBOARD_PRESETS = [
    {
        id: 'pro',
        name: 'Pro Workspace',
        badge: 'Recommended • Balanced 3-Column',
        icon: '⚡',
        accentColor: '#38bdf8',
        tagline: 'Complete all-in-one productivity dashboard with Clock, Date, Notes, Focus Pomodoro, VPN Shield, File Share, AI Hub & Search.',
        widgets: ['Clock & Date', 'Pomodoro Timer', 'Quick Notes', 'VPN Shield', 'P2P File Share', 'AI Hub', 'Multi-Search'],
        mockupHtml: `
            <div class="mockup-screen mockup-pro">
                <div class="mockup-col col-left">
                    <div class="m-card m-clock"><span class="m-time">10:42</span><span class="m-date">Sep 17</span></div>
                    <div class="m-card m-vpn"><span class="m-dot dot-green"></span><span>VPN Shield</span></div>
                </div>
                <div class="mockup-col col-center">
                    <div class="m-search-bar"><span class="m-search-dot"></span><span>Search Web &amp; AI...</span></div>
                    <div class="m-apps-row"><span class="m-app"></span><span class="m-app"></span><span class="m-app"></span><span class="m-app"></span></div>
                </div>
                <div class="mockup-col col-right">
                    <div class="m-card m-focus"><span class="m-ring"></span><span>25:00</span></div>
                    <div class="m-card m-notes"><span class="m-line"></span><span class="m-line short"></span></div>
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
        icon: '🎨',
        accentColor: '#ec4899',
        tagline: 'Built for designers and content creators: In-Browser Image Compressor, Offline PDF Tools, Quick Notes, and P2P File Share.',
        widgets: ['Image Compressor', 'PDF Tools', 'Quick Notes', 'P2P File Share', 'Web Search'],
        mockupHtml: `
            <div class="mockup-screen mockup-creator">
                <div class="mockup-col col-left">
                    <div class="m-card m-imgcomp">
                        <div class="m-comp-split">
                            <span class="m-photo-icon">🖼️</span>
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
        icon: '🧘',
        accentColor: '#10b981',
        tagline: 'Serene distraction-free view with large Clock, clean Search bar, and Top Sites. Hides heavy cards for total focus.',
        widgets: ['Large Clock', 'Clean Web Search', 'Top Sites Shortcuts', 'Serene Wallpaper'],
        mockupHtml: `
            <div class="mockup-screen mockup-minimal">
                <div class="m-zen-wallpaper">
                    <div class="m-zen-clock">10:42</div>
                    <div class="m-search-bar search-zen"><span>Search with Zen...</span></div>
                    <div class="m-apps-row apps-zen"><span class="m-app"></span><span class="m-app"></span><span class="m-app"></span><span class="m-app"></span></div>
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
            showTopSites: true,
            showClock: true,
            showSearch: true,
            showMainUI: true
        }
    },
    {
        id: 'focus',
        name: 'Productivity & Focus',
        badge: 'Deep Work & Study',
        icon: '⏱️',
        accentColor: '#f59e0b',
        tagline: 'Tailored for deep work: Pomodoro Focus Timer, Quick Notes notepad, and Date & Year progress.',
        widgets: ['Pomodoro Focus Timer', 'Quick Notes', 'Date & Year Progress', 'Web Search'],
        mockupHtml: `
            <div class="mockup-screen mockup-focus">
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
        icon: '🛡️',
        accentColor: '#06b6d4',
        tagline: 'Dedicated to privacy: Real-time VPN Shield HUD, WebRTC Leak Guard, Tor Onion telemetry, and Quick Notes.',
        widgets: ['VPN & Tor Shield HUD', 'WebRTC Leak Guard', 'Clear Traces SCRAM', 'Quick Notes', 'Search'],
        mockupHtml: `
            <div class="mockup-screen mockup-security">
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
        icon: '🌐',
        accentColor: '#4285f4',
        tagline: 'Full-screen Google search interface with floating frosted glass dock to switch back anytime.',
        widgets: ['Native Google.com Search', 'Iframe Sandboxed', 'Floating Dock Controls'],
        mockupHtml: `
            <div class="mockup-screen mockup-google">
                <div class="m-google-brand">
                    <span style="color:#4285f4">G</span><span style="color:#ea4335">o</span><span style="color:#fbbc05">o</span><span style="color:#4285f4">g</span><span style="color:#34a853">l</span><span style="color:#ea4335">e</span>
                </div>
                <div class="m-google-search-pill">
                    <span class="m-search-lens">🔍</span>
                    <span class="m-search-ghost">Search Google or type URL</span>
                    <span class="m-mic-icon">🎙️</span>
                </div>
                <div class="m-google-btns">
                    <span>Google Search</span>
                    <span>I'm Feeling Lucky</span>
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
        icon: '🔍',
        accentColor: '#008373',
        tagline: 'Full-screen Bing search interface with floating frosted glass dock to switch back anytime.',
        widgets: ['Native Bing.com Search', 'Iframe Sandboxed', 'Floating Dock Controls'],
        mockupHtml: `
            <div class="mockup-screen mockup-bing">
                <div class="m-bing-brand">
                    <span class="m-bing-icon">🔍</span> Bing
                </div>
                <div class="m-bing-search-pill">
                    <span>Ask anything or chat with Copilot</span>
                    <span class="m-copilot-sparkle">✨</span>
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
        icon: '🎨',
        accentColor: '#a855f7',
        tagline: 'Your bespoke setup. Freely position and resize any widget on the free-space canvas.',
        widgets: ['Free-Space Drag & Drop', 'Custom Resizing', 'Selective Widget Toggles'],
        mockupHtml: `
            <div class="mockup-screen mockup-custom">
                <div class="m-canvas-grid">
                    <div class="m-box box-a"><span>Widget A</span><div class="m-resize"></div></div>
                    <div class="m-box box-b"><span>Widget B</span><div class="m-resize"></div></div>
                    <div class="m-box box-c"><span>Widget C</span><div class="m-resize"></div></div>
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

        return `
            <div class="dashboard-preset-card ${isActive ? 'active' : ''}" data-preset-id="${preset.id}" style="--accent-mode: ${preset.accentColor}">
                <div class="preset-preview-banner">
                    ${preset.mockupHtml || ''}
                </div>
                <div class="preset-card-body">
                    <div class="preset-header">
                        <span class="preset-icon">${preset.icon}</span>
                        <div class="preset-title-group">
                            <div class="preset-title-row">
                                <h4 class="preset-title">${preset.name}</h4>
                                ${isActive ? '<span class="preset-active-tag">✓ Active &amp; Kept</span>' : ''}
                            </div>
                            <span class="preset-badge">${preset.badge}</span>
                        </div>
                    </div>
                    <p class="preset-tagline">${preset.tagline}</p>
                    <div class="preset-pills">${widgetPills}</div>
                    <div class="preset-footer">
                        <button type="button" class="preset-select-btn ${isActive ? 'btn-active' : ''}" data-preset-id="${preset.id}">
                            ${isActive ? '✓ Kept as Default' : 'Keep This Dashboard'}
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
    syncSettingsUI();
    renderDashboardChooser();
    updateCards();
}
