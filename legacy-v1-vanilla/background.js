chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'open_dashboard') {
        const url = chrome.runtime.getURL('index.html?no_redirect=true&settings=true');
        chrome.tabs.update(sender.tab.id, { url: url });
    }
});
