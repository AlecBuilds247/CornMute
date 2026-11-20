# CornMute

Chrome extension (MV3) that mutes a tab the moment an adult / NSFW site starts loading, before any sound plays.

| Folder | What |
|---|---|
| `extension/` | The extension source (load this unpacked). Curated domains: `extension/sites.js`. Open-source list: `extension/blocklist.txt` (generated). Adult TLDs: `extension/domains.js`. |
| `data/exclude.txt` | False positives removed from the open-source list. |
| `release/cornmute-v1.0.3.zip` | The exact file to upload to the Chrome Web Store. |
| `store/` | `LISTING.md` (all store text) + screenshots and promo tile. |
| `site/` | Website for the separate `cornmute-site` GitHub Pages repo (home, privacy, demo). |
| `tests/` | Unit tests (fake Chrome API) and end-to-end test (real Chromium, fake local pages). |
| `TESTING.md` | Short manual checklist. |
| `V2.md` | Ideas parked for later. |

Permissions: `webNavigation`, `storage`, `activeTab`. No host permissions, no content scripts, no remote code.

Dev: `npm test` · `npm run test:e2e` · `npm run build` (writes the release ZIP) · `node scripts/make-store-images.mjs`

## Updating the built-in list (future versions)
1. `npm run update-blocklist` (downloads the latest StevenBlack porn list, applies `data/exclude.txt`, writes `extension/blocklist.txt` + `blocklist-meta.json`)
2. Bump `version` in `extension/manifest.json`
3. `npm test` then `npm run build` → new ZIP in `release/`

Logo: `assets/logo-full.png` is the master (made by Alec, owned by him). Icons in `extension/icons/` and `site/` are exports of it.

Store item ID (for the review links): set `STORE_ITEM_ID` in `extension/config.js` AND `window.CORNMUTE_ITEM_ID` in `site/config.js`. Empty = review links hidden.

`store/popup-states.png` is a preview of every popup state (not a store asset).
