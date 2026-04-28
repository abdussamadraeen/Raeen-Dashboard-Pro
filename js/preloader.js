(function() {
    try {
        const bgType = localStorage.getItem('abdus_bg_type');
        const bgValue = localStorage.getItem('abdus_bg_value');
        
        if (bgType === 'google_dashboard' || bgType === 'bing_dashboard') {
            document.documentElement.classList.add('live-bg-pre-active');
            const style = document.createElement('style');
            style.textContent = 'body { background: #000000 !important; } .container, .top-left-widget, .noosphere-status, .noosphere-status-horizontal { display: none !important; }';
            document.documentElement.appendChild(style);
        } else if (bgType === 'preset' || bgType === 'custom') {
            if (bgValue && !bgValue.match(/\.(mp4|webm|ogg)$/i)) {
                const style = document.createElement('style');
                style.textContent = `body { background-image: url('${bgValue}') !important; background-size: cover !important; background-position: center !important; }`;
                document.documentElement.appendChild(style);
            }
        } else if (bgType === 'solid') {
            if (bgValue) {
                const style = document.createElement('style');
                style.textContent = `body { background: ${bgValue} !important; }`;
                document.documentElement.appendChild(style);
            }
        }
    } catch(e) {}
})();
