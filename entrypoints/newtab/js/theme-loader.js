(function() {
    try {
        var theme = localStorage.getItem('app_theme') || localStorage.getItem('raeen_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);

        var mode = localStorage.getItem('app_dashboard_mode') || localStorage.getItem('raeen_dashboard_mode') || 'pro';
        document.documentElement.setAttribute('data-dashboard-mode', mode);
        if (mode === 'minimal') {
            document.documentElement.classList.add('dashboard-mode-minimal');
        }
        document.documentElement.classList.add('no-transitions');

        // Apply cached wallpaper immediately to avoid black screen flash
        var bgType = localStorage.getItem('app_bg_type') || localStorage.getItem('raeen_bg_type') || 'curated';
        var bgValue = localStorage.getItem('app_bg_value') || localStorage.getItem('raeen_bg_value') || 'curated_random';
        var cachedUrl = (bgValue && !bgValue.match(/\.(mp4|webm|ogg)$/i) && bgValue !== 'curated_random' && bgValue !== 'brave_random')
            ? bgValue
            : (localStorage.getItem('last_curated_url') || '');

        var css = '';
        if (cachedUrl) {
            css += '#background-layer { background-image: url("' + cachedUrl + '"); } ';
        }
        if (mode === 'minimal') {
            css += '.info-card, #directory-widget, #notes-widget, .noosphere-status, .noosphere-status-horizontal { display: none !important; } ';
            css += '#clock-widget { position: fixed !important; top: 32px !important; left: 44px !important; z-index: 60 !important; } ';
            css += '#search-widget { position: fixed !important; left: 50% !important; top: 48vh !important; transform: translate3d(-50%, -50%, 0) !important; width: 440px !important; z-index: 200 !important; } ';
            css += '.container { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; } ';
            css += '.layout-column, #cards-widget { display: contents !important; } ';
        }
        if (bgType === 'solid' && bgValue) {
            var effectiveBg = (theme === 'light' && (bgValue === '#0f0f17' || bgValue === '#000000')) ? '#f8fafc' : bgValue;
            document.documentElement.style.setProperty('--bg-body', effectiveBg);
        }
        if (css) {
            var styleEl = document.createElement('style');
            styleEl.id = 'pre-boot-critical-css';
            styleEl.textContent = css;
            document.documentElement.appendChild(styleEl);
        }
    } catch(e) {}
})();
