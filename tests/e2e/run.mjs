// End-to-end test: loads the real unpacked extension into Chromium and visits FAKE local pages.
// No real adult site is contacted: fake *.test hostnames resolve to a local server.
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
// Test copy of the extension with "tabs" added ONLY so the test can find tabs by title.
// The extension logic itself is unchanged and never relies on it.
import { cpSync, writeFileSync } from 'node:fs';
const extPath = mkdtempSync(path.join(tmpdir(), 'cm-ext-'));
cpSync(path.resolve(here, '../../extension'), extPath, { recursive: true });
const mf = JSON.parse(readFileSync(path.join(extPath, 'manifest.json'), 'utf8'));
mf.permissions.push('tabs');
writeFileSync(path.join(extPath, 'manifest.json'), JSON.stringify(mf));

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const delay = Number(u.searchParams.get('delay') || 0);
  setTimeout(() => {
    let name = u.pathname.slice(1) || 'plain.html';
    let body;
    try { body = readFileSync(path.join(here, 'pages', path.basename(name)), 'utf8'); } catch { res.writeHead(404); return res.end(); }
    body = body.replaceAll('__TARGET__', u.searchParams.get('target') || '');
    res.writeHead(200, { 'content-type': 'text/html', 'Supports-Loading-Mode': 'credentialed-prerender' });
    res.end(body);
  }, delay);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const at = (host, p = 'plain.html') => `http://${host}:${port}/${p}`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(path.join(tmpdir(), 'cm-')), {
  channel: 'chromium',
  headless: !process.env.HEADED,
  args: [
    `--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`,
    `--host-resolver-rules=MAP *.test 127.0.0.1`,
    '--autoplay-policy=no-user-gesture-required',
  ],
});

