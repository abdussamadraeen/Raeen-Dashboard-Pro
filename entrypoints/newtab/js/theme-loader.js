(function() {
    try {
        var theme = localStorage.getItem('app_theme') || localStorage.getItem('raeen_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        var mode = localStorage.getItem('app_dashboard_mode') || localStorage.getItem('raeen_dashboard_mode') || 'pro';
        document.documentElement.setAttribute('data-dashboard-mode', mode);
        if (mode === 'minimal') {
            document.documentElement.classList.add('dashboard-mode-minimal');
        }
        var bgType = localStorage.getItem('app_bg_type') || localStorage.getItem('raeen_bg_type') || 'curated';
        var bgValue = localStorage.getItem('app_bg_value') || localStorage.getItem('raeen_bg_value') || 'curated_random';
        if (bgType === 'google_dashboard' || bgType === 'bing_dashboard') {
            document.documentElement.classList.add('live-bg-pre-active');
            var s = document.createElement('style');
            s.id = 'app-live-preloader-style';
            s.setAttribute('data-preloader', 'true');
            s.textContent = 'body { background: #000000 !important; } .container, .top-left-widget, .noosphere-status, .noosphere-status-horizontal { display: none !important; }';
            document.documentElement.appendChild(s);
        } else if (bgType === 'curated' || bgType === 'brave' || bgType === 'preset' || bgType === 'custom') {
            if (bgValue && !bgValue.match(/\.(mp4|webm|ogg)$/i) && bgValue !== 'curated_random' && bgValue !== 'brave_random') {
                var s = document.createElement('style');
                s.id = 'app-theme-preloader-style';
                s.setAttribute('data-preloader', 'true');
                s.textContent = "body { background-image: url('" + bgValue + "') !important; background-size: cover !important; background-position: center !important; }";
                document.documentElement.appendChild(s);
            }
        } else if (bgType === 'solid') {
            if (bgValue) {
                var effectiveBg = (theme === 'light' && (bgValue === '#0f0f17' || bgValue === '#000000')) ? '#f8fafc' : bgValue;
                var s = document.createElement('style');
                s.id = 'app-theme-preloader-style';
                s.setAttribute('data-preloader', 'true');
                s.textContent = "body { background: " + effectiveBg + " !important; }";
                document.documentElement.appendChild(s);
            }
        }
    } catch(e) {
        console.warn('Theme loader encountered an error:', e);
    }
})();
