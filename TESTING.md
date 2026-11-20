# CornMute – 10-minute test on your Mac

**Setup (2 min)**
1. Unzip `release/cornmute-v1.0.3.zip` into a folder (this is exactly what you'll upload).
2. Chrome → `chrome://extensions` → Developer mode ON → **Load unpacked** → pick that folder.
   - If AdHush or an older CornMute is loaded, that's fine. Remove any older CornMute first.

**Checks** (tick each)

- [ ] Popup (before fixing Incognito): under Incognito **Off** there's a small line *Click “Fix” to let CornMute work in Incognito windows.*
- [ ] **Welcome page** opens by itself. Click **Open CornMute settings** → turn on **Allow in Incognito** → go back to the welcome tab: it says **Allowed ✓**.
- [ ] Pin CornMute to the toolbar (puzzle icon → pin).
- [ ] Open the demo page: `https://alecbuilds247.github.io/cornmute-site/demo.html`
      *(not uploaded yet? use `youtube.com` as your test site instead in the steps below — any harmless site with sound works)*
- [ ] Popup says **This site plays normally** / "It's not one of the 46,987 adult sites CornMute mutes." Click **Missing an adult site? Add it to your list →**: Muted sites page opens with the demo site filled in. Click **Add**.
- [ ] Reload the demo tab: muted; popup says **Muted: on your list**.
- [ ] Click **Play test tone**: silence. Popup counter went up by 1.
- [ ] Reload + play 2 more times (counter reaches 3): no review link yet, because the store item ID isn't filled in. (Once it is: "Enjoying CornMute? Leave a review ★" appears; × hides it for good.)
- [ ] Press **Option+Shift+M**: tone becomes audible. Reload: stays unmuted.
- [ ] Go to `google.com` in the same tab, then back to the demo page: **muted again**.
- [ ] Open the demo page in a **new tab**: muted.
- [ ] In the popup, turn CornMute **off**: muted demo tabs unmute instantly. Turn it back **on**.
- [ ] Open an **Incognito** window → demo page: muted. Popup shows Incognito **On**.
- [ ] **Muted sites** → "Is a site covered?" box: type `sex.com` → ✓ built-in. Type `sussex.ac.uk` → not covered. (Typing a name is fine; no need to visit.)
- [ ] Popup on a new tab page: **Nothing to mute here**, no Mute button.
- [ ] Popup footer: only **Privacy Policy** (opens the privacy page). Muted sites page footer: **Privacy Policy · Made by @AlecBuilds247** (review link appears there once the store item ID is set).
- [ ] Popup → **Muted sites**: paste `https://www.example.com/some/page` → it adds `example.com`. Remove it.
- [ ] On `google.com`, popup → **Mute this tab**. Then go to another normal site in that tab: it **stays muted** (CornMute never undoes your own mutes).

Anything wrong? Tell me which line failed and what you saw.

**Automated tests (for me, not you):** `npm test` (unit) and `npm run test:e2e` (real Chromium + fake local test pages).
