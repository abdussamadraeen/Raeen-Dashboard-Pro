import { state as t, saveSettings as y } from "./state.js";
import { dom as e } from "./dom.js";
import { StorageManager as p } from "./storage.js";
import { themeLibrary as k } from "./themes.js";
import { CanvasEngine as b } from "./canvas.js";

let c = { backgroundType: null, backgroundValue: null, canvasStyle: null };
let u = null;

function v() {
    if (u) {
        URL.revokeObjectURL(u);
        u = null;
    }
    if (e.bgLayer) {
        e.bgLayer.innerHTML = "";
        e.bgLayer.style.backgroundImage = "";
        e.bgLayer.style.backgroundColor = "transparent";
    }
}

async function S() {
    document.title = t.settings.dashboardTitle || "New Tab";
    document.documentElement.setAttribute("data-theme", t.settings.themePreference);
    
    let s = t.settings.backgroundType;
    const a = t.settings.backgroundValue;
    const n = t.settings.canvasStyle || "neural";
    
    if (e.bgLayer) {
        e.bgLayer.style.opacity = "1";
    }
    
    if (c.backgroundType !== s || c.backgroundValue !== a || (s === "canvas" && c.canvasStyle !== n)) {
        if (c.backgroundType !== s || s === "canvas" || c.backgroundType === "canvas") {
            v();
            b.stop();
            if (e.canvasLayer) {
                e.canvasLayer.classList.add("hidden");
            }
        }
        
        c.backgroundType = s;
        c.backgroundValue = a;
        c.canvasStyle = n;
        
        if (s === "canvas") {
            if (e.canvasLayer) {
                e.canvasLayer.classList.remove("hidden");
                b.init(e.canvasLayer, t.settings.canvasStyle || "neural");
            }
            if (e.bgLayer) {
                e.bgLayer.style.backgroundImage = "none";
                e.bgLayer.style.backgroundColor = "transparent";
            }
        } else {
            switch (s) {
                case "bing":
                    const l = a === "bing_latest" ? (await p.get("mediaStore", "bing_latest"))?.url : a;
                    if (l) {
                        e.bgLayer.style.backgroundImage = `url('${l}')`;
                    } else {
                        try {
                            const res = await fetch("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1");
                            const data = await res.json();
                            const r = `https://www.bing.com${data.images[0].urlbase}_UHD.jpg`;
                            await p.set("mediaStore", "bing_latest", { url: r, timestamp: Date.now() });
                            e.bgLayer.style.backgroundImage = `url('${r}')`;
                        } catch (err) {
                            console.error("Failed to fetch Bing image", err);
                        }
                    }
                    break;
                case "preset":
                case "custom":
                    if (a) {
                        if (a.match(/\.(mp4|webm|ogg)$/i)) {
                            e.bgLayer.innerHTML = `<video autoplay muted loop playsinline preload="auto" src="${a}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>`;
                            const video = e.bgLayer.querySelector("video");
                            if (video) {
                                video.muted = t.settings.videoMuted;
                                video.volume = 1.0;
                                video.play().catch(m => console.warn("Video play failed", m));
                            }
                        } else {
                            e.bgLayer.style.backgroundImage = `url('${a}')`;
                        }
                    }
                    break;
                case "local":
                    const h = await p.get("mediaStore", "localBackground");
                    if (h?.data) {
                        u = URL.createObjectURL(h.data);
                        if (h.type?.startsWith("video")) {
                            e.bgLayer.innerHTML = `<video autoplay muted loop playsinline preload="auto" src="${u}" type="${h.type}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>`;
                            const video = e.bgLayer.querySelector("video");
                            if (video) {
                                video.muted = t.settings.videoMuted;
                                video.volume = 1.0;
                                video.play().catch(m => console.warn("Local video play failed", m));
                            }
                        } else {
                            e.bgLayer.style.backgroundImage = `url('${u}')`;
                        }
                    }
                    break;
                case "google_dashboard":
                    let googleSrc = "https://www.google.com/?raeen_dashboard=true";
                    if (a && (a.includes("google.com") || a.includes("google.co.in"))) {
                        try {
                            const urlObj = new URL(a);
                            urlObj.searchParams.set("raeen_dashboard", "true");
                            googleSrc = urlObj.toString();
                        } catch {
                            googleSrc = a + (a.includes("?") ? "&" : "?") + "raeen_dashboard=true";
                        }
                    }
                    e.bgLayer.innerHTML = `<iframe src="${googleSrc}" allow="forms; scripts; same-origin; popups; clipboard-write; gyp-eval; accelerometer; gyroscope;" style="width:100%;height:100%;border:none;pointer-events:auto;z-index:1;"></iframe>`;
                    e.bgLayer.style.backgroundImage = "none";
                    break;
                case "bing_dashboard":
                    let bingSrc = "https://www.bing.com/?raeen_dashboard=true";
                    if (a && (a.includes("bing.com") || a.includes("cn.bing.com"))) {
                        try {
                            const urlObj = new URL(a);
                            urlObj.searchParams.set("raeen_dashboard", "true");
                            bingSrc = urlObj.toString();
                        } catch {
                            bingSrc = a + (a.includes("?") ? "&" : "?") + "raeen_dashboard=true";
                        }
                    }
                    e.bgLayer.innerHTML = `<iframe src="${bingSrc}" allow="forms; scripts; same-origin; popups; clipboard-write; gyp-eval;" style="width:100%;height:100%;border:none;pointer-events:auto;z-index:1;"></iframe>`;
                    e.bgLayer.style.backgroundImage = "none";
                    break;
                case "solid":
                    if (a && a.includes("gradient")) {
                        e.bgLayer.style.backgroundImage = a;
                    } else {
                        e.bgLayer.style.backgroundColor = a || "transparent";
                        e.bgLayer.style.backgroundImage = "none";
                    }
                    break;
            }
        }
    } else {
        const video = e.bgLayer.querySelector("video");
        if (video) {
            video.muted = t.settings.videoMuted;
        }
    }
    
    if (e.videoSoundBtn) {
        const video = e.bgLayer.querySelector("video");
        e.videoSoundBtn.classList.toggle("hidden", !video);
        e.videoSoundBtn.classList.toggle("muted", t.settings.videoMuted);
    }
    
    const isLive = s === "google_dashboard" || s === "bing_dashboard";
    document.body.classList.toggle("live-bg-active", isLive);
    
    e.searchWidget?.classList.toggle("hidden", isLive || !t.settings.showSearch);
    e.topSitesWidget?.classList.toggle("hidden", isLive || !t.settings.showTopSites);
    e.cardsWidget?.classList.toggle("hidden", isLive || !t.settings.showCards);
    e.clockWidget?.style.setProperty("display", isLive || !t.settings.showClock ? "none" : "flex");
    e.notesWidget?.classList.toggle("hidden", isLive || !t.settings.showCardNote);
    
    const showCDI = t.settings.showNoosphereBar && !isLive;
    e.cdiBar?.classList.toggle("hidden", !showCDI);
    e.cdiBarRight?.classList.toggle("hidden", !showCDI);
    e.cdiBarTop?.classList.toggle("hidden", !showCDI);
    e.cdiBarBottom?.classList.toggle("hidden", !showCDI);
    
    const immersive = !t.settings.showMainUI;
    document.body.classList.toggle("immersive-mode", immersive);
    e.searchWidget?.classList.toggle("immersive-hidden", immersive);
    e.topSitesWidget?.classList.toggle("immersive-hidden", immersive);
    e.cardsWidget?.classList.toggle("immersive-hidden", immersive);
    e.clockWidget?.classList.toggle("immersive-hidden", immersive);
    e.appsLauncherBtn?.classList.toggle("immersive-hidden", immersive);
    e.settingsBtn?.classList.toggle("immersive-hidden", immersive && !t.settings.showSettingsButtonInImmersive);
    
    L();
}

