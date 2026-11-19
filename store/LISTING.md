# CornMute – Chrome Web Store listing (copy & paste)

Upload file: `release/cornmute-v1.0.1.zip`

---

## Store listing tab

**Title** (from manifest)
```
CornMute – Auto-Mute for NSFW Sites
```

**Summary** (from manifest, 99 chars)
```
Automatically mutes the tab the moment an adult / NSFW site starts loading, before any sound plays.
```

**Description**
```
No more embarrassing bursts of sound.

CornMute mutes the tab the moment an adult / NSFW site starts loading, before a single sound can play. When you're ready, unmute with one click or a keyboard shortcut.

HOW IT WORKS
• Muted from the first second: CornMute acts as soon as the page starts loading, not after audio begins.
• You stay in control: unmute from the CornMute button or press Alt+Shift+M (Option+Shift+M on Mac). Once you unmute, the tab stays unmuted while it stays on that site.
• Moving to a different listed site, or opening a new tab, starts muted again.
• Leaving a listed site? CornMute restores sound only on tabs it muted. It never unmutes a tab you muted yourself.
• One switch turns CornMute off and instantly unmutes everything it muted.

WORKS IN INCOGNITO
Chrome's built-in "Mute site" setting isn't remembered in Incognito. CornMute is. Allow it in Incognito once (the welcome page shows you how) and you're covered.

TENS OF THOUSANDS OF ADULT SITES, BUILT IN
CornMute ships with a built-in list of tens of thousands of adult / NSFW sites: mainstream video sites, creator and cam platforms, Japanese, Chinese and anime adult sites, and more. Every site on the adult-only .xxx, .porn, .sex and .adult domains is covered automatically. The list is stored inside the extension and checked on your device; nothing is downloaded while you browse.

YOUR OWN LIST
Add any other site under "My sites". Paste a full link and CornMute cleans it into a domain; subdomains are covered automatically. You can also check whether a site is already covered.

"AWKWARD MOMENTS PREVENTED"
A small counter in the popup goes up each time a muted page actually tried to play sound.

PRIVATE BY DESIGN
• No data collected. No accounts. No analytics. No ads.
• Page addresses are checked on your device and never stored or sent.
• No site names appear in Chrome's install prompt: CornMute asks for no website access.
• No content scripts and no remote code: CornMute never reads or changes the pages you visit.

Built-in list includes the open-source StevenBlack/hosts adult list (MIT / CC BY 4.0). Full credits are inside the extension.

Questions or feedback: alecbuilds247@gmail.com
```

**Category:** Tools  (if not offered: Privacy & Security)
**Language:** English

**Graphic assets** (all in `store/screenshots/`)
- Store icon 128x128: `extension/icons/icon128.png`
- Screenshots 1280x800, in this order:
  1. `1-muted-before-sound.png`
  2. `2-my-sites.png` (regenerated for v1.0.1)
  3. `3-incognito.png`
  4. `4-private.png`
- Small promo tile 440x280: `promo-small-440x280.png`
- Marquee: leave empty

**Official URL:** none (leave blank)
**Homepage URL:** `https://alecbuilds247.github.io/cornmute-site/`
**Support URL:** `https://alecbuilds247.github.io/cornmute-site/` (support email: alecbuilds247@gmail.com)
**Mature content:** No (the extension contains no mature content; it only mutes tabs)

---

## Privacy practices tab

**Single purpose description**
```
CornMute has one purpose: it automatically mutes a browser tab as soon as a page on an adult / NSFW site (from its bundled built-in list, the adult-only .xxx/.porn/.sex/.adult domains, or the user's own list) starts loading, so no sound plays until the user chooses to unmute.
```

**Permission justification: webNavigation**
```
Used to detect the moment a tab starts navigating to a new page, so CornMute can compare the site's domain against its built-in list (bundled in the extension) and the user's list, and mute the tab before any sound plays. Also used to detect when the tab leaves a listed site so CornMute can restore sound it muted. The address is checked on-device only and is never stored or transmitted.
```

**Permission justification: storage**
```
Stores, on the user's device only: the on/off setting, the sites the user added under "My sites", and a single counter number. While Chrome is open, it also keeps (in memory-only session storage) which tabs CornMute muted, recorded by matching listed domain only, never by page address. Nothing is synced or sent.
```

**Permission justification: activeTab**
```
When the user opens the CornMute popup or presses its keyboard shortcut, activeTab gives temporary access to the current tab's address so CornMute can show whether that site is on the list, mute/unmute that tab, and offer "Add this site". This avoids requesting any host permissions.
```

**Are you using remote code?** No, I am not using remote code.
```
All JavaScript is included in the extension package. CornMute loads no external scripts, uses no eval, and has no content scripts. Its site list (blocklist.txt) is a plain data file bundled in the package; it is never downloaded or updated remotely.
```

**Data usage – what user data do you collect?**
Leave EVERY box unchecked (Personally identifiable information, Health, Financial, Authentication, Personal communications, Location, Web history, User activity, Website content). CornMute collects none of these. (Web addresses are read on-device to decide whether to mute, but are never collected, stored or transmitted.)

**Certifications – tick all three:**
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**
```
https://alecbuilds247.github.io/cornmute-site/privacy.html
```

---

## Distribution tab
- Visibility: Public
- Regions: All regions
- Pricing: Free

---

## Test instructions (Account → "Test instructions" for reviewers)

**Username / password:** not needed (no login).

```
No adult site is needed to test CornMute. Use the harmless demo page, which only plays a beep:

1. Install CornMute. A welcome page opens explaining how to allow it in Incognito (optional).
2. Open https://alecbuilds247.github.io/cornmute-site/demo.html
3. Click the CornMute toolbar button and click "Add this site" (or right-click the button > Options > "My sites" and add alecbuilds247.github.io).
4. Reload the demo page. The tab starts MUTED: Chrome shows the muted speaker icon on the tab, and the popup says "Muted by CornMute".
5. Click "Play test tone" on the page. Nothing is heard, and the popup counter "awkward moments prevented" goes up by 1.
6. In the popup click "Unmute this tab" (or press Alt+Shift+M). The tone is now audible. Reloading the page keeps it unmuted (same site).
7. Navigate the tab to any other site (e.g. https://www.google.com): it is not muted. Open the demo page in a NEW tab: it starts muted again.
8. Toggle the switch at the top of the popup off: every tab CornMute muted is unmuted immediately.
```
