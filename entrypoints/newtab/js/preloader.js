(function() {
    try {
        // 1. Instant Zero-Latency Theme Sync
        const theme = localStorage.getItem('raeen_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        // 2. Instant Background Pre-paint
        const bgType = localStorage.getItem('raeen_bg_type') || 'google_dashboard';
        const bgValue = localStorage.getItem('raeen_bg_value') || 'https://www.google.com/?raeen_dashboard=true';
        
        if (bgType === 'google_dashboard' || bgType === 'bing_dashboard') {
            document.documentElement.classList.add('live-bg-pre-active');
            const style = document.createElement('style');
            style.id = 'raeen-live-preloader-style';
            style.setAttribute('data-preloader', 'true');
            style.textContent = 'body { background: #000000 !important; } .container, .top-left-widget, .noosphere-status, .noosphere-status-horizontal { display: none !important; }';
            document.documentElement.appendChild(style);
        } else if (bgType === 'brave' || bgType === 'preset' || bgType === 'custom') {
            if (bgValue && !bgValue.match(/\.(mp4|webm|ogg)$/i) && bgValue !== 'brave_random') {
                const style = document.createElement('style');
                style.id = 'raeen-theme-preloader-style';
                style.setAttribute('data-preloader', 'true');
                style.textContent = `body { background-image: url('${bgValue}') !important; background-size: cover !important; background-position: center !important; }`;
                document.documentElement.appendChild(style);
            }
        } else if (bgType === 'solid') {
            if (bgValue) {
                const style = document.createElement('style');
                style.id = 'raeen-theme-preloader-style';
                style.setAttribute('data-preloader', 'true');
                style.textContent = `body { background: ${bgValue} !important; }`;
                document.documentElement.appendChild(style);
            }
        }
    } catch(e) {}
})();