function f() {
    if (!e.timeEl) return;
    const s = new Date();
    const currentMinute = s.getMinutes();
    if (e.timeEl._lastMin === currentMinute) return;
    e.timeEl._lastMin = currentMinute;
    
    let a = s.getHours();
    let n = currentMinute;
    
    if (t.settings.clockFormat === "auto") {
        const locale = navigator.language || "en-US";
        let timeStr = s.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: true });
        e.timeEl.textContent = timeStr.replace(/\s?[AP]M/i, "").trim();
        return;
    }
    
    if (t.settings.clockFormat === "12h") {
        a = a % 12 || 12;
    }
    e.timeEl.textContent = `${a.toString().padStart(2, "0")}:${n.toString().padStart(2, "0")}`;
}

async function C() {
    if (!e.bingGallery) return;
    e.bingGallery.innerHTML = '<p class="subtext">Loading daily wallpapers...</p>';
    try {
        const locale = navigator.language || "en-US";
        const res = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=${locale}`);
        const data = await res.json();
        const images = data.images || [];
        
        e.bingGallery.innerHTML = images.map((n, i) => `
            <div class="bing-thumb-wrapper" style="cursor:pointer;" data-index="${i}" data-url="https://www.bing.com${n.urlbase}_UHD.jpg">
                <img src="https://www.bing.com${n.urlbase}_400x240.jpg" class="bing-thumb ${t.settings.backgroundValue === (i === 0 ? "bing_latest" : "https://www.bing.com" + n.urlbase + "_UHD.jpg") ? "active" : ""}" style="width:100%; border-radius:8px;">
                <div style="font-size:0.6rem; text-align:center; margin-top:2px; color:var(--text-secondary);">${i === 0 ? "Daily Wallpaper" : "Previous Day"}</div>
            </div>
        `).join("");
        
        if (!e.bingGallery._hasListener) {
            e.bingGallery._hasListener = true;
            e.bingGallery.addEventListener("click", (evt) => {
                const wrapper = evt.target.closest(".bing-thumb-wrapper");
                if (wrapper && e.bingGallery.contains(wrapper)) {
                    const idx = parseInt(wrapper.dataset.index, 10);
                    t.settings.backgroundType = "bing";
                    t.settings.backgroundValue = idx === 0 ? "bing_latest" : wrapper.dataset.url;
                    y(t.settings);
                }
            });
        }
    } catch {
        e.bingGallery.innerHTML = '<p class="subtext">Failed to fetch Bing gallery. Check your connection.</p>';
    }
}

function T() {
    if (!document.querySelector('input[name="theme_preference"]')) return;
    if (e.dashboardTitleInput) {
        e.dashboardTitleInput.value = t.settings.dashboardTitle || "New Tab";
    }
    
    const s = document.querySelector(`input[name="theme_preference"][value="${t.settings.themePreference}"]`);
    if (s) s.checked = true;
    
    if (e.showNoosphereToggle) e.showNoosphereToggle.checked = t.settings.showNoosphereBar;
    if (e.showSettingsInImmersiveToggle) e.showSettingsInImmersiveToggle.checked = t.settings.showSettingsButtonInImmersive;
    if (e.showMainUIToggle) e.showMainUIToggle.checked = t.settings.showMainUI;
    if (e.bgTypeSelect) e.bgTypeSelect.value = t.settings.backgroundType;
    if (e.canvasStyleSelect) e.canvasStyleSelect.value = t.settings.canvasStyle || "neural";
    
    w();
    
    if (e.bgCustomUrl) {
        e.bgCustomUrl.value = t.settings.backgroundType === "custom" ? t.settings.backgroundValue : "";
    }
    if (e.toggleSearch) e.toggleSearch.checked = t.settings.showSearch;
    
    const a = document.querySelector(`input[name="search_engine"][value="${t.settings.searchEngine}"]`);
    if (a) a.checked = true;
    
    if (e.customSearchUrlInput) e.customSearchUrlInput.value = t.settings.customSearchUrl;
    if (e.toggleTopSites) e.toggleTopSites.checked = t.settings.showTopSites;
    
    const sourceRadio = document.querySelector(`input[name="topsites_source"][value="${t.settings.topSitesSource}"]`);
    if (sourceRadio) sourceRadio.checked = true;
    
    if (e.toggleClock) e.toggleClock.checked = t.settings.showClock;
    if (e.clockFormatSelect) e.clockFormatSelect.value = t.settings.clockFormat;
    if (e.toggleCards) e.toggleCards.checked = t.settings.showCards;
    if (e.toggleCardDate) e.toggleCardDate.checked = t.settings.showCardDate;
    if (e.toggleCardFocus) e.toggleCardFocus.checked = t.settings.showCardFocus;
    if (e.toggleCardNote) e.toggleCardNote.checked = t.settings.showCardNote;
}

function w() {
    if (!e.bgTypeSelect) return;
    const s = e.bgTypeSelect.value;
    e.bgCanvasOptions?.classList.toggle("hidden", s !== "canvas");
    e.bgBingOptions?.classList.toggle("hidden", s !== "bing");
    e.bgPresetOptions?.classList.toggle("hidden", s !== "preset");
    e.bgSolidOptions?.classList.toggle("hidden", s !== "solid");
    e.bgLocalOptions?.classList.toggle("hidden", s !== "local");
    e.bgCustomOptions?.classList.toggle("hidden", s !== "custom");
}

function L() {
    if (!t.settings.showCards) return;
    e.cardDateEl?.classList.toggle("hidden", !t.settings.showCardDate);
    e.cardFocusEl?.classList.toggle("hidden", !t.settings.showCardFocus);
    e.cardNoteEl?.classList.toggle("hidden", !t.settings.showCardNote);
    
    const s = new Date();
    if (e.cardDateValue) {
        e.cardDateValue.textContent = s.toLocaleDateString(void 0, { day: "numeric", month: "long" });
    }
    if (e.cardDateDay) {
        e.cardDateDay.textContent = s.toLocaleDateString(void 0, { weekday: "long" });
    }
}

function B() {
    if (!e.galleryGrid) return;
    e.galleryGrid.innerHTML = "";
    
    Object.entries(k).forEach(([s, a]) => {
        const header = document.createElement("div");
        header.className = "theme-section-header";
        header.innerHTML = `<span>${s}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`;
        e.galleryGrid.appendChild(header);
        
        const grid = document.createElement("div");
        grid.className = "theme-section-grid";
        grid.innerHTML = a.map(o => {
            const isCanvas = o.url && o.url.startsWith("canvas:");
            const isVideo = o.url && o.url.match(/\.(mp4|webm|ogg)$/i);
            let styleStr = `background-image:url('${o.url}')`;
            if (isCanvas) {
                styleStr = "background: linear-gradient(135deg, var(--accent), #000); filter: hue-rotate(45deg);";
            } else if (isVideo) {
                styleStr = "background: #000;";
            }
            return `
                <div class="theme-item" data-url="${o.url}">
                    <div class="theme-thumb" style="${styleStr}">
                        ${isVideo ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="white" style="opacity:0.6"><path d="M8 5v14l11-7z"/></svg>' : ""}
                        ${isCanvas ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="white" style="opacity:0.6"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>' : ""}
                    </div>
                    <span class="theme-name">${o.name}</span>
                </div>
            `;
        }).join("");
        e.galleryGrid.appendChild(grid);
    });
    
    if (!e.galleryGrid._hasListener) {
        e.galleryGrid._hasListener = true;
        e.galleryGrid.addEventListener("click", (evt) => {
            const header = evt.target.closest(".theme-section-header");
            if (header && e.galleryGrid.contains(header)) {
                const grid = header.nextElementSibling;
                if (grid) {
                    const isHidden = grid.style.display === "none";
                    grid.style.display = isHidden ? "grid" : "none";
                    const svg = header.querySelector("svg");
                    if (svg) {
                        svg.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
                    }
                }
                return;
            }
            
            const item = evt.target.closest(".theme-item");
            if (item && e.galleryGrid.contains(item)) {
                const url = item.dataset.url;
                if (url.startsWith("canvas:")) {
                    t.settings.backgroundType = "canvas";
                    t.settings.canvasStyle = url.split(":")[1];
                } else {
                    t.settings.backgroundType = "preset";
                    t.settings.backgroundValue = url;
                }
                y(t.settings);
            }
        });
    }
}

export { S as applySettings, v as cleanupBackground, C as loadBingGallery, B as renderThemeLibrary, w as syncBackgroundOptions, T as syncSettingsUI, L as updateCards, f as updateTime };