let failures = 0, passes = 0;
async function step(name, fn) {
  try { await fn(); passes++; console.log('ok  -', name); }
  catch (e) { failures++; console.log('FAIL-', name, '\n     ', e.message.split('\n')[0]); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  const tabsInfo = () => sw.evaluate(async () => (await chrome.tabs.query({})).map((t) => ({ id: t.id, muted: t.mutedInfo.muted, reason: t.mutedInfo.reason, url: t.url })));
  const mutedOf = async (page) => {
    const title = await page.title().catch(() => '');
    const id = await sw.evaluate(async (t) => (await chrome.tabs.query({ title: t }))[0]?.id, title);
    return sw.evaluate(async (i) => (await chrome.tabs.get(i)).mutedInfo, id);
  };
  const waitMuted = async (page, want, ms = 3000) => {
    const end = Date.now() + ms; let mi;
    while (Date.now() < end) { mi = await mutedOf(page); if (mi && mi.muted === want) return mi; await sleep(50); }
    throw new Error(`expected muted=${want}, got ${JSON.stringify(mi)}`);
  };

  await step('welcome page opens on install', async () => {
    const end = Date.now() + 5000;
    while (Date.now() < end && !ctx.pages().some((p) => p.url().endsWith('/welcome.html'))) await sleep(100);
    const welcome = ctx.pages().find((p) => p.url().endsWith('/welcome.html'));
    assert.ok(welcome, 'no welcome tab');
    await welcome.waitForSelector('#incog');
    assert.match(await welcome.textContent('#incog'), /Not allowed yet/);
  });

  await step('bundled blocklist and adult TLDs load inside the real extension', async () => {
    const r = await sw.evaluate(async () => ({
      list: (await globalThis.cornmute.getTabInfo(null, 'https://www.erome.com/a/x')).builtin,
      tld: (await globalThis.cornmute.getTabInfo(null, 'https://foo.bar.porn/')).builtin,
      fp: (await globalThis.cornmute.getTabInfo(null, 'https://www.sussex.ac.uk/')).site,
      count: (await globalThis.cornmute.onMessage({ type: 'getSites' })).builtinCount,
    }));
    assert.deepEqual([r.list, r.tld, r.fp], [true, true, null]);
    assert.ok(r.count > 40000, String(r.count));
  });

  await step('Muted sites: pasting a full link adds the clean domain', async () => {
    const p = await ctx.newPage();
    await p.goto(`chrome-extension://${extId}/sites.html`);
    await p.fill('#domain', 'https://www.cornmute-listed.test/some/video?id=9');
    await p.click('#addForm button');
    await p.waitForSelector('#custom li');
    assert.equal((await p.textContent('#custom li span')).trim(), 'cornmute-listed.test');
    await p.fill('#domain', 'not a website');
    await p.click('#addForm button');
    assert.match(await p.textContent('#msg'), /doesn.t look like/);
    await p.close();
  });

  const page = await ctx.newPage();
  await page.goto(at('unlisted.test'));

  await step('unlisted site is not muted', async () => {
    assert.equal((await mutedOf(page)).muted, false);
  });

  await step('listed site (subdomain) is muted at navigation start, before the page arrives', async () => {
    const nav = page.goto(at('video.cornmute-listed.test', 'tone.html?delay=1500'));
    await sleep(500); // server is still holding the response: no page, no sound yet
    const tabs = await tabsInfo();
    const t = tabs.find((x) => x.muted);
    assert.ok(t, 'tab was not muted while the page was still loading: ' + JSON.stringify(tabs));
    assert.equal(t.reason, 'extension');
    await nav;
    assert.equal((await mutedOf(page)).muted, true);
  });

  await step('counter counts when the muted page tries to play sound', async () => {
    const end = Date.now() + 6000; let c = 0;
    while (Date.now() < end) { c = (await sw.evaluate(() => chrome.storage.local.get('count'))).count || 0; if (c > 0) break; await sleep(200); }
    if (c === 0) {
      const audible = await sw.evaluate(async () => (await chrome.tabs.query({ audible: true })).length);
      if (!audible) { console.log('      (skipped: this Chromium build reports no audio, so "audible" never fires; covered by unit tests)'); return; }
    }
    assert.equal(c, 1);
  });

  await step('leaving for an unlisted site unmutes (CornMute muted it)', async () => {
    await page.goto(at('unlisted.test'));
    await waitMuted(page, false);
  });

  await step('user unmute sticks while on the same site; new site starts muted again', async () => {
    await page.goto(at('cornmute-listed.test'));
    await waitMuted(page, true);
    const tabId = (await tabsInfo()).find((t) => t.muted).id;
    await sw.evaluate(([id, url]) => globalThis.cornmute.toggleTab(id, url), [tabId, page.url()]);
    await waitMuted(page, false);
    await page.goto(at('www.cornmute-listed.test', 'tone.html'));
    await sleep(300);
    assert.equal((await mutedOf(page)).muted, false, 'should stay unmuted on same site');
    await sw.evaluate(() => chrome.storage.local.set({ customSites: ['cornmute-listed.test', 'other-listed.test'] }));
    await page.goto(at('other-listed.test'));
    await waitMuted(page, true);
  });

  await step('a new tab on a listed site starts muted', async () => {
    const p2 = await ctx.newPage();
    await p2.goto(at('cornmute-listed.test', 'tone.html'));
    await waitMuted(p2, true);
    await p2.close();
  });

  await step('prerendered listed page is muted when it is shown', async () => {
    await sw.evaluate(() => chrome.storage.local.set({ customSites: ['cornmute-listed.test', 'other-listed.test', 'play.samesite.test'] }));
    const p3 = await ctx.newPage();
    const target = at('play.samesite.test', 'tone.html');
    await p3.goto(at('start.samesite.test', `prerender.html?target=${encodeURIComponent(target)}`));
    await sleep(1500); // give Chrome time to prerender the listed page in the background
    assert.equal((await mutedOf(p3)).muted, false, 'start page must not be muted by a prerender');
    await p3.click('#go');
    await p3.waitForURL(/play\.samesite/);
    await waitMuted(p3, true);
    const activated = await p3.evaluate(() => performance.getEntriesByType('navigation')[0].activationStart > 0);
    console.log('      (page was ' + (activated ? 'really prerendered' : 'NOT prerendered: normal load') + ')');
    await p3.close();
  });

  await step('off switch unmutes everything CornMute muted, immediately', async () => {
    await waitMuted(page, true);
    await sw.evaluate(() => chrome.storage.local.set({ enabled: false }));
    await waitMuted(page, false, 1500);
    await sw.evaluate(() => chrome.storage.local.set({ enabled: true }));
  });

  await step('popup renders for the current tab', async () => {
    const p = await ctx.newPage();
    await p.goto(`chrome-extension://${extId}/popup.html`);
    await p.waitForFunction(() => !document.getElementById('status').textContent.includes('Checking'));
    assert.match(await p.textContent('#shortcut'), /M/);
    assert.match(await p.textContent('#count'), /\d/);
    assert.equal((await p.textContent('#status')).trim(), 'Nothing to mute here');
    assert.equal(await p.isVisible('#toggleTab'), false, 'no Mute button on extension pages');
    assert.equal(await p.isVisible('#incogHint'), true, 'Incognito hint should show while Incognito is off');
    assert.match(await p.textContent('#incogHint'), /Click “Fix”/);
    assert.equal(await p.isVisible('#review'), false, 'review link hidden while item ID is a placeholder');
    assert.equal(await p.getAttribute('#privacyLink', 'href'), 'https://alecbuilds247.github.io/cornmute-site/privacy.html');
    assert.equal((await p.textContent('#privacyLink')).trim(), 'Privacy Policy');
    assert.equal(await p.locator('.credits a').count(), 1);
    assert.match(await p.textContent('#openSites'), /Muted sites/);
    await p.close();
  });

  await step('popup "add it to your list" link opens Muted sites prefilled', async () => {
    const p = await ctx.newPage();
    await p.goto(`chrome-extension://${extId}/sites.html?add=video.some-site.test`);
    assert.equal(await p.inputValue('#domain'), 'video.some-site.test');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'domain');
    assert.equal(await p.title(), 'CornMute – Muted sites');
    assert.equal(await p.getAttribute('#xLink', 'href'), 'https://x.com/AlecBuilds247');
    assert.equal(await p.isVisible('#reviewBit'), false, 'review link hidden until item ID is set');
    await p.close();
  });
} finally {
  console.log(`\n${passes} passed, ${failures} failed`);
  await ctx.close();
  server.close();
  process.exitCode = failures ? 1 : 0;
}
