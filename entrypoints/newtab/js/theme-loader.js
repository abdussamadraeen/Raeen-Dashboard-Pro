(function() {
    try {
        var theme = localStorage.getItem('raeen_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        var bgType = localStorage.getItem('raeen_bg_type') || 'google_dashboard';
        var bgValue = localStorage.getItem('raeen_bg_value') || 'https://www.google.com/?raeen_dashboard=true';
        if (bgType === 'google_dashboard' || bgType === 'bing_dashboard') {
            document.documentElement.classList.add('live-bg-pre-active');
            var s = document.createElement('style');
            s.id = 'raeen-live-preloader-style';
            s.setAttribute('data-preloader', 'true');
            s.textContent = 'body { background: #000000 !important; } .container, .top-left-widget, .noosphere-status, .noosphere-status-horizontal { display: none !important; }';
            document.documentElement.appendChild(s);
        } else if (bgType === 'brave' || bgType === 'preset' || bgType === 'custom') {
            if (bgValue && !bgValue.match(/\.(mp4|webm|ogg)$/i) && bgValue !== 'brave_random') {
                var s = document.createElement('style');
                s.id = 'raeen-theme-preloader-style';
                s.setAttribute('data-preloader', 'true');
                s.textContent = "body { background-image: url('" + bgValue + "') !important; background-size: cover !important; background-position: center !important; }";
                document.documentElement.appendChild(s);
            }
        } else if (bgType === 'solid') {
            if (bgValue) {
                var s = document.createElement('style');
                s.id = 'raeen-theme-preloader-style';
                s.setAttribute('data-preloader', 'true');
                s.textContent = "body { background: " + bgValue + " !important; }";
                document.documentElement.appendChild(s);
            }
        }
    } catch(e) {}
})();
