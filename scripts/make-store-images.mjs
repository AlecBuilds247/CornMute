// Renders Chrome Web Store screenshots (1280x800) and the small promo tile (440x280)
// from the REAL extension pages with a stubbed chrome API. Output: store/screenshots/
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'store/screenshots');
const tmp = path.join(root, 'store/.tmp');
mkdirSync(out, { recursive: true }); mkdirSync(tmp, { recursive: true });
import http from 'node:http';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(root, 'extension', path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  try { const b = readFileSync(f); res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ext = (f) => `http://127.0.0.1:${server.address().port}/${f}`;
const iconData = 'data:image/png;base64,' + readFileSync(path.join(root, 'assets/icon256.png')).toString('base64');

const stub = (tabInfo, sites, incognito) => `
  window.chrome = {
    runtime: { id: 'x', sendMessage: async (m) => m.type === 'getSites' ? ${JSON.stringify(sites)} : ${JSON.stringify(tabInfo)}, openOptionsPage(){} },
    tabs: { query: async () => [{ id: 1, url: 'https://example.com/' }], create(){} },
    storage: { local: { set: async () => {} }, onChanged: { addListener(){} } },
    commands: { getAll: async () => [{ name: 'toggle-mute-tab', shortcut: '⌥⇧M' }] },
    extension: { isAllowedIncognitoAccess: (cb) => cb(${incognito}) },
  };`;

const browser = await chromium.launch();
async function shoot(file, { w, h, init, selector, scale = 2, name, colorScheme = 'light', before }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale, colorScheme });
  if (init) await page.addInitScript(init);
  await page.goto(file);
  if (before) await before(page);
  await page.waitForTimeout(300);
  const target = selector ? page.locator(selector) : page;
  const p = path.join(tmp, name);
  await target.screenshot({ path: p });
  await page.close();
  return 'data:image/png;base64,' + readFileSync(p).toString('base64');
}

const builtin = { builtin: Array.from({ length: 58 }, (_, i) => `adult-site-${i + 1}.example`), custom: [] };
const popupMuted = await shoot(ext('popup.html'), { w: 344, h: 520, name: 'popup.png', selector: 'body',
  init: stub({ enabled: true, count: 27, host: 'video.example-nsfw.com', site: 'example-nsfw.com', builtin: false, muted: true, mutedByCornMute: true, unmutedByUser: false }, builtin, true) });
const sitesPage = await shoot(ext('sites.html'), { w: 760, h: 640, name: 'sites.png',
  init: stub({}, { builtin: builtin.builtin, custom: ['example-nsfw.com', 'my-other-site.net', 'videos.example.org'] }, true),
  before: async (p) => { await p.waitForSelector('#custom li'); await p.fill('#domain', 'https://www.paste-any-link.com/watch?v=123'); await p.dispatchEvent('#domain', 'input'); } });
const welcomePage = await shoot(ext('welcome.html'), { w: 760, h: 640, name: 'welcome.png', init: stub({}, builtin, false) });

const frame = (headline, sub, img, imgW, extra = '') => `<!doctype html><html><head><style>
  body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    background:linear-gradient(135deg,#fff8dc 0%,#ffe9a3 55%,#f9d24f 100%);color:#2b2612;display:flex;align-items:center;gap:56px;padding:0 72px;box-sizing:border-box}
  .text{flex:1} h1{font-size:54px;line-height:1.08;margin:0 0 20px;letter-spacing:-.5px} p{font-size:24px;line-height:1.4;margin:0;color:#5b5232}
  .brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:26px;margin-bottom:34px} .brand img{width:54px;height:54px}
  .shot{border-radius:16px;box-shadow:0 24px 60px rgba(80,60,0,.28),0 0 0 1px rgba(0,0,0,.06);background:#fff}
  ${extra}</style></head><body>
  <div class="text"><div class="brand"><img src="${iconData}">CornMute</div><h1>${headline}</h1><p>${sub}</p></div>
  <img class="shot" src="${img}" style="width:${imgW}px">
</body></html>`;

