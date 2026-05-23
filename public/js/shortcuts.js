import{state as o,saveSettings as a}from"./state.js";import{dom as s}from"./dom.js";function i(){s.topSitesWidget&&(s.topSitesWidget.innerHTML="",o.settings.topSitesSource==="favorites"?(o.settings.shortcuts||[]).forEach((t,e)=>{const n=document.createElement("a");n.href=t.url,n.className="shortcut",n.style.setProperty("--item-index",e);const r=t.icon||`https://www.google.com/s2/favicons?sz=64&domain_url=${t.url}`;n.innerHTML=`<img src="${r}" alt="${t.name}"><span>${t.name}</span>`,s.topSitesWidget.appendChild(n)}):typeof chrome<"u"&&chrome.topSites&&chrome.topSites.get(t=>{t.slice(0,8).forEach((e,n)=>{const r=document.createElement("a");r.href=e.url,r.className="shortcut",r.style.setProperty("--item-index",n);const m=`https://www.google.com/s2/favicons?sz=64&domain_url=${e.url}`;r.innerHTML=`<img src="${m}" alt="${e.title}"><span>${e.title}</span>`,s.topSitesWidget.appendChild(r)})}),u())}function l(){const t=s.newShortcutName.value.trim(),e=s.newShortcutUrl.value.trim();t&&e&&(o.settings.shortcuts||(o.settings.shortcuts=[]),o.settings.shortcuts.push({name:t,url:e,icon:""}),a(o.settings),i(),s.newShortcutName.value="",s.newShortcutUrl.value="")}function c(t){o.settings.shortcuts.splice(t,1),a(o.settings),i()}function u(){s.shortcutsList&&(s.shortcutsList.innerHTML=(o.settings.shortcuts||[]).map((t,e)=>`
        <div class="managed-item">
            <div>
                <strong>${t.name}</strong>
                <span>${t.url}</span>
            </div>
            <div class="managed-item-actions">
                <button data-index="${e}" class="remove-shortcut-btn">Remove</button>
            </div>
        </div>
    `).join(""),s.shortcutsList.querySelectorAll(".remove-shortcut-btn").forEach(t=>{t.onclick=()=>c(parseInt(t.dataset.index))}))}export{l as addShortcut,c as removeShortcut,u as renderManagedShortcuts,i as renderShortcuts};
