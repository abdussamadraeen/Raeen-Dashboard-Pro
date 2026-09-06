(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('raeen_dashboard') || window.location.href.includes('raeen_dashboard=true')) {
        
        // Clean URL immediately — strip raeen_dashboard param, keep just origin/pathname
        function cleanUrl() {
            const url = new URL(window.location.href);
            url.searchParams.delete('raeen_dashboard');
            url.searchParams.delete('abdus_dashboard'); // Clean old legacy too
            const newURL = url.pathname + url.search + url.hash;
            window.history.replaceState({}, document.title, newURL);
        }

        // Run immediately, and again after full load to override any Google re-writes
        cleanUrl();
        window.addEventListener('load', cleanUrl);
        // Final safety net — run 1.5s after load in case Google re-sets it
        window.addEventListener('load', () => setTimeout(cleanUrl, 1500));
        
        // Clean up legacy button if present
        const oldBtn = document.querySelector('.raeen-settings-btn');
        if (oldBtn) oldBtn.remove();
    }
})();
