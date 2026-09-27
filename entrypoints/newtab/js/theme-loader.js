(function() {
    try {
        var theme = localStorage.getItem('app_theme') || localStorage.getItem('raeen_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);

        var mode = localStorage.getItem('app_dashboard_mode') || localStorage.getItem('raeen_dashboard_mode') || 'google_live';
        document.documentElement.setAttribute('data-dashboard-mode', mode);
        if (mode === 'minimal') {
            document.documentElement.classList.add('dashboard-mode-minimal');
        }
        document.documentElement.classList.add('no-transitions');

        var bgType = localStorage.getItem('app_bg_type') || localStorage.getItem('raeen_bg_type') || 'google_dashboard';
        var bgValue = localStorage.getItem('app_bg_value') || localStorage.getItem('raeen_bg_value') || 'https://www.google.com/?raeen_dashboard=true&app_dashboard=true';

        var css = '';

        // 1. Live Background Mode (Google / Bing Iframe)
        if (bgType === 'google_dashboard' || bgType === 'bing_dashboard' || mode === 'google_live' || mode === 'bing_live') {
            document.documentElement.classList.add('live-bg-pre-active');
            css += '.overlay, .container, .top-left-widget, .noosphere-status, .noosphere-status-horizontal, #canvas-layer, #background-layer-next, .settings-btn { display: none !important; } ';
            css += '#background-layer { z-index: 1000 !important; background: #000000 !important; width: 100vw !important; height: 100vh !important; pointer-events: auto !important; } ';
            css += '.live-dock { display: flex !important; } ';
        } else if (bgType === 'canvas') {
            // 2. Interactive Canvas
            css += '#canvas-layer { display: block !important; z-index: 1 !important; } #background-layer, #background-layer-next { display: none !important; } ';
        } else if (bgType === 'solid') {
            // 3. Solid / Gradient Background
            css += '#background-layer, #background-layer-next { display: none !important; } ';
            if (bgValue) {
                var effectiveBg = (theme === 'light' && (bgValue === '#0f0f17' || bgValue === '#000000')) ? '#f8fafc' : bgValue;
                document.documentElement.style.setProperty('--bg-body', effectiveBg);
            }
        } else {
            // 4. Photographic & Curated Wallpapers (Bing, Brave/Curated, Preset, Custom)
            var cachedUrl = '';
            try { cachedUrl = sessionStorage.getItem('active_tab_wallpaper') || ''; } catch(e) {}
            if (!cachedUrl) {
                if (bgType === 'bing') {
                    cachedUrl = localStorage.getItem('last_bing_url') || localStorage.getItem('last_curated_url') || '';
                } else if (bgValue && !bgValue.match(/\.(mp4|webm|ogg)$/i) && bgValue !== 'curated_random' && bgValue !== 'brave_random' && !bgValue.startsWith('canvas:') && !bgValue.includes('dashboard')) {
                    cachedUrl = bgValue;
                } else {
                    cachedUrl = localStorage.getItem('last_curated_url') || '';
                }
            }
            if (cachedUrl) {
                css += '#background-layer { background-image: url("' + cachedUrl + '"); } ';
            }
        }

        // 5. Dashboard Mode Pre-Boot Positioning & Card Hiding (Zero-flash across all workspaces)
        if (mode === 'minimal') {
            css += '.info-card, #directory-widget, #notes-widget, .noosphere-status, .noosphere-status-horizontal { display: none !important; } ';
            css += '#clock-widget { position: fixed !important; top: 32px !important; left: 44px !important; z-index: 60 !important; } ';
            css += '#search-widget { position: fixed !important; left: 50% !important; top: 48vh !important; transform: translate3d(-50%, -50%, 0) !important; width: 440px !important; z-index: 200 !important; } ';
            css += '.container { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; } ';
            css += '.layout-column, #cards-widget { display: contents !important; } ';
        } else if (mode === 'focus') {
            css += '#card-security, #card-fileshare, #directory-widget, #card-image-compressor, #card-pdf-tools, .noosphere-status, .noosphere-status-horizontal { display: none !important; } ';
        } else if (mode === 'security') {
            css += '#card-date, #card-focus, #card-fileshare, #directory-widget, #card-image-compressor, #card-pdf-tools, .noosphere-status, .noosphere-status-horizontal { display: none !important; } ';
        } else if (mode === 'creator') {
            css += '#card-date, #card-focus, #card-security, #directory-widget, .noosphere-status, .noosphere-status-horizontal { display: none !important; } ';
        } else if (mode === 'pro') {
            css += '#card-image-compressor, #card-pdf-tools, #card-security, #card-fileshare, .noosphere-status, .noosphere-status-horizontal { display: none !important; } ';
        }

        if (css) {
            var styleEl = document.createElement('style');
            styleEl.id = 'pre-boot-critical-css';
            styleEl.textContent = css;
            document.documentElement.appendChild(styleEl);
        }
    } catch(e) {}
})();
