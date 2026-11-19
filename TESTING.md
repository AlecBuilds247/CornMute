# CornMute – 10-minute test on your Mac

**Setup (2 min)**
1. Unzip `release/cornmute-v1.0.0.zip` into a folder (this is exactly what you'll upload).
2. Chrome → `chrome://extensions` → Developer mode ON → **Load unpacked** → pick that folder.
   - If AdHush or an older CornMute is loaded, that's fine. Remove any older CornMute first.

**Checks** (tick each)

- [ ] **Welcome page** opens by itself. Click **Open CornMute settings** → turn on **Allow in Incognito** → go back to the welcome tab: it says **Allowed ✓**.
- [ ] Pin CornMute to the toolbar (puzzle icon → pin).
- [ ] Open the demo page: `https://alecbuilds247.github.io/cornmute-site/demo.html`
      *(not uploaded yet? use `youtube.com` as your test site instead in the steps below — any harmless site with sound works)*
- [ ] Popup → **Add this site**. Tab gets the muted speaker icon right away.
- [ ] Reload. Still muted; popup says **Muted by CornMute**.
- [ ] Click **Play test tone**: silence. Popup counter went up by 1.
- [ ] Press **Option+Shift+M**: tone becomes audible. Reload: stays unmuted.
- [ ] Go to `google.com` in the same tab, then back to the demo page: **muted again**.
- [ ] Open the demo page in a **new tab**: muted.
- [ ] In the popup, turn CornMute **off**: muted demo tabs unmute instantly. Turn it back **on**.
- [ ] Open an **Incognito** window → demo page: muted. Popup shows Incognito **On**.
- [ ] Popup → **My sites**: paste `https://www.example.com/some/page` → it adds `example.com`. Remove it.
- [ ] Mute some normal tab yourself (right-click tab → **Mute site** doesn't count; use the popup **Mute this tab** on e.g. google.com), navigate to another normal site: it **stays muted** (CornMute never undoes your mutes).

Anything wrong? Tell me which line failed and what you saw.

**Automated tests (for me, not you):** `npm test` (unit) and `npm run test:e2e` (real Chromium + fake local test pages).
