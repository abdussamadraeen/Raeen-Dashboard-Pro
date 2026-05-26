import{state as o,saveSettings as a}from"./state.js";import{dom as e}from"./dom.js";import{escapeHTML as sHtml,escapeAttribute as sAttr,sanitizeURL as sUrl}from"./security.js";function i(){e.topSitesWidget&&(e.topSitesWidget.innerHTML="",o.settings.topSitesSource==="favorites"?(o.settings.shortcuts||[]).forEach((t,s)=>{const n=document.createElement("a");n.href=sUrl(t.url),n.className="shortcut",n.style.setProperty("--item-index",s);const r=t.icon||`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(t.url)}`;n.innerHTML=`<img src="${sAttr(r)}" alt="${sAttr(t.name)}"><span>${sHtml(t.name)}</span>`,e.topSitesWidget.appendChild(n)}):typeof chrome<"u"&&chrome.topSites&&chrome.topSites.get(t=>{t.slice(0,8).forEach((s,n)=>{const r=document.createElement("a");r.href=sUrl(s.url),r.className="shortcut",r.style.setProperty("--item-index",n);const m=`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(s.url)}`;r.innerHTML=`<img src="${sAttr(m)}" alt="${sAttr(s.title)}"><span>${sHtml(s.title)}</span>`,e.topSitesWidget.appendChild(r)})}),u())}function l(){const t=e.newShortcutName.value.trim(),s=e.newShortcutUrl.value.trim();t&&s&&(o.settings.shortcuts||(o.settings.shortcuts=[]),o.settings.shortcuts.push({name:t,url:s,icon:""}),a(o.settings),i(),e.newShortcutName.value="",e.newShortcutUrl.value="")}function c(t){o.settings.shortcuts.splice(t,1),a(o.settings),i()}function u(){e.shortcutsList&&(e.shortcutsList.innerHTML=(o.settings.shortcuts||[]).map((t,s)=>`
        <div class="managed-item">
            <div>
                <strong>${sHtml(t.name)}</strong>
                <span>${sHtml(t.url)}</span>
            </div>
            <div class="managed-item-actions">
                <button data-index="${s}" class="remove-shortcut-btn">Remove</button>
            </div>
        </div>
    `).join(""),e.shortcutsList.querySelectorAll(".remove-shortcut-btn").forEach(t=>{t.onclick=()=>c(parseInt(t.dataset.index))}))}export{l as addShortcut,c as removeShortcut,u as renderManagedShortcuts,i as renderShortcuts};
