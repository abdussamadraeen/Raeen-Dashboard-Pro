import { StorageManager as n } from "./storage.js";
import { state as s, updateSettings as u, saveSettings as a } from "./state.js";
import { dom as e } from "./dom.js";
import {
  applySettings as g,
  syncSettingsUI as h,
  updateTime as i,
  loadBingGallery as m,
  updateCards as S,
  syncBackgroundOptions as k,
  renderThemeLibrary as y,
} from "./ui.js";
import {
  renderNotesList as b,
  openNoteEditor as f,
  closeNoteEditor as B,
  deleteCurrentNote as T,
  saveCurrentNote as p,
  updateCharCount as w,
} from "./notes.js";
import { renderShortcuts as r, addShortcut as C } from "./shortcuts.js";
import { setupSearch as E } from "./search.js";
import { initFocusTimer as L } from "./focus.js";
import { validateAndRepairSettings } from "./schema.js";

(async function () {
  (g(), i());
  const N = setInterval(i, 1e3),
    c = async () => {
      try {
        if ((await n.init(), !n.isReady())) {
          (console.warn("Storage not ready, retrying in 2s..."),
            setTimeout(c, 2e3));
          return;
        }
        let t = await n.get("settings", "main");
        if (t) {
          t = validateAndRepairSettings(t);
          if (
            (t.backgroundType === "google_dashboard" ||
              t.backgroundType === "bing_dashboard") &&
            t.backgroundValue &&
            t.backgroundValue.includes("/search")
          ) {
            t.backgroundValue =
              t.backgroundType === "google_dashboard"
                ? "https://www.google.com/?raeen_dashboard=true"
                : "https://www.bing.com/?raeen_dashboard=true";
            await a(t);
          }
          u(t);
          t.backgroundType &&
            localStorage.setItem("raeen_bg_type", t.backgroundType);
          g();
          i();
        } else {
          const o = localStorage.getItem("raeen_dashboard_settings");
          if (o)
            try {
              let parsed = JSON.parse(o);
              parsed = validateAndRepairSettings(parsed);
              (u(parsed),
                await a(s.settings),
                localStorage.removeItem("raeen_dashboard_settings"),
                g());
            } catch (v) {
              console.error("Error parsing settings from localStorage", v);
            }
          else await a(s.settings);
        }
        (b(), y(), r(), S());
      } catch (t) {
        console.error("Storage initialization failed", t);
      }
    };
  (await c(),
    E(),
    L(),
    e.settingsBtn &&
      (e.settingsBtn.onclick = () => {
        (h(), e.modalOverlay.classList.toggle("hidden"));
      }),
    e.closeBtn &&
      (e.closeBtn.onclick = () => e.modalOverlay.classList.add("hidden")));

    const bindToggle = (el, key, cb) => {
      if (el) el.onchange = (e) => { s.settings[key] = e.target.checked; a(s.settings); cb && cb(); };
    };
    const bindVal = (el, key, ev = "oninput", cb) => {
      if (el) el[ev] = (e) => { s.settings[key] = e.target.value; a(s.settings); cb && cb(e.target.value); };
    };
    const bindRadio = (name, key, cb) => {
      document.getElementsByName(name).forEach((el) => {
        el.onchange = (e) => { s.settings[key] = e.target.value; a(s.settings); cb && cb(); };
      });
    };

    e.bgTypeSelect &&
      (e.bgTypeSelect.oninput = (t) => {
        s.settings.backgroundType = t.target.value;
        if (t.target.value === "bing") s.settings.backgroundValue = "bing_latest";
        a(s.settings);
        k();
        if (t.target.value === "bing") m();
        g();
      });

    bindVal(e.canvasStyleSelect, "canvasStyle");
    bindVal(e.bgCustomUrl, "backgroundValue", "onchange");
    bindVal(e.customSearchUrlInput, "customSearchUrl", "onchange");
    bindVal(e.clockFormatSelect, "clockFormat");

    bindToggle(e.showNoosphereToggle, "showNoosphereBar");
    bindToggle(e.showSettingsInImmersiveToggle, "showSettingsButtonInImmersive");
    bindToggle(e.showMainUIToggle, "showMainUI");
    bindToggle(e.toggleSearch, "showSearch");
    bindToggle(e.toggleTopSites, "showTopSites", r);
    bindToggle(e.toggleClock, "showClock");
    bindToggle(e.toggleCards, "showCards");
    bindToggle(e.toggleCardDate, "showCardDate");
    bindToggle(e.toggleCardFocus, "showCardFocus");
    bindToggle(e.toggleCardNote, "showCardNote");

    bindRadio("theme_preference", "themePreference");
    bindRadio("search_engine", "searchEngine");
    bindRadio("topsites_source", "topSitesSource", r);

    e.bgLocalFile &&
      (e.bgLocalFile.onchange = async (t) => {
        if (t.target.files && t.target.files[0]) {
          const o = t.target.files[0];
          await n.set("mediaStore", "localBackground", { data: o, type: o.type, timestamp: Date.now() });
          s.settings.backgroundValue = "local";
          s.settings.backgroundType = "local";
          a(s.settings);
        }
      });
    
    bindVal(e.bgColorPicker, "backgroundValue", "oninput", () => {
      s.settings.backgroundType = "solid";
      a(s.settings);
    });

    document.querySelectorAll(".color-swatch").forEach((t) => {
      t.onclick = () => {
        s.settings.backgroundType = "solid";
        s.settings.backgroundValue = t.dataset.color;
        a(s.settings);
      };
    });

    if (e.addNoteBtn) e.addNoteBtn.onclick = () => f();
    if (e.noteBackBtn) e.noteBackBtn.onclick = B;
    if (e.noteDeleteBtn) e.noteDeleteBtn.onclick = T;
    if (e.addShortcutBtn) e.addShortcutBtn.onclick = C;
    
    if (e.videoSoundBtn) {
      e.videoSoundBtn.onclick = () => {
        const t = e.bgLayer.querySelector("video");
        if (t) {
          s.settings.videoMuted = !s.settings.videoMuted;
          t.muted = s.settings.videoMuted;
          if (!s.settings.videoMuted) {
            t.volume = 1.0;
            t.play().catch(console.warn);
          }
          e.videoSoundBtn.classList.toggle("muted", s.settings.videoMuted);
          const o = e.videoSoundBtn.querySelector("svg");
          if (o) {
            o.innerHTML = s.settings.videoMuted
              ? '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.05-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l7.73 7.73H7v6h4l5 5v-6.73l4.25 4.25c.67-.64 1.24-1.37 1.7-2.18L5.73 3zM12 4L9.27 6.73 12 9.46V4z"/>'
              : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
            a(s.settings, !0);
          }
        }
      };
    }
  let l;
  const d = () => {
    (clearTimeout(l), (l = setTimeout(p, 300)));
  };
  (e.noteEditorTitle && (e.noteEditorTitle.oninput = d),
    e.noteEditorBody &&
      (e.noteEditorBody.oninput = () => {
        (d(), w());
      }),
    window.addEventListener("beforeunload", () => {
      p();
    }),
    e.sidebarTabs.forEach((t) => {
      t.onclick = () => {
        (e.sidebarTabs.forEach((o) => o.classList.remove("active")),
          e.tabPanes.forEach((o) => o.classList.remove("active")),
          t.classList.add("active"),
          document.getElementById(t.dataset.target).classList.add("active"));
      };
    }),
    e.addAppBtn &&
      (e.addAppBtn.onclick = () => e.addAppModal.classList.remove("hidden")),
    s.settings.backgroundType === "bing" && m());
  const titleIn = document.getElementById("dashboard-title-input");
  titleIn &&
    (titleIn.oninput = (t) => {
      ((s.settings.dashboardTitle = t.target.value),
        a(s.settings),
        (document.title = t.target.value || "New Tab"));
    });
  const runtimeObj =
    typeof browser !== "undefined" ? browser.runtime : chrome.runtime;
  if (runtimeObj && runtimeObj.onMessage) {
    runtimeObj.onMessage.addListener(async (t) => {
      if (t.action === "close_dashboard_iframe") {
        try {
          const o = await n.get("settings", "main");
          if (o) {
            o.backgroundType = "solid";
            o.backgroundValue = "#1a1a28";
            u(o);
            await a(o);
            if (o.backgroundType) {
              localStorage.setItem("raeen_bg_type", o.backgroundType);
              localStorage.setItem("raeen_bg_value", o.backgroundValue || "");
            }
          }
          g();
          h();
          i();
        } catch (v) {
          console.error("Failed to restore settings:", v);
        }
      }
    });
  }

  // Backup & Restore Logic
  const exportBtn = document.getElementById("export-settings-btn");
  const importInput = document.getElementById("import-settings-input");
  const importBtn = document.getElementById("import-settings-btn");
  
  if (importBtn && importInput) {
    importBtn.onclick = () => importInput.click();
  }
  
  if (exportBtn) {
    exportBtn.onclick = async () => {
      try {
        const settings = await n.get("settings", "main");
        const notes = await n.getAll("notes");
        const data = { settings, notes };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const aElement = document.createElement("a");
        aElement.href = url;
        aElement.download = "raeen_dashboard_backup.json";
        aElement.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to export backup", err);
        alert("Failed to export settings.");
      }
    };
  }

  if (importInput) {
    importInput.onchange = async (evt) => {
      const file = evt.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.settings) {
            const validated = validateAndRepairSettings(data.settings);
            await n.set("settings", "main", validated);
          }
          if (data.notes && Array.isArray(data.notes)) {
            for (const note of data.notes) {
              await n.set("notes", note.id, note);
            }
          }
          alert("Backup imported successfully! Reloading...");
          location.reload();
        } catch (err) {
          console.error("Import error", err);
          alert("Failed to import settings. Invalid file format.");
        }
      };
      reader.readAsText(file);
    };
  }

  // Boss Mode / Privacy Blur Shortcut
  document.addEventListener("keydown", (evt) => {
    if (evt.ctrlKey && evt.shiftKey && evt.key.toLowerCase() === "b") {
      evt.preventDefault();
      document.body.classList.toggle("boss-mode-active");
    }
  });

})();
