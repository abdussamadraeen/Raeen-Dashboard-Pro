(function () {
    'use strict';

    // --- Robust IndexedDB Storage Manager (Best Storage) ---
    const StorageManager = (() => {
        const DB_NAME = 'AbdusPremiumDB';
        const DB_VERSION = 4; // Incremented for new stores
        let db = null;

        const init = () => {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
                    if (!db.objectStoreNames.contains('mediaStore')) db.createObjectStore('mediaStore');
                    if (!db.objectStoreNames.contains('imageCache')) db.createObjectStore('imageCache');
                    if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
                };
                request.onsuccess = (e) => { db = e.target.result; resolve(); };
                request.onerror = (e) => reject('DB Error: ' + e.target.errorCode);
            });
        };

        const get = (storeName, key) => {
            return new Promise((resolve) => {
                if (!db) return resolve(null);
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
        };

        const set = (storeName, key, value) => {
            return new Promise((resolve, reject) => {
                if (!db) return reject('DB not initialized');
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = key ? store.put(value, key) : store.put(value);
                request.onsuccess = () => resolve();
                request.onerror = () => reject('Set Error');
            });
        };

        const getAll = (storeName) => {
            return new Promise((resolve) => {
                if (!db) return resolve([]);
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve([]);
            });
        };

        const remove = (storeName, key) => {
            return new Promise((resolve) => {
                if (!db) return resolve();
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
            });
        };

        return { init, get, set, getAll, remove };
    })();

    // --- Premium Canvas Engine ---
    const CanvasEngine = (() => {
        let canvas, ctx, animationId, particles = [], width, height, theme = 'neural';
        let mouse = { x: null, y: null };

        const init = (el, style) => {
            canvas = el; ctx = canvas.getContext('2d');
            theme = style || 'neural';
            resize();
            window.addEventListener('resize', resize);
            window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
            animate();
        };

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            createParticles();
        };

        const createParticles = () => {
            particles = [];
            const count = theme === 'rain' ? 100 : 80;
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * (theme === 'neural' ? 1 : 0.5),
                    vy: theme === 'rain' ? Math.random() * 15 + 5 : (Math.random() - 0.5) * 1,
                    radius: theme === 'bubbles' ? Math.random() * 20 + 5 : Math.random() * 2 + 1,
                    opacity: Math.random() * 0.5 + 0.2
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7b61ff';

            particles.forEach((p, i) => {
                if (theme === 'neural') {
                    p.x += p.vx; p.y += p.vy;
                    if (p.x < 0 || p.x > width) p.vx *= -1;
                    if (p.y < 0 || p.y > height) p.vy *= -1;

                    // Interaction: Neural pulse and magnetic pull
                    if (mouse.x !== null) {
                        const dx = mouse.x - p.x;
                        const dy = mouse.y - p.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 150) {
                            // Magnetic pull: accelerate towards mouse
                            const force = (150 - dist) / 150;
                            p.vx += dx * 0.005 * force;
                            p.vy += dy * 0.005 * force;

                            // Visual feedback: grow size slightly
                            p.radius = Math.min(4, p.radius + 0.1);
                        } else {
                            p.radius = Math.max(1, p.radius - 0.1);
                        }
                    }

                    // Speed limit for sanity
                    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    if (speed > 2) { p.vx *= 0.9; p.vy *= 0.9; }

                    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(123, 97, 255, ${p.opacity})`; ctx.fill();

                    // Interaction: Connect to nearby particles
                    for (let j = i + 1; j < particles.length; j++) {
                        const p2 = particles[j];
                        const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 150) {
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(123, 97, 255, ${(150 - dist) / 150 * 0.2})`;
                            ctx.lineWidth = 1;
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }

                    // Interaction: Connect to mouse
                    if (mouse.x !== null) {
                        const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 200) {
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(123, 97, 255, ${(200 - dist) / 200 * 0.5})`;
                            ctx.lineWidth = 1.5;
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(mouse.x, mouse.y);
                            ctx.stroke();
                        }
                    }

                } else if (theme === 'bubbles') {
                    p.y -= p.vy; if (p.y < -50) p.y = height + 50;

                    // Interaction: push bubbles away
                    if (mouse.x !== null) {
                        const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 120) {
                            p.x -= dx * 0.02;
                            p.y -= dy * 0.02;
                        }
                    }

                    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.3})`; ctx.lineWidth = 2; ctx.stroke();
                } else if (theme === 'rain') {
                    p.y += p.vy; if (p.y > height) { p.y = -20; p.x = Math.random() * width; }

                    // Rain splashes on mouse
                    if (mouse.x !== null) {
                        const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 50) { p.y -= 10; p.vx += (Math.random() - 0.5) * 10; }
                    }

                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.3})`;
                    ctx.lineWidth = 1.5; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx, p.y + 20); ctx.stroke();
                }
            });
            animationId = requestAnimationFrame(animate);
        };

        const stop = () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
        return { init, stop };
    })();


    // --- Settings & State ---
    const defaultSettings = {
        themePreference: 'dark',
        backgroundType: 'canvas',
        backgroundValue: 'neural',
        canvasStyle: 'neural',
        showSearch: true,
        searchEngine: 'google',
        showTopSites: true,
        topSitesSource: 'favorites',
        shortcuts: [
            { name: 'GitHub', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.svg' },
            { name: 'YouTube', url: 'https://youtube.com', icon: 'https://www.youtube.com/favicon.ico' }
        ],
        googleApps: [
            { name: 'Search', url: 'https://google.com', icon: 'https://www.gstatic.com/images/branding/product/2x/googleg_96dp.png' },
            { name: 'Gmail', url: 'https://mail.google.com', icon: 'https://www.gstatic.com/images/branding/product/2x/gmail_96dp.png' }
        ],
        msApps: [], aiApps: [], customApps: [],
        showClock: true, clockFormat: 'auto',
        showCards: false, showCardDate: true, showCardFocus: true, showCardNote: true,
        showNoosphereBar: true, showMainUI: true, showSettingsButtonInImmersive: true, customSearchUrl: 'https://www.google.com/search?q=%s'
    };

    let settings = { ...defaultSettings };

    async function saveSettings(noApply = false) {
        await StorageManager.set('settings', 'main', settings);
        if (!noApply) applySettings();
    }

    // --- DOM Elements Cache ---
    const dom = {
        bgLayer: document.getElementById('background-layer'),
        canvasLayer: document.getElementById('canvas-layer'),
        timeEl: document.getElementById('time'),
        clockWidget: document.getElementById('clock-widget'),
        searchWidget: document.getElementById('search-widget'),
        topSitesWidget: document.getElementById('top-sites-widget'),
        cardsWidget: document.getElementById('cards-widget'),
        settingsBtn: document.getElementById('settings-btn'),
        modalOverlay: document.getElementById('settings-modal'),
        closeBtn: document.getElementById('close-modal-btn'),
        bgTypeSelect: document.getElementById('bg-type-select'),
        canvasStyleSelect: document.getElementById('canvas-style-select'),
        bingGallery: document.getElementById('bing-gallery'),
        galleryGrid: document.getElementById('gallery-grid'),
        notesList: document.getElementById('notes-list'),
        notesCount: document.getElementById('notes-count'),
        addNoteBtn: document.getElementById('add-note-btn'),
        noteEditor: document.getElementById('note-editor'),
        noteBackBtn: document.getElementById('note-back-btn'),
        noteEditorTitle: document.getElementById('note-editor-title'),
        noteEditorBody: document.getElementById('note-editor-body'),
        noteSaveStatus: document.getElementById('note-save-status'),
        noteDeleteBtn: document.getElementById('note-delete-btn'),
        noteCharCount: document.getElementById('note-char-count'),
        googleAppsGrid: document.getElementById('google-apps'),
        msAppsGrid: document.getElementById('ms-apps'),
        aiAppsGrid: document.getElementById('ai-apps'),
        customAppsGrid: document.getElementById('custom-apps'),
        cdiBar: document.getElementById('cdi-bar-left'),
        cdiBarRight: document.getElementById('cdi-bar-right'),
        cdiBarTop: document.getElementById('cdi-bar-top'),
        cdiBarBottom: document.getElementById('cdi-bar-bottom'),
        searchInput: document.getElementById('search-input'),
        searchSuggestions: document.getElementById('search-suggestions'),
        searchForm: document.getElementById('search-form'),
        sidebarTabs: document.querySelectorAll('.sidebar-tab'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        showNoosphereToggle: document.getElementById('show-noosphere-toggle'),
        showSettingsInImmersiveToggle: document.getElementById('show-settings-in-immersive-toggle'),
        showMainUIToggle: document.getElementById('show-main-ui-toggle'),
        bgCanvasOptions: document.getElementById('bg-canvas-options'),
        bgBingOptions: document.getElementById('bg-bing-options'),
        bgPresetOptions: document.getElementById('bg-preset-options'),
        bgSolidOptions: document.getElementById('bg-solid-options'),
        bgLocalOptions: document.getElementById('bg-local-options'),
        bgCustomOptions: document.getElementById('bg-custom-options'),
        bgCustomUrl: document.getElementById('bg-custom-url'),
        bgLocalFile: document.getElementById('bg-local-file'),
        toggleSearch: document.getElementById('toggle-search'),
        customSearchUrlInput: document.getElementById('custom-search-url'),
        toggleTopSites: document.getElementById('toggle-topsites'),
        addShortcutBtn: document.getElementById('add-shortcut-btn'),
        newShortcutName: document.getElementById('new-shortcut-name'),
        newShortcutUrl: document.getElementById('new-shortcut-url'),
        shortcutsList: document.getElementById('shortcuts-list'),
        toggleClock: document.getElementById('toggle-clock'),
        clockFormatSelect: document.getElementById('clock-format-select'),
        toggleCards: document.getElementById('toggle-cards'),
        toggleCardDate: document.getElementById('toggle-card-date'),
        toggleCardFocus: document.getElementById('toggle-card-focus'),
        toggleCardNote: document.getElementById('toggle-card-note'),
        cardDateEl: document.getElementById('card-date'),
        cardFocusEl: document.getElementById('card-focus'),
        cardNoteEl: document.getElementById('notes-panel'),
        cardDateValue: document.getElementById('card-date-value'),
        cardDateDay: document.getElementById('card-date-day'),
        appsLauncherBtn: document.getElementById('apps-launcher-btn'),
        appsDropdown: document.getElementById('apps-dropdown'),
        appTabs: document.querySelectorAll('.app-tab'),
        appPanes: document.querySelectorAll('.app-pane'),
        addAppBtn: document.getElementById('add-app-btn'),
        addAppModal: document.getElementById('add-app-modal'),
        closeAddAppBtn: document.getElementById('close-add-app-btn'),
        saveAppBtn: document.getElementById('save-app-btn'),
        appNameInput: document.getElementById('app-name'),
        appUrlInput: document.getElementById('app-url'),
        appIconInput: document.getElementById('app-icon')
    };

    // --- Core UI Functions ---
    async function applySettings() {
        // Theme
        document.documentElement.setAttribute('data-theme', settings.themePreference);

        // --- Background Application ---
        // Commenting out old logic block for clarity
        /*
        // Background Cleanup
        CanvasEngine.stop();
        dom.bgLayer.style.backgroundImage = '';
        dom.bgLayer.innerHTML = '';
        dom.canvasLayer.style.display = 'none';
        
        const type = settings.backgroundType;
        let val = settings.backgroundValue;

        if (type === 'canvas') {
            dom.canvasLayer.style.display = 'block';
            CanvasEngine.init(dom.canvasLayer, settings.canvasStyle || val);
        } else if (type === 'bing') {
            if (val === 'bing_latest') {
                try {
                    const media = await StorageManager.get('mediaStore', 'bing_latest');
                    if (media && media.url) {
                        val = media.url;
                    } else {
                        const res = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1');
                        const data = await res.json();
                        val = `https://www.bing.com${data.images[0].url}`;
                        await StorageManager.set('mediaStore', 'bing_latest', { url: val, timestamp: Date.now() });
                    }
                } catch(e) { val = ''; }
            }
            dom.bgLayer.style.backgroundImage = `url('${val}')`;
        } else if (type === 'preset' || type === 'custom') {
            if (val.includes('.mp4') || val.includes('.webm')) {
                dom.bgLayer.innerHTML = `<video autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"><source src="${val}"></video>`;
            } else {
                dom.bgLayer.style.backgroundImage = `url('${val}')`;
            }
        } else if (type === 'local') {
            const media = await StorageManager.get('mediaStore', 'localBackground');
            if (media && media.data) {
                if (media.type && media.type.startsWith('video')) {
                    dom.bgLayer.innerHTML = `<video autoplay muted loop playsinline src="${media.data}" type="${media.type}" style="width:100%;height:100%;object-fit:cover;"></video>`;
                } else {
                    dom.bgLayer.style.backgroundImage = `url('${media.data}')`;
                }
            }
        } else if (type === 'solid') {
            dom.bgLayer.style.background = val;
        }
        */

        // New, refactored background logic
        CanvasEngine.stop();
        dom.canvasLayer.style.display = 'none';
        dom.bgLayer.innerHTML = '';
        dom.bgLayer.style.backgroundImage = '';
        dom.bgLayer.style.backgroundColor = 'transparent';

        const bgType = settings.backgroundType;
        const bgValue = settings.backgroundValue;

        switch (bgType) {
            case 'canvas':
                dom.canvasLayer.style.display = 'block';
                CanvasEngine.init(dom.canvasLayer, settings.canvasStyle || bgValue);
                break;
            case 'bing':
                const bingUrl = bgValue === 'bing_latest'
                    ? (await StorageManager.get('mediaStore', 'bing_latest'))?.url
                    : bgValue;
                if (bingUrl) {
                    dom.bgLayer.style.backgroundImage = `url('${bingUrl}')`;
                } else {
                    // Fallback if latest bing image isn't cached yet
                    try {
                        const res = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1');
                        const data = await res.json();
                        const url = `https://www.bing.com${data.images[0].url}`;
                        await StorageManager.set('mediaStore', 'bing_latest', { url: url, timestamp: Date.now() });
                        dom.bgLayer.style.backgroundImage = `url('${url}')`;
                    } catch (e) { console.error("Failed to fetch Bing image", e); }
                }
                break;
            case 'preset':
            case 'custom':
                if (bgValue.match(/\.(mp4|webm)$/)) {
                    dom.bgLayer.innerHTML = `<video autoplay muted loop playsinline src="${bgValue}" style="width:100%;height:100%;object-fit:cover;"></video>`;
                } else {
                    dom.bgLayer.style.backgroundImage = `url('${bgValue}')`;
                }
                break;
            case 'local':
                const localMedia = await StorageManager.get('mediaStore', 'localBackground');
                if (localMedia?.data) {
                    if (localMedia.type?.startsWith('video')) {
                        dom.bgLayer.innerHTML = `<video autoplay muted loop playsinline src="${localMedia.data}" type="${localMedia.type}" style="width:100%;height:100%;object-fit:cover;"></video>`;
                    } else {
                        dom.bgLayer.style.backgroundImage = `url('${localMedia.data}')`;
                    }
                }
                break;
            case 'solid':
                dom.bgLayer.style.backgroundColor = bgValue;
                break;
        }

        // Widgets Visibility
        dom.searchWidget?.classList.toggle('hidden', !settings.showSearch);
        dom.topSitesWidget?.classList.toggle('hidden', !settings.showTopSites);
        dom.cardsWidget?.classList.toggle('hidden', !settings.showCards);
        dom.clockWidget?.style.setProperty('display', settings.showClock ? 'flex' : 'none');

        // Noosphere Bars
        const showNoosphere = settings.showNoosphereBar;
        dom.cdiBar?.classList.toggle('hidden', !showNoosphere);
        dom.cdiBarRight?.classList.toggle('hidden', !showNoosphere);
        dom.cdiBarTop?.classList.toggle('hidden', !showNoosphere);
        dom.cdiBarBottom?.classList.toggle('hidden', !showNoosphere);

        // Immersive Mode Logic
        const isImmersive = !settings.showMainUI;
        document.body.classList.toggle('immersive-mode', isImmersive);

        // Commenting out old immersive logic
        /*
        let immersiveElements = [dom.searchWidget, dom.topSitesWidget, dom.cardsWidget, dom.clockWidget, dom.appsLauncherBtn];
        if (!settings.showSettingsButtonInImmersive) {
            immersiveElements.push(dom.settingsBtn);
        }
        immersiveElements.forEach(el => {
            if(el) el.classList.toggle('immersive-hidden', isImmersive);
        });
        */

        // New, cleaner immersive mode logic
        dom.searchWidget?.classList.toggle('immersive-hidden', isImmersive);
        dom.topSitesWidget?.classList.toggle('immersive-hidden', isImmersive);
        dom.cardsWidget?.classList.toggle('immersive-hidden', isImmersive);
        dom.clockWidget?.classList.toggle('immersive-hidden', isImmersive);
        dom.appsLauncherBtn?.classList.toggle('immersive-hidden', isImmersive);
        dom.settingsBtn?.classList.toggle('immersive-hidden', isImmersive && !settings.showSettingsButtonInImmersive);

        updateCards();
    }

    function updateTime() {
        if (!dom.timeEl) return;
        const now = new Date();
        let h = now.getHours(), m = now.getMinutes();
        if (settings.clockFormat !== '24h' && settings.clockFormat !== 'auto') {
            h = h % 12 || 12;
        } else if (settings.clockFormat === 'auto') {
            const locale = navigator.language || 'en-US';
            const timeString = now.toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric' });
            dom.timeEl.textContent = timeString;
            return;
        }
        dom.timeEl.textContent = `${h}:${m < 10 ? '0' : ''}${m}`;
    }

    async function loadBingGallery() {
        if (!dom.bingGallery) return;
        dom.bingGallery.innerHTML = '<p class="subtext">Loading daily wallpapers...</p>';
        try {
            const mkt = navigator.language || 'en-US';
            // Fetch 8 images to show multiple options as requested
            const res = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=${mkt}`);
            const data = await res.json();
            const images = data.images || [];

            // First image is always "latest"
            dom.bingGallery.innerHTML = images.map((img, i) => `
                <div class="bing-thumb-wrapper" style="cursor:pointer;" data-url="https://www.bing.com${img.url}">
                    <img src="https://www.bing.com${img.urlbase}_400x240.jpg" class="bing-thumb ${settings.backgroundValue === (i === 0 ? 'bing_latest' : 'https://www.bing.com' + img.url) ? 'active' : ''}" style="width:100%; border-radius:8px;">
                    <div style="font-size:0.6rem; text-align:center; margin-top:2px; color:var(--text-secondary);">${i === 0 ? 'Daily Wallpaper' : 'Previous Day'}</div>
                </div>
            `).join('');

            dom.bingGallery.querySelectorAll('.bing-thumb-wrapper').forEach((w, i) => w.addEventListener('click', () => {
                settings.backgroundType = 'bing';
                // Set 'bing_latest' for the first one so it auto-updates tomorrow
                settings.backgroundValue = (i === 0) ? 'bing_latest' : w.dataset.url;
                saveSettings();
            }));
        } catch (e) {
            dom.bingGallery.innerHTML = '<p class="subtext">Failed to fetch Bing gallery. Check your connection.</p>';
        }
    }

    // --- Theme Library (Premium Categorized) ---
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
            { name: 'Tiger', url: 'https://images.unsplash.com/photo-1503066211283-f94ff1a2f021?auto=format&fit=crop&w=1920&q=80' }
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
            { name: 'Animated GIF', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2I4Y2M1N2YyYzhjYjYyYjYyYjYyYjYyYjYyYjYyJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxu5L9Yx7u8/giphy.gif' }
        ]
    };

    function renderThemeLibrary() {
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
                settings.backgroundType = 'canvas';
                settings.canvasStyle = url.split(':')[1];
            } else {
                settings.backgroundType = 'preset';
                settings.backgroundValue = url;
            }
            saveSettings();
        }));
    }

    // --- Notes & Apps ---
    // --- Notes Management ---
    let currentNoteId = null;

    async function renderNotesList() {
        if (!dom.notesList) return;
        const notes = await StorageManager.getAll('notes');
        dom.notesCount.textContent = notes.length;

        if (notes.length === 0) {
            dom.notesList.innerHTML = '<div class="notes-empty">No notes yet. Click + New to start.</div>';
            return;
        }

        dom.notesList.innerHTML = notes.sort((a, b) => (b.updated || 0) - (a.updated || 0)).map(n => `
            <div class="note-card" data-id="${n.id}">
                <div class="note-card-title">${n.title || 'Untitled Note'}</div>
                <div class="note-card-preview">${n.body ? n.body.substring(0, 60).replace(/\n/g, ' ') : 'Empty note...'}</div>
                <div class="note-card-meta">${new Date(n.updated || Date.now()).toLocaleDateString()}</div>
            </div>
        `).join('');

        dom.notesList.querySelectorAll('.note-card').forEach(card => {
            card.onclick = () => openNoteEditor(card.dataset.id);
        });
    }

    async function openNoteEditor(id = null) {
        currentNoteId = id || 'note_' + Date.now();
        let note = id ? await StorageManager.get('notes', id) : { id: currentNoteId, title: '', body: '', updated: Date.now() };

        dom.noteEditorTitle.value = note.title || '';
        dom.noteEditorBody.value = note.body || '';
        dom.noteSaveStatus.textContent = id ? 'Last saved ' + new Date(note.updated).toLocaleTimeString() : 'New note';

        dom.noteEditor.classList.remove('hidden');
        dom.notesList.classList.add('hidden');
        dom.noteEditorBody.focus();
        updateCharCount();
    }

    function updateCharCount() {
        const count = dom.noteEditorBody.value.length;
        dom.noteCharCount.textContent = `${count} character${count === 1 ? '' : 's'}`;
    }

    async function saveCurrentNote() {
        if (!currentNoteId) return;
        const title = dom.noteEditorTitle.value.trim();
        const body = dom.noteEditorBody.value;

        if (!title && !body) return;

        const note = {
            id: currentNoteId,
            title: title,
            body: body,
            updated: Date.now()
        };

        await StorageManager.set('notes', currentNoteId, note);
        dom.noteSaveStatus.textContent = 'Saved ' + new Date().toLocaleTimeString();
        renderNotesList();
    }

    async function deleteCurrentNote() {
        if (!currentNoteId) return;
        if (confirm('Are you sure you want to delete this note?')) {
            await StorageManager.remove('notes', currentNoteId);
            closeNoteEditor();
            renderNotesList();
        }
    }

    function closeNoteEditor() {
        dom.noteEditor.classList.add('hidden');
        dom.notesList.classList.remove('hidden');
        currentNoteId = null;
    }

    function renderApps() {
        const renderTab = (arr, el) => {
            if (!el) return;
            el.innerHTML = (arr || []).map(app => `<a href="${app.url}" class="app-item"><img src="${app.icon || 'https://www.google.com/s2/favicons?domain=' + app.url}" alt="${app.name}"><span>${app.name}</span></a>`).join('');
        };
        renderTab(settings.googleApps, dom.googleAppsGrid);
        renderTab(settings.msApps, dom.msAppsGrid);
        renderTab(settings.aiApps, dom.aiAppsGrid);
        renderTab(settings.customApps, dom.customAppsGrid);
    }

    function saveCustomApp() {
        const name = dom.appNameInput.value.trim();
        const url = dom.appUrlInput.value.trim();
        if (!name || !url) return;
        const icon = dom.appIconInput.value.trim() || `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`;
        settings.customApps.push({ name, url, icon });
        saveSettings();
        renderApps();
        dom.addAppModal.classList.add('hidden');
        dom.appNameInput.value = '';
        dom.appUrlInput.value = '';
        dom.appIconInput.value = '';
    }

    function getSearchUrl() {
        const engine = settings.searchEngine;
        if (engine === 'custom_engine') {
            return settings.customSearchUrl || 'https://www.google.com/search?q=%s';
        }
        const urls = {
            google: 'https://www.google.com/search?q=%s',
            duckduckgo: 'https://duckduckgo.com/?q=%s',
            bing: 'https://www.bing.com/search?q=%s',
            brave: 'https://search.brave.com/search?q=%s',
            chatgpt: 'https://chatgpt.com/search?q=%s',
            perplexity: 'https://www.perplexity.ai/search?q=%s',
            huggingface: 'https://huggingface.co/spaces?search=%s',
            github_copilot: 'https://github.com/search?q=%s&type=code',
        };
        return urls[engine] || urls.google;
    }

    function syncSettingsUI() {
        if (!document.querySelector(`input[name="theme_preference"]`)) return;
        // Appearance
        document.querySelector(`input[name="theme_preference"][value="${settings.themePreference}"]`).checked = true;
        dom.showNoosphereToggle.checked = settings.showNoosphereBar;
        dom.showSettingsInImmersiveToggle.checked = settings.showSettingsButtonInImmersive;
        dom.showMainUIToggle.checked = settings.showMainUI;

        // Background
        dom.bgTypeSelect.value = settings.backgroundType;
        syncBackgroundOptions();
        dom.canvasStyleSelect.value = settings.canvasStyle;
        dom.bgCustomUrl.value = settings.backgroundType === 'custom' ? settings.backgroundValue : '';

        // Search
        dom.toggleSearch.checked = settings.showSearch;
        const currentEngineRadio = document.querySelector(`input[name="search_engine"][value="${settings.searchEngine}"]`);
        if (currentEngineRadio) currentEngineRadio.checked = true;
        dom.customSearchUrlInput.value = settings.customSearchUrl;

        // Top Sites
        dom.toggleTopSites.checked = settings.showTopSites;
        if (document.querySelector(`input[name="topsites_source"][value="${settings.topSitesSource}"]`)) {
            document.querySelector(`input[name="topsites_source"][value="${settings.topSitesSource}"]`).checked = true;
        }

        // Clock
        dom.toggleClock.checked = settings.showClock;
        dom.clockFormatSelect.value = settings.clockFormat;

        // Cards
        dom.toggleCards.checked = settings.showCards;
        dom.toggleCardDate.checked = settings.showCardDate;
        dom.toggleCardFocus.checked = settings.showCardFocus;
        dom.toggleCardNote.checked = settings.showCardNote;
    }

    function syncBackgroundOptions() {
        const type = dom.bgTypeSelect.value;
        dom.bgCanvasOptions.classList.toggle('hidden', type !== 'canvas');
        dom.bgBingOptions.classList.toggle('hidden', type !== 'bing');
        dom.bgPresetOptions.classList.toggle('hidden', type !== 'preset');
        dom.bgSolidOptions.classList.toggle('hidden', type !== 'solid');
        dom.bgLocalOptions.classList.toggle('hidden', type !== 'local');
        dom.bgCustomOptions.classList.toggle('hidden', type !== 'custom');
    }

    function renderShortcuts() {
        if (!dom.topSitesWidget) return;
        dom.topSitesWidget.innerHTML = '';
        if (settings.topSitesSource === 'favorites') {
            (settings.shortcuts || []).forEach((sc, i) => {
                const a = document.createElement('a');
                a.href = sc.url;
                a.className = 'shortcut';
                a.style.setProperty('--item-index', i);
                const iconUrl = sc.icon || `https://www.google.com/s2/favicons?sz=64&domain_url=${sc.url}`;
                a.innerHTML = `<img src="${iconUrl}" alt="${sc.name}"><span>${sc.name}</span>`;
                dom.topSitesWidget.appendChild(a);
            });
        } else {
            chrome.topSites.get(sites => {
                sites.slice(0, 8).forEach((site, i) => {
                    const a = document.createElement('a');
                    a.href = site.url;
                    a.className = 'shortcut';
                    a.style.setProperty('--item-index', i);
                    const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${site.url}`;
                    a.innerHTML = `<img src="${iconUrl}" alt="${site.title}"><span>${site.title}</span>`;
                    dom.topSitesWidget.appendChild(a);
                });
            });
        }
        renderManagedShortcuts();
    }

    function addShortcut() {
        const name = dom.newShortcutName.value.trim();
        const url = dom.newShortcutUrl.value.trim();
        if (name && url) {
            if (!settings.shortcuts) settings.shortcuts = [];
            settings.shortcuts.push({ name, url, icon: '' });
            saveSettings();
            renderShortcuts();
            dom.newShortcutName.value = '';
            dom.newShortcutUrl.value = '';
        }
    }

    function removeShortcut(index) {
        settings.shortcuts.splice(index, 1);
        saveSettings();
        renderShortcuts();
    }

    function renderManagedShortcuts() {
        if (!dom.shortcutsList) return;
        dom.shortcutsList.innerHTML = (settings.shortcuts || []).map((sc, i) => `
            <div class="managed-item">
                <div>
                    <strong>${sc.name}</strong>
                    <span>${sc.url}</span>
                </div>
                <div class="managed-item-actions">
                    <button data-index="${i}" class="remove-shortcut-btn">Remove</button>
                </div>
            </div>
        `).join('');
        dom.shortcutsList.querySelectorAll('.remove-shortcut-btn').forEach(btn => {
            btn.onclick = () => removeShortcut(parseInt(btn.dataset.index));
        });
    }

    function updateCards() {
        if (!settings.showCards) return;
        if (dom.cardDateEl) dom.cardDateEl.classList.toggle('hidden', !settings.showCardDate);
        if (dom.cardFocusEl) dom.cardFocusEl.classList.toggle('hidden', !settings.showCardFocus);
        if (dom.cardNoteEl) dom.cardNoteEl.classList.toggle('hidden', !settings.showCardNote);

        const now = new Date();
        if (dom.cardDateValue) dom.cardDateValue.textContent = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
        if (dom.cardDateDay) dom.cardDateDay.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
    }

    // --- Initialization ---
    // --- Initialization ---
    (async function init() {
        await StorageManager.init();

        const saved = await StorageManager.get('settings', 'main');
        if (saved) {
            settings = { ...defaultSettings, ...saved };
        } else {
            const local = localStorage.getItem('abdus_dashboard_settings');
            if (local) {
                try {
                    settings = { ...defaultSettings, ...JSON.parse(local) };
                    await StorageManager.set('settings', 'main', settings);
                } catch (e) {
                    console.error("Error parsing settings from localStorage", e);
                }
            }
        }

        applySettings();
        updateTime();
        setInterval(updateTime, 1000);
        renderApps();
        renderNotesList();
        renderThemeLibrary();
        renderShortcuts();
        updateCards();

        // --- Event Listeners ---
        if (dom.settingsBtn) dom.settingsBtn.onclick = () => {
            syncSettingsUI();
            dom.modalOverlay.classList.toggle('hidden');
        };
        if (dom.closeBtn) dom.closeBtn.onclick = () => dom.modalOverlay.classList.add('hidden');

        // Background Settings
        if (dom.bgTypeSelect) dom.bgTypeSelect.onchange = (e) => {
            settings.backgroundType = e.target.value;
            if (e.target.value === 'bing') settings.backgroundValue = 'bing_latest';
            saveSettings();
            syncBackgroundOptions();
            if (e.target.value === 'bing') loadBingGallery();
        };
        if (dom.canvasStyleSelect) dom.canvasStyleSelect.onchange = e => { settings.canvasStyle = e.target.value; saveSettings(); };
        if (dom.bgCustomUrl) dom.bgCustomUrl.onchange = e => { settings.backgroundValue = e.target.value; saveSettings(); };
        if (dom.bgLocalFile) dom.bgLocalFile.onchange = async e => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    await StorageManager.set('mediaStore', 'localBackground', { data: ev.target.result, type: file.type });
                    settings.backgroundValue = 'local';
                    settings.backgroundType = 'local';
                    saveSettings();
                };
                reader.readAsDataURL(file);
            }
        };

        // Appearance
        document.getElementsByName('theme_preference').forEach(radio => {
            radio.onchange = (e) => { settings.themePreference = e.target.value; saveSettings(); };
        });
        if (dom.showNoosphereToggle) dom.showNoosphereToggle.onchange = e => { settings.showNoosphereBar = e.target.checked; saveSettings(); };
        if (dom.showSettingsInImmersiveToggle) dom.showSettingsInImmersiveToggle.onchange = e => { settings.showSettingsButtonInImmersive = e.target.checked; saveSettings(); };
        if (dom.showMainUIToggle) dom.showMainUIToggle.onchange = e => { settings.showMainUI = e.target.checked; saveSettings(); };

        // Search
        if (dom.toggleSearch) dom.toggleSearch.onchange = e => { settings.showSearch = e.target.checked; saveSettings(); };
        document.getElementsByName('search_engine').forEach(radio => {
            radio.onchange = e => { settings.searchEngine = e.target.value; saveSettings(); };
        });
        if (dom.customSearchUrlInput) dom.customSearchUrlInput.onchange = e => { settings.customSearchUrl = e.target.value; saveSettings(); };

        // Top Sites
        if (dom.toggleTopSites) dom.toggleTopSites.onchange = e => { settings.showTopSites = e.target.checked; saveSettings(); renderShortcuts(); };
        document.getElementsByName('topsites_source').forEach(radio => {
            radio.onchange = e => { settings.topSitesSource = e.target.value; saveSettings(); renderShortcuts(); };
        });
        if (dom.addShortcutBtn) dom.addShortcutBtn.onclick = addShortcut;

        // Clock
        if (dom.toggleClock) dom.toggleClock.onchange = e => { settings.showClock = e.target.checked; saveSettings(); };
        if (dom.clockFormatSelect) dom.clockFormatSelect.onchange = e => { settings.clockFormat = e.target.value; saveSettings(); };

        // Cards
        if (dom.toggleCards) dom.toggleCards.onchange = e => { settings.showCards = e.target.checked; saveSettings(); };
        if (dom.toggleCardDate) dom.toggleCardDate.onchange = e => { settings.showCardDate = e.target.checked; saveSettings(); };
        if (dom.toggleCardFocus) dom.toggleCardFocus.onchange = e => { settings.showCardFocus = e.target.checked; saveSettings(); };
        if (dom.toggleCardNote) dom.toggleCardNote.onchange = e => { settings.showCardNote = e.target.checked; saveSettings(); };

        // Notes
        if (dom.addNoteBtn) dom.addNoteBtn.onclick = () => openNoteEditor();
        if (dom.noteBackBtn) dom.noteBackBtn.onclick = closeNoteEditor;
        if (dom.noteDeleteBtn) dom.noteDeleteBtn.onclick = deleteCurrentNote;

        let saveTimeout;
        const autoSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveCurrentNote, 800);
        };
        if (dom.noteEditorTitle) dom.noteEditorTitle.oninput = autoSave;
        if (dom.noteEditorBody) dom.noteEditorBody.oninput = () => { autoSave(); updateCharCount(); };

        // Search Engine & Suggestions Logic
        if (dom.searchInput) {
            dom.searchInput.oninput = async (e) => {
                const query = e.target.value.trim();
                if (!query) { dom.searchSuggestions.classList.add('hidden'); return; }
                try {
                    const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    const suggestions = data[1] || [];
                    dom.searchSuggestions.innerHTML = suggestions.map(s => `<li class="suggestion-item"><span>${s}</span></li>`).join('');
                    dom.searchSuggestions.classList.toggle('hidden', suggestions.length === 0);
                    dom.searchSuggestions.querySelectorAll('li').forEach(li => {
                        li.onclick = () => { dom.searchInput.value = li.textContent; dom.searchForm.requestSubmit(); };
                    });
                } catch (err) { }
            };
            dom.searchForm.onsubmit = (e) => {
                e.preventDefault();
                const query = dom.searchInput.value.trim();
                if (!query) return;
                const url = getSearchUrl().replace('%s', encodeURIComponent(query));
                window.location.href = url;
            };
        }

        // Sidebar Tabs
        dom.sidebarTabs.forEach(tab => {
            tab.onclick = () => {
                dom.sidebarTabs.forEach(t => t.classList.remove('active'));
                dom.tabPanes.forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            };
        });

        // Apps Launcher
        if (dom.appsLauncherBtn) dom.appsLauncherBtn.onclick = () => dom.appsDropdown.classList.toggle('hidden');
        if (dom.appTabs) dom.appTabs.forEach(tab => {
            tab.onclick = () => {
                dom.appTabs.forEach(t => t.classList.remove('active'));

                // Initial sync of UI elements to match loaded settings
                syncSettingsUI();
                dom.appPanes.forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            };
        });
        if (dom.addAppBtn) dom.addAppBtn.onclick = () => dom.addAppModal.classList.remove('hidden');
        if (dom.closeAddAppBtn) dom.closeAddAppBtn.onclick = () => dom.addAppModal.classList.add('hidden');
        if (dom.saveAppBtn) dom.saveAppBtn.onclick = saveCustomApp;

        if (settings.backgroundType === 'bing') loadBingGallery();
    })();
})();
