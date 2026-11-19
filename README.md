# CornMute

Chrome extension (MV3) that mutes a tab the moment an adult / NSFW site starts loading, before any sound plays.

| Folder | What |
|---|---|
| `extension/` | The extension source (load this unpacked). Built-in domains live only in `extension/sites.js`. |
| `release/cornmute-v1.0.0.zip` | The exact file to upload to the Chrome Web Store. |
| `store/` | `LISTING.md` (all store text) + screenshots and promo tile. |
| `site/` | Website for the separate `cornmute-site` GitHub Pages repo (home, privacy, demo). |
| `tests/` | Unit tests (fake Chrome API) and end-to-end test (real Chromium, fake local pages). |
| `TESTING.md` | Short manual checklist. |
| `V2.md` | Ideas parked for later. |

Permissions: `webNavigation`, `storage`, `activeTab`. No host permissions, no content scripts, no remote code.

Dev: `npm test` · `npm run test:e2e` · `npm run build` (writes the release ZIP) · `node scripts/render-icons.mjs` · `node scripts/make-store-images.mjs`