// Screenshot 1 adds a mock browser tab strip with the muted tab, above the popup.
const browserMock = `<!doctype html><html><head><style>
  body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(135deg,#fff8dc 0%,#ffe9a3 55%,#f9d24f 100%);color:#2b2612}
  .win{position:absolute;left:60px;top:56px;width:1160px;height:700px;background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(80,60,0,.25);overflow:hidden}
  .strip{height:46px;background:#dee1e6;display:flex;align-items:flex-end;padding:0 12px;gap:4px}
  .dots{display:flex;gap:8px;align-self:center;margin-right:16px}.dots i{width:12px;height:12px;border-radius:50%;display:block}
  .tab{height:36px;width:230px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:13px;color:#444;box-sizing:border-box}
  .tab.on{background:#fff;color:#202124}.fav{width:16px;height:16px;border-radius:4px;background:#bbb}
  .spk{margin-left:auto;font-size:14px}
  .bar{height:44px;display:flex;align-items:center;gap:12px;padding:0 16px;border-bottom:1px solid #e5e5e5}
  .url{flex:1;height:30px;border-radius:16px;background:#f1f3f4;display:flex;align-items:center;padding:0 14px;font-size:14px;color:#5f6368}
  .ext{width:26px;height:26px;border-radius:6px;background:#fff3c4;display:flex;align-items:center;justify-content:center;outline:2px solid #f5c518}
  .page{position:absolute;left:0;right:0;top:90px;bottom:0;background:repeating-linear-gradient(0deg,#f6f6f6 0 20px,#fafafa 20px 40px)}
  .blur{position:absolute;left:40px;top:40px;width:640px;height:360px;border-radius:12px;background:#2d2d2d;display:flex;align-items:center;justify-content:center;color:#888;font-size:64px}
  .popup{position:absolute;right:14px;top:84px;width:344px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .call{position:absolute;left:100px;top:530px;width:560px}
  .call h1{font-size:46px;line-height:1.1;margin:0 0 14px;letter-spacing:-.5px}.call p{font-size:21px;margin:0;color:#5b5232}
</style></head><body><div class="win">
  <div class="strip"><div class="dots"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
    <div class="tab"><span class="fav"></span>Recipes – Search</div>
    <div class="tab on"><span class="fav" style="background:#999"></span>Video page<span class="spk">🔇</span></div>
    <div class="tab"><span class="fav"></span>Inbox</div></div>
  <div class="bar"><span style="color:#999">← →  ⟳</span><div class="url">video.example-nsfw.com</div><div class="ext"><img src="${iconData}" width="20"></div></div>
  <div class="page"><div class="blur">▶</div></div>
  <img class="popup" src="${popupMuted}">
</div>
<div class="call" style="left:100px;top:520px;background:rgba(255,253,246,.96);padding:22px 26px;border-radius:14px;box-shadow:0 10px 30px rgba(80,60,0,.18)"><h1>Muted before the first sound.</h1><p>CornMute mutes the tab the moment an adult / NSFW site starts loading.</p></div>
</body></html>`;

async function render(html, w, h, file) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, file), type: 'png' });
  await page.close();
}

await render(browserMock, 1280, 800, '1-muted-before-sound.png');
await render(frame('Your list, your rules.', 'Add any site in seconds. Paste a full link and CornMute cleans it into a domain. Subdomains are covered automatically.', sitesPage, 620), 1280, 800, '2-my-sites.png');
await render(frame('Works in Incognito.', 'Chrome’s built-in “Mute site” isn’t remembered in Incognito. CornMute is — allow it once and you’re covered.', welcomePage, 620), 1280, 800, '3-incognito.png');
await render(frame('Private by design.', 'No accounts. No analytics. Addresses are checked on your device and never stored or sent. Unmute anytime with one click or ⌥⇧M.', popupMuted, 330), 1280, 800, '4-private.png');

const tile = `<!doctype html><html><head><style>
  body{margin:0;width:440px;height:280px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  background:linear-gradient(135deg,#fff8dc 0%,#ffe08a 60%,#f5c518 100%);display:flex;align-items:center;gap:18px;padding:0 28px;box-sizing:border-box;color:#2b2612}
  img{width:150px;height:150px;flex:none} h1{font-size:38px;margin:0 0 6px;letter-spacing:-.5px} p{margin:0;font-size:18px;line-height:1.3;color:#5b5232}
</style></head><body><img src="${iconData}"><div><h1>CornMute</h1><p>Auto-mutes NSFW sites before any sound plays.</p></div></body></html>`;
await render(tile, 440, 280, 'promo-small-440x280.png');

await browser.close();
server.close();
console.log('store images written to store/screenshots');
