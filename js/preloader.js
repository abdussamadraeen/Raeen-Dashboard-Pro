(function() {
    try {
        const bgType = localStorage.getItem('abdus_bg_type');
        if (bgType === 'google_dashboard' || bgType === 'bing_dashboard') {
            document.documentElement.classList.add('live-bg-pre-active');
            // Force immediate style update
            const style = document.createElement('style');
            style.textContent = 'body { background: #000000 !important; } .container, .top-left-widget, .noosphere-status, .noosphere-status-horizontal { display: none !important; }';
            document.documentElement.appendChild(style);
        }
    } catch(e) {}
})();
