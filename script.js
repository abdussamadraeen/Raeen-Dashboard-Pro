// Immediately invoked function to avoid DOMContentLoaded issues since script is at the end of body
(function() {
    // --- State Management ---
    const defaultSettings = {
        themePreference: 'system', // 'system', 'light', 'dark'
        backgroundType: 'bing',
        backgroundValue: 'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=en-US',
        localBackgroundData: null,
        showSearch: true,
        searchEngine: 'google',
        showTopSites: true,
        shortcuts: [
            { name: 'GitHub', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.svg' },
            { name: 'Kaggle', url: 'https://kaggle.com', icon: 'https://www.kaggle.com/static/images/favicon.ico' },
            { name: 'Ecommerce', url: 'http://localhost:3000', icon: '' }
        ],
        showClock: true,
        use24h: false,
        useDualTime: false,
        dualTimeOffset: 0,
        showCards: false
    };

    let settings = { ...defaultSettings };
    
    // Load from localStorage
    const saved = localStorage.getItem('abdus_dashboard_settings');
    if (saved) {
        try {
            settings = { ...settings, ...JSON.parse(saved) };
        } catch (e) { console.error('Error loading settings', e); }
    }

    function saveSettings() {
        try {
            localStorage.setItem('abdus_dashboard_settings', JSON.stringify(settings));
        } catch (e) {
            console.error('Storage quota exceeded, could not save local media completely.', e);
        }
        applySettings();
    }

    // --- Curated Image Gallery ---
    const curatedGallery = [
        "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=1920&q=80",
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80",
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80",
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80",
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80",
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80",
        "https://images.unsplash.com/photo-1423784346385-c1d4dac9893a?w=1920&q=80",
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=80",
        "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80",
        "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1920&q=80",
        "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1920&q=80",
        "https://images.unsplash.com/photo-1445307806294-bff7f67ff225?w=1920&q=80"
    ];

    // --- DOM Elements ---
    const bgLayer = document.getElementById('background-layer');
    const clockWidget = document.getElementById('clock-widget');
    const timeEl = document.getElementById('time');
    const dualTimeEl = document.getElementById('dual-time');
    const searchWidget = document.getElementById('search-widget');
    const topSitesWidget = document.getElementById('top-sites-widget');
    const cardsWidget = document.getElementById('cards-widget');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchIcon = document.getElementById('search-provider-icon');

    // --- Modal Elements ---
    const settingsBtn = document.getElementById('settings-btn');
    const modalOverlay = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // --- Settings UI Elements ---
    const themeRadios = document.getElementsByName('theme_preference');
    const bgTypeSelect = document.getElementById('bg-type-select');
    const bgBingOptions = document.getElementById('bg-bing-options');
    const bgPresetOptions = document.getElementById('bg-preset-options');
    const bgSolidOptions = document.getElementById('bg-solid-options');
    const bgLocalOptions = document.getElementById('bg-local-options');
    const bgCustomOptions = document.getElementById('bg-custom-options');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const bgCustomUrl = document.getElementById('bg-custom-url');
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const localFileInput = document.getElementById('bg-local-file');
    const galleryGrid = document.getElementById('gallery-grid');

    const toggleSearch = document.getElementById('toggle-search');
    const engineRadios = document.getElementsByName('search_engine');
    const toggleTopSites = document.getElementById('toggle-topsites');
    const toggleClock = document.getElementById('toggle-clock');
    const toggle24h = document.getElementById('toggle-24h');
    const toggleDualTime = document.getElementById('toggle-dual-time');
    const dualTimeGroup = document.getElementById('dual-time-group');
    const dualTimeOffset = document.getElementById('dual-time-offset');
    const toggleCards = document.getElementById('toggle-cards');

    const newShortcutName = document.getElementById('new-shortcut-name');
    const newShortcutUrl = document.getElementById('new-shortcut-url');
    const addShortcutBtn = document.getElementById('add-shortcut-btn');
    const shortcutsList = document.getElementById('shortcuts-list');

    // --- Render Gallery ---
    function renderGallery() {
        galleryGrid.innerHTML = '';
        curatedGallery.forEach(url => {
            const div = document.createElement('div');
            div.className = 'bg-option';
            div.dataset.url = url;
            // Load a smaller thumbnail for the grid
            const thumbUrl = url.replace('w=1920', 'w=300');
            div.style.backgroundImage = `url('${thumbUrl}')`;
            
            div.addEventListener('click', () => {
                settings.backgroundType = 'preset';
                settings.backgroundValue = url;
                saveSettings();
            });
            galleryGrid.appendChild(div);
        });
    }

    // --- Apply Settings to Dashboard ---
    function applyTheme() {
        if (settings.themePreference === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else if (settings.themePreference === 'dark') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            // System
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        if (settings.themePreference === 'system') {
            applyTheme();
        }
    });

    function applySettings() {
        applyTheme();

        // Background
        bgLayer.innerHTML = ''; // clear videos if any
        if (settings.backgroundType === 'bing') {
            bgLayer.style.background = `url('https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=en-US') no-repeat center center / cover`;
        } else if (settings.backgroundType === 'preset' || settings.backgroundType === 'solid') {
            bgLayer.style.background = settings.backgroundType === 'preset' ? `url('${settings.backgroundValue}') no-repeat center center / cover` : settings.backgroundValue;
        } else if (settings.backgroundType === 'local' && settings.localBackgroundData) {
            if (settings.localBackgroundData.startsWith('data:video/')) {
                bgLayer.style.background = 'none';
                const video = document.createElement('video');
                video.src = settings.localBackgroundData;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                bgLayer.appendChild(video);
            } else {
                bgLayer.style.background = `url('${settings.localBackgroundData}') no-repeat center center / cover`;
            }
        } else if (settings.backgroundType === 'custom') {
            if (settings.backgroundValue.match(/\.(mp4|webm|ogg)$/i)) {
                bgLayer.style.background = 'none';
                const video = document.createElement('video');
                video.src = settings.backgroundValue;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                bgLayer.appendChild(video);
            } else {
                bgLayer.style.background = `url('${settings.backgroundValue}') no-repeat center center / cover`;
            }
        } else {
            bgLayer.style.background = 'var(--bg-body)'; // fallback
        }

        // Widgets Visibility
        searchWidget.classList.toggle('hidden', !settings.showSearch);
        topSitesWidget.classList.toggle('hidden', !settings.showTopSites);
        clockWidget.classList.toggle('hidden', !settings.showClock);
        cardsWidget.classList.toggle('hidden', !settings.showCards);
        dualTimeEl.classList.toggle('hidden', !settings.useDualTime);

        // Search Engine
        const engines = {
            'google': { action: 'https://www.google.com/search', param: 'q' },
            'duckduckgo': { action: 'https://duckduckgo.com/', param: 'q' },
            'brave': { action: 'https://search.brave.com/search', param: 'q' },
            'bing': { action: 'https://www.bing.com/search', param: 'q' }
        };
        const engine = engines[settings.searchEngine] || engines['google'];
        searchForm.action = engine.action;
        searchInput.name = engine.param;

        // Top Sites Rendering
        renderTopSites();

        // Sync Modal UI with current settings
        syncModalUI();
    }

    function renderTopSites() {
        topSitesWidget.innerHTML = '';
        settings.shortcuts.forEach((sc, index) => {
            const a = document.createElement('a');
            a.href = sc.url;
            a.className = 'shortcut';
            
            if (sc.icon) {
                const img = document.createElement('img');
                img.src = sc.icon;
                img.alt = sc.name;
                img.onerror = () => { img.style.display='none'; a.prepend(createIconPlaceholder(sc.name)); };
                a.appendChild(img);
            } else {
                a.appendChild(createIconPlaceholder(sc.name));
            }
            
            const span = document.createElement('span');
            span.textContent = sc.name;
            a.appendChild(span);
            
            topSitesWidget.appendChild(a);
        });

        // Update settings list
        shortcutsList.innerHTML = '';
        settings.shortcuts.forEach((sc, index) => {
            const div = document.createElement('div');
            div.className = 'managed-item';
            div.innerHTML = `
                <div><strong>${sc.name}</strong> <span style="font-size:0.8em;opacity:0.7">${sc.url}</span></div>
                <div class="managed-item-actions"><button data-index="${index}">Remove</button></div>
            `;
            shortcutsList.appendChild(div);
        });
    }

    function createIconPlaceholder(name) {
        const div = document.createElement('div');
        div.className = 'icon-placeholder';
        div.textContent = name.charAt(0).toUpperCase();
        return div;
    }

    // --- Sync Modal with Settings ---
    function syncModalUI() {
        // Theme
        Array.from(themeRadios).forEach(r => {
            r.checked = (r.value === settings.themePreference);
        });

        // Background
        bgTypeSelect.value = settings.backgroundType;
        bgBingOptions.classList.toggle('hidden', settings.backgroundType !== 'bing');
        bgPresetOptions.classList.toggle('hidden', settings.backgroundType !== 'preset');
        bgSolidOptions.classList.toggle('hidden', settings.backgroundType !== 'solid');
        bgLocalOptions.classList.toggle('hidden', settings.backgroundType !== 'local');
        bgCustomOptions.classList.toggle('hidden', settings.backgroundType !== 'custom');

        if (settings.backgroundType === 'solid' && !settings.backgroundValue.includes('url') && !settings.backgroundValue.includes('gradient')) {
            bgColorPicker.value = settings.backgroundValue.startsWith('#') ? settings.backgroundValue.substring(0,7) : '#1a1a2e';
        }
        if (settings.backgroundType === 'custom') bgCustomUrl.value = settings.backgroundValue;
        
        const galleryDivs = document.querySelectorAll('.bg-option');
        galleryDivs.forEach(div => {
            div.classList.toggle('selected', settings.backgroundType === 'preset' && div.dataset.url === settings.backgroundValue);
        });
        
        colorSwatches.forEach(swatch => {
            swatch.classList.toggle('selected', settings.backgroundType === 'solid' && swatch.dataset.color === settings.backgroundValue);
        });

        // Toggles
        toggleSearch.checked = settings.showSearch;
        toggleTopSites.checked = settings.showTopSites;
        toggleClock.checked = settings.showClock;
        toggle24h.checked = settings.use24h;
        toggleDualTime.checked = settings.useDualTime;
        toggleCards.checked = settings.showCards;
        dualTimeOffset.value = settings.dualTimeOffset;
        dualTimeGroup.style.display = settings.useDualTime ? 'block' : 'none';

        Array.from(engineRadios).forEach(r => {
            r.checked = (r.value === settings.searchEngine);
        });
    }

    // --- Event Listeners for UI ---
    
    // Modal Open/Close
    settingsBtn.addEventListener('click', () => modalOverlay.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
    });

    // Tab Switching
    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            sidebarTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // Theme Settings
    Array.from(themeRadios).forEach(r => {
        r.addEventListener('change', (e) => {
            if(e.target.checked) { settings.themePreference = e.target.value; saveSettings(); }
        });
    });

    // Background Settings
    bgTypeSelect.addEventListener('change', (e) => {
        settings.backgroundType = e.target.value;
        if (settings.backgroundType === 'preset') settings.backgroundValue = curatedGallery[0];
        else if (settings.backgroundType === 'solid') settings.backgroundValue = colorSwatches[0].dataset.color;
        else if (settings.backgroundType === 'custom') settings.backgroundValue = bgCustomUrl.value || '';
        saveSettings();
    });

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            settings.backgroundType = 'solid';
            settings.backgroundValue = swatch.dataset.color;
            saveSettings();
        });
    });

    bgColorPicker.addEventListener('input', (e) => {
        settings.backgroundType = 'solid';
        settings.backgroundValue = e.target.value;
        saveSettings();
    });

    localFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            settings.backgroundType = 'local';
            settings.localBackgroundData = event.target.result;
            saveSettings();
        };
        reader.readAsDataURL(file);
    });

    bgCustomUrl.addEventListener('change', (e) => {
        settings.backgroundValue = e.target.value;
        saveSettings();
    });

    // Search Settings
    toggleSearch.addEventListener('change', (e) => { settings.showSearch = e.target.checked; saveSettings(); });
    Array.from(engineRadios).forEach(r => {
        r.addEventListener('change', (e) => {
            if(e.target.checked) { settings.searchEngine = e.target.value; saveSettings(); }
        });
    });

    // Top Sites Settings
    toggleTopSites.addEventListener('change', (e) => { settings.showTopSites = e.target.checked; saveSettings(); });
    addShortcutBtn.addEventListener('click', () => {
        const name = newShortcutName.value.trim();
        let url = newShortcutUrl.value.trim();
        
        if (name && url) {
            if (!/^https?:\/\//i.test(url)) {
                url = 'http://' + url;
            }
            let icon = '';
            try {
                const urlObj = new URL(url);
                icon = `${urlObj.origin}/favicon.ico`;
            } catch(e){}
            settings.shortcuts.push({ name, url, icon });
            newShortcutName.value = '';
            newShortcutUrl.value = '';
            saveSettings();
        }
    });
    shortcutsList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const idx = parseInt(e.target.dataset.index, 10);
            settings.shortcuts.splice(idx, 1);
            saveSettings();
        }
    });

    // Clock Settings
    toggleClock.addEventListener('change', (e) => { settings.showClock = e.target.checked; saveSettings(); });
    toggle24h.addEventListener('change', (e) => { settings.use24h = e.target.checked; saveSettings(); });
    toggleDualTime.addEventListener('change', (e) => { 
        settings.useDualTime = e.target.checked; 
        saveSettings(); 
    });
    dualTimeOffset.addEventListener('change', (e) => {
        settings.dualTimeOffset = parseInt(e.target.value, 10) || 0;
        saveSettings();
    });

    // Cards Settings
    toggleCards.addEventListener('change', (e) => { settings.showCards = e.target.checked; saveSettings(); });


    // --- Time Update Logic ---
    function updateTime() {
        if (!settings.showClock) return;

        const now = new Date();
        timeEl.textContent = formatTime(now, settings.use24h);

        if (settings.useDualTime) {
            const dualNow = new Date(now.getTime() + (settings.dualTimeOffset * 60 * 60 * 1000));
            dualTimeEl.textContent = formatTime(dualNow, settings.use24h);
        }
    }

    function formatTime(date, use24h) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        
        if (!use24h) {
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
        }
        
        hours = hours < 10 && use24h ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        
        return `${hours}:${minutes}`;
    }

    // Initialization
    renderGallery();
    applySettings();
    updateTime();
    setInterval(updateTime, 1000);
    if (settings.showSearch) searchInput.focus();
})();
